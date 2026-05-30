'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { getUserSettings, saveUserSettings, getUserInvoices, saveInvoice } = require('../lib/storage');
const { fetchLastTransactions, extractTransactions, matchInvoices: matchFioInvoices } = require('../lib/fioBank');
const { parseStatement, matchInvoices } = require('../lib/statementParser');

function attach(router) {
    router.add('POST', '/api/bank/sync', async ({ req, res, userEmail }) => {
        const settings = await getUserSettings(userEmail);
        const fioToken = settings?.bankSync?.fioToken;
        if (!fioToken) {
            return sendJson(res, 400, { error: 'No Fio bank token configured in settings.' });
        }

        let data;
        try {
            data = await fetchLastTransactions(fioToken);
        } catch (err) {
            if (err.code === 'RATE_LIMIT') {
                return sendJson(res, 429, { error: 'Fio API rate limit — please wait 30 seconds before syncing again.' });
            }
            return sendJson(res, 502, { error: `Fio API error: ${err.message}` });
        }

        const transactions = extractTransactions(data);
        const invoices = await getUserInvoices(userEmail);
        const matched = matchFioInvoices(transactions, invoices);

        const updated = [];
        for (const { invoice, txId, txDate, txAmount, txVS, txSender } of matched) {
            const updatedInvoice = {
                ...invoice,
                status: 'paid',
                payment: {
                    ...invoice.payment,
                    paidAt: txDate ? txDate.split('+')[0] : new Date().toISOString().split('T')[0],
                    fioTxId: txId,
                    fioSender: txSender,
                    matchedAmount: txAmount,
                    matchedVS: txVS,
                },
            };
            await saveInvoice(userEmail, updatedInvoice);
            updated.push({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: txAmount });
        }

        await saveUserSettings(userEmail, {
            bankSync: { ...settings.bankSync, lastSyncAt: new Date().toISOString() },
        });

        return sendJson(res, 200, {
            synced: transactions.length,
            matched: updated.length,
            updated,
        });
    });

    router.add('GET', '/api/bank/status', async ({ res, userEmail }) => {
        const settings = await getUserSettings(userEmail);
        const bankSync = settings?.bankSync || {};
        return sendJson(res, 200, {
            connected: !!bankSync.fioToken,
            lastSyncAt: bankSync.lastSyncAt || null,
        });
    });

    // Import bank statement file (CSV or XML from any Czech bank)
    router.add('POST', '/api/bank/import', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        const { content, filename = '' } = body;
        if (!content || typeof content !== 'string') {
            return sendJson(res, 400, { error: 'content is required' });
        }
        if (content.length > 5 * 1024 * 1024) {
            return sendJson(res, 413, { error: 'File too large (max 5 MB)' });
        }

        const transactions = parseStatement(content, filename);
        if (transactions.length === 0) {
            return sendJson(res, 422, { error: 'No transactions found. Check the file format — only CSV and XML exports are supported.' });
        }

        const invoices = await getUserInvoices(userEmail);
        const matched = matchInvoices(transactions, invoices);

        const updated = [];
        for (const { invoice, txDate, txAmount, txVS } of matched) {
            const updatedInvoice = {
                ...invoice,
                status: 'paid',
                payment: {
                    ...invoice.payment,
                    paidAt: txDate ? String(txDate).split('+')[0].replace(/\.$/, '') : new Date().toISOString().split('T')[0],
                    matchedAmount: txAmount,
                    matchedVS: txVS,
                    source: 'import',
                },
            };
            await saveInvoice(userEmail, updatedInvoice);
            updated.push({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: txAmount });
        }

        return sendJson(res, 200, {
            parsed: transactions.length,
            matched: updated.length,
            updated,
        });
    });
}

module.exports = { attach };
