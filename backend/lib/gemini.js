'use strict';
const https = require('https');
const { fetchAresByIco, fetchAresByName } = require('./ares');

function buildSystemPrompt(lang = 'en') {
    const today = new Date().toISOString().split('T')[0];
    const outputLang = lang === 'cs' ? 'Czech' : 'English';
    return `You are an invoice data extractor for a Czech/Slovak invoice application.
Extract invoice information from the user's natural language description.

Today's date is ${today}. Use this when computing relative dates like "due in 14 days" or "due end of month".

Rules:
- supplierName / supplierIco: only set if the prompt explicitly names the issuing company (e.g. "from ABC s.r.o." or "Invoice by XYZ"); otherwise return empty string
- clientCountry: "CZ" for Czech clients, "SK" for Slovak clients, default "CZ"
- currency: "CZK" unless EUR is explicitly mentioned
- prices are plain numbers, no currency symbols
- qty is a plain number
- taxRate per item: 0 if VAT not mentioned, otherwise 21 (CZ standard rate)
- dueDate: calculate from today (${today}) — "due in 14 days" → add 14 days; default to 14 days if not mentioned
- Text field values (item names, paymentNote) must be in ${outputLang}`;
}

function buildResponseSchema() {
    return {
        type: 'object',
        properties: {
            supplierName: { type: 'string', description: 'Issuer company name if explicitly mentioned, else empty string' },
            supplierIco: { type: 'string', description: 'Issuer IČO if explicitly mentioned, else empty string' },
            clientName: { type: 'string', description: 'Client or recipient company/person name' },
            clientEmail: { type: 'string', description: 'Client email address, empty string if unknown' },
            clientPhone: { type: 'string', description: 'Client phone number, empty string if unknown' },
            clientAddress: { type: 'string', description: 'Full client street address, empty string if unknown' },
            clientIco: { type: 'string', description: 'Client IČO/ICO registration number, empty string if unknown' },
            clientVat: { type: 'string', description: 'Client VAT/DIČ tax ID, empty string if unknown' },
            clientArea: { type: 'string', description: 'Client city or region, empty string if unknown' },
            clientCountry: { type: 'string', enum: ['CZ', 'SK', 'DE', 'AT', 'PL', 'OTHER'], description: 'Client country code, default CZ' },
            currency: { type: 'string', enum: ['CZK', 'EUR', 'USD'], description: 'Invoice currency, default CZK' },
            issueDate: { type: 'string', description: 'Issue date in YYYY-MM-DD format' },
            dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format, default 14 days from today' },
            variableSymbol: { type: 'string', description: 'Numeric payment variable symbol, empty string if unknown' },
            paymentNote: { type: 'string', description: 'Payment note or memo, empty string if none' },
            items: {
                type: 'array',
                description: 'Invoice line items',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Item description' },
                        qty: { type: 'number', description: 'Quantity' },
                        price: { type: 'number', description: 'Unit price, plain number without currency symbol' },
                        taxRate: { type: 'number', description: 'VAT rate: 0 if not mentioned, otherwise 21' }
                    },
                    required: ['name', 'qty', 'price', 'taxRate']
                }
            }
        },
        required: ['clientName', 'clientCountry', 'currency', 'issueDate', 'dueDate', 'items']
    };
}

function callGeminiApi(prompt, lang = 'en') {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const payload = JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(lang) }] },
        contents: [{
            role: 'user',
            parts: [{ text: `Invoice description: ${prompt}` }]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseSchema: buildResponseSchema()
        }
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
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
                    if (parsed.error) return reject(new Error(parsed.error.message || 'Gemini API error'));
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) return reject(new Error('Empty response from Gemini API'));
                    resolve(JSON.parse(text));
                } catch (err) {
                    reject(new Error('Failed to parse Gemini API response: ' + err.message));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function aresAddress(entity) {
    const s = entity.sidlo || {};
    if (s.textovaAdresa) return s.textovaAdresa;
    const street = [s.nazevUlice || s.ulice, s.cisloDomovni, s.cisloOrientacni ? `/${s.cisloOrientacni}` : ''].filter(Boolean).join(' ');
    const city = s.nazevObce || s.obec || '';
    const zip = s.psc ? String(s.psc) : '';
    return [street.trim(), `${city} ${zip}`.trim()].filter(Boolean).join(', ');
}

async function enrichWithAres(data) {
    const ico = data.clientIco ? String(data.clientIco).trim() : null;
    const name = data.clientName ? String(data.clientName).trim() : null;
    if (!ico && !name) return;
    const entity = ico ? await fetchAresByIco(ico) : await fetchAresByName(name);
    if (!entity) return;
    if (entity.obchodniJmeno) data.clientName = entity.obchodniJmeno;
    if (entity.ico) data.clientIco = String(entity.ico);
    if (entity.dic) data.clientVat = entity.dic;
    const addr = aresAddress(entity);
    if (addr) data.clientAddress = addr;
    const city = entity.sidlo?.nazevObce || entity.sidlo?.obec || '';
    if (city) data.clientArea = city;
}

async function enrichSupplierWithAres(data) {
    const ico = data.supplierIco ? String(data.supplierIco).trim() : null;
    const name = data.supplierName ? String(data.supplierName).trim() : null;
    if (!ico && !name) return;
    const entity = ico ? await fetchAresByIco(ico) : await fetchAresByName(name);
    if (!entity) return;
    if (entity.obchodniJmeno) data.supplierName = entity.obchodniJmeno;
    if (entity.ico) data.supplierIco = String(entity.ico);
    if (entity.dic) data.supplierVat = entity.dic;
    const addr = aresAddress(entity);
    if (addr) data.supplierAddress = addr;
}

async function parseInvoiceWithAI(prompt, lang = 'en') {
    const data = await callGeminiApi(prompt, lang);
    await Promise.all([
        enrichWithAres(data).catch(() => {}),
        enrichSupplierWithAres(data).catch(() => {})
    ]);
    return data;
}

module.exports = { parseInvoiceWithAI };
