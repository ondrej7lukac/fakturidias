'use strict';

const {
    getDueScheduledEmails,
    claimScheduledEmail,
    markScheduledEmail,
} = require('./storage');
const { sendSegmentBroadcast } = require('./email');

let _timer = null;

async function tick() {
    try {
        const due = await getDueScheduledEmails();
        for (const item of due) {
            // Atomically flip pending -> sending so a slow tick can't double-send.
            const claimed = await claimScheduledEmail(item._id);
            if (!claimed) continue;
            try {
                const result = await sendSegmentBroadcast(item.segment, item.subject, item.message);
                await markScheduledEmail(item._id, 'sent', {
                    sent: result.sent,
                    failed: result.failed.length,
                    total: result.total,
                });
            } catch (err) {
                await markScheduledEmail(item._id, 'failed', { error: err.message });
            }
        }
    } catch (err) {
        console.error('[scheduler] tick error:', err.message);
    }
}

function startScheduler(intervalMs = 60000) {
    if (_timer) return;
    _timer = setInterval(() => { tick(); }, intervalMs);
    if (_timer.unref) _timer.unref();
    console.log(`[scheduler] started — polling scheduled emails every ${Math.round(intervalMs / 1000)}s`);
}

module.exports = { startScheduler, tick };
