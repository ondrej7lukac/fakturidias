'use strict';

const {
    getDueScheduledEmails,
    claimScheduledEmail,
    markScheduledEmail,
    getDueRecurringTemplates,
    updateRecurringAfterRun,
    getUserInvoices,
    saveInvoice,
    getInvoicesPastDue,
    recordInvoiceReminder,
    getUserSettings,
} = require('./storage');
const { sendSegmentBroadcast, sendNotificationEmail } = require('./email');
const { computeNextRunAt, buildInvoiceFromTemplate } = require('./recurring');

// Reminder policy: at most 3 reminders per invoice, no sooner than 7 days apart.
const REMINDER_MAX = 3;
const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

let _timer = null;

async function runScheduledEmails() {
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
}

async function runRecurringInvoices() {
    const due = await getDueRecurringTemplates();
    for (const tpl of due) {
        try {
            const existing = await getUserInvoices(tpl.userEmail);
            const invoice = buildInvoiceFromTemplate(tpl, existing);
            const saved = await saveInvoice(tpl.userEmail, invoice);
            if (!saved) continue;

            if (tpl.autoSend) {
                const to = invoice.client?.email || invoice.client?.emailCopy;
                if (to) {
                    const lang = String(invoice.client?.country).toUpperCase() === 'CZ' ? 'cs' : 'en';
                    const subject = lang === 'cs'
                        ? `Nová faktura ${invoice.invoiceNumber}`
                        : `New invoice ${invoice.invoiceNumber}`;
                    const html = lang === 'cs'
                        ? `<p>Dobrý den,</p><p>Byla vystavena nová faktura č. <strong>${invoice.invoiceNumber}</strong> se splatností ${invoice.dueDate}.</p><p>Fakturu naleznete ve své e-mailové schránce nebo si vyžádejte kopii.</p>`
                        : `<p>Hello,</p><p>A new invoice <strong>${invoice.invoiceNumber}</strong> has been issued, due ${invoice.dueDate}.</p>`;
                    await sendNotificationEmail(to, subject, html, invoice.client?.emailCopy).catch(() => {});
                }
            }

            // Advance the schedule: bump nextRunAt, decrement occurrences,
            // deactivate once exhausted or past the end date.
            const next = computeNextRunAt(new Date(), tpl.cadence, tpl.intervalCount);
            const occurrencesLeft =
                tpl.occurrencesLeft == null ? null : Math.max(0, tpl.occurrencesLeft - 1);
            const exhausted = occurrencesLeft === 0;
            const pastEnd = tpl.endDate && next > new Date(tpl.endDate);

            await updateRecurringAfterRun(tpl._id, {
                lastRunAt: new Date(),
                nextRunAt: next,
                occurrencesLeft,
                active: !(exhausted || pastEnd),
            });
        } catch (err) {
            console.error('[scheduler] recurring error:', err.message);
        }
    }
}

async function runPaymentReminders() {
    const candidates = await getInvoicesPastDue();
    if (candidates.length === 0) return;
    const now = Date.now();
    const optInCache = new Map();

    for (const inv of candidates) {
        const sent = inv.remindersSent || 0;
        if (sent >= REMINDER_MAX) continue;
        if (
            inv.lastReminderAt &&
            now - new Date(inv.lastReminderAt).getTime() < REMINDER_INTERVAL_MS
        ) {
            continue;
        }

        // Reminders are opt-in per user (they email the client directly).
        let enabled = optInCache.get(inv.userEmail);
        if (enabled === undefined) {
            const settings = await getUserSettings(inv.userEmail);
            enabled = !!(settings && settings.reminders && settings.reminders.enabled);
            optInCache.set(inv.userEmail, enabled);
        }
        if (!enabled) continue;

        const to = inv.client?.email || inv.client?.emailCopy;
        if (!to) continue;

        const n = sent + 1;
        const lang = String(inv.client?.country).toUpperCase() === 'CZ' ? 'cs' : 'en';
        const supplierName = inv.supplier?.name || 'Fakturidias';
        const subject = lang === 'cs'
            ? `Upomínka: faktura ${inv.invoiceNumber} po splatnosti`
            : `Reminder: invoice ${inv.invoiceNumber} overdue`;
        const html = lang === 'cs'
            ? `<p>Dobrý den,</p><p>Dovolujeme si Vás upozornit, že faktura č. <strong>${inv.invoiceNumber}</strong> se splatností ${inv.dueDate} dosud nebyla uhrazena (${n}. upomínka).</p><p>Prosíme o její úhradu.</p><p>${supplierName}</p>`
            : `<p>Hello,</p><p>This is a reminder that invoice <strong>${inv.invoiceNumber}</strong> due ${inv.dueDate} is still unpaid (reminder ${n} of ${REMINDER_MAX}).</p><p>Please arrange payment.</p><p>${supplierName}</p>`;

        try {
            await sendNotificationEmail(to, subject, html, inv.client?.emailCopy);
            await recordInvoiceReminder(inv.userEmail, inv.id, n);
        } catch (err) {
            console.error('[scheduler] reminder send error:', err.message);
        }
    }
}

async function tick() {
    try {
        await runScheduledEmails();
    } catch (err) {
        console.error('[scheduler] scheduled-email tick error:', err.message);
    }
    try {
        await runRecurringInvoices();
    } catch (err) {
        console.error('[scheduler] recurring tick error:', err.message);
    }
    try {
        await runPaymentReminders();
    } catch (err) {
        console.error('[scheduler] reminder tick error:', err.message);
    }
}

function startScheduler(intervalMs = 60000) {
    if (_timer) return;
    _timer = setInterval(() => { tick(); }, intervalMs);
    if (_timer.unref) _timer.unref();
    console.log(`[scheduler] started — polling scheduled emails every ${Math.round(intervalMs / 1000)}s`);
}

module.exports = { startScheduler, tick };
