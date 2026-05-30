'use strict';

const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 15000 }, (res) => {
            if (res.statusCode === 409) {
                reject(Object.assign(new Error('Fio rate limit: wait 30 s between requests'), { code: 'RATE_LIMIT' }));
                res.resume();
                return;
            }
            if (res.statusCode !== 200) {
                reject(Object.assign(new Error(`Fio API returned ${res.statusCode}`), { code: 'HTTP_ERROR', status: res.statusCode }));
                res.resume();
                return;
            }
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error('Invalid JSON from Fio API')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Fio API request timed out')); });
    });
}

async function fetchLastTransactions(token) {
    const url = `https://fioapi.fio.cz/v1/rest/last/${encodeURIComponent(token)}/transactions.json`;
    return httpsGet(url);
}

function extractTransactions(data) {
    return data?.accountStatement?.transactionList?.transaction ?? [];
}

function matchInvoices(transactions, invoices) {
    const payable = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
    const matched = [];

    for (const tx of transactions) {
        const amount = tx.column1?.value;
        const vs = tx.column5?.value != null ? String(tx.column5.value) : null;
        if (!vs || !amount || amount <= 0) continue;

        const normalVS = vs.replace(/^0+/, '');

        const invoice = payable.find(inv => {
            const invVS = (inv.payment?.variableSymbol || inv.invoiceNumber || '')
                .replace(/\D/g, '').replace(/^0+/, '');
            if (!invVS || invVS !== normalVS) return false;
            return Math.abs((inv.amount || 0) - amount) < 0.02;
        });

        if (invoice && !matched.find(m => m.invoice.id === invoice.id)) {
            matched.push({
                invoice,
                txId: tx.column22?.value,
                txDate: tx.column0?.value,
                txAmount: amount,
                txVS: vs,
                txSender: tx.column12?.value || tx.column2?.value || '',
            });
        }
    }
    return matched;
}

module.exports = { fetchLastTransactions, extractTransactions, matchInvoices };
