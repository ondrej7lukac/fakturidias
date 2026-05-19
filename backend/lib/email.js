'use strict';
const https = require('https');
const { sendJson } = require('./utils');

function slugifyCompanyName(name = '') {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30) || 'invoices';
}

async function handleEmailSend(req, res, body) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return sendJson(res, 500, { error: 'RESEND_API_KEY not configured' });

    const { invoice, pdfBase64, lang } = body;
    const toEmail = invoice?.client?.email;
    if (!toEmail) return sendJson(res, 400, { error: 'Client email is missing' });

    const senderSlug = slugifyCompanyName(invoice?.supplier?.name);
    const senderName = invoice?.supplier?.name || 'Fakturidias';
    const from = `${senderName} <${senderSlug}@fakturidias.app>`;
    const to = [toEmail];
    if (invoice?.client?.emailCopy) to.push(invoice.client.emailCopy);

    const subject = lang === 'cs'
        ? `Faktura ${invoice.invoiceNumber}`
        : `Invoice ${invoice.invoiceNumber}`;

    const html = lang === 'cs'
        ? `<p>Vážený zákazníku,</p><p>V příloze naleznete fakturu č. <strong>${invoice.invoiceNumber}</strong>.</p><p>Děkujeme za váš obchod!</p><p>${senderName}</p>`
        : `<p>Dear customer,</p><p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>.</p><p>Thank you for your business!</p><p>${senderName}</p>`;

    const base64Data = (pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '');

    const payload = JSON.stringify({
        from,
        to,
        subject,
        html,
        attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: base64Data }]
    });

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (response) => {
            let raw = '';
            response.on('data', chunk => raw += chunk);
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    if (response.statusCode >= 400) {
                        return resolve(sendJson(res, 502, { error: 'Email delivery failed' }));
                    }
                    resolve(sendJson(res, 200, { success: true, id: parsed.id }));
                } catch {
                    resolve(sendJson(res, 500, { error: 'Failed to parse email service response' }));
                }
            });
        });

        req.on('error', () => resolve(sendJson(res, 500, { error: 'Email delivery unavailable' })));
        req.write(payload);
        req.end();
    });
}

module.exports = { handleEmailSend };
