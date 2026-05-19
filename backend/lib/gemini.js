'use strict';
const https = require('https');
const { sendJson } = require('./utils');
const { fetchAresByIco, fetchAresByName } = require('./ares');

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

function buildSystemPrompt(lang = 'en') {
    const today = new Date().toISOString().split('T')[0];
    const outputLang = lang === 'cs' ? 'Czech' : 'English';
    return `You are an invoice data extractor for a Czech/Slovak invoice application.
Extract invoice information from the user's natural language description and return ONLY a valid JSON object.

Today's date is ${today}. Use this when computing relative dates like "due in 14 days" or "due end of month".

Return exactly this JSON structure (use null for unknown fields, never omit keys):
{
  "clientName": "company or person name",
  "clientEmail": "email address or null",
  "clientPhone": "phone number or null",
  "clientAddress": "full street address or null",
  "clientIco": "IČO/ICO company registration number or null",
  "clientVat": "VAT/DIČ tax ID or null",
  "clientArea": "city or region or null",
  "clientCountry": "CZ or SK — default CZ",
  "currency": "CZK or EUR — default CZK",
  "issueDate": "${today}",
  "dueDate": "YYYY-MM-DD",
  "variableSymbol": "numeric payment variable symbol or null",
  "paymentNote": "payment note or null",
  "items": [
    { "name": "item description", "qty": 1, "price": 0, "taxRate": 0 }
  ]
}

Rules:
- clientCountry: CZ for Czech clients, SK for Slovak clients, default CZ
- currency: CZK unless EUR is explicitly mentioned
- prices are plain numbers, no currency symbols
- qty is a plain number
- taxRate per item: 0 if VAT not mentioned, otherwise 21 (CZ standard rate)
- dueDate: calculate from today (${today}) — "due in 14 days" → add 14 days; default to 14 days if not mentioned
- Return ONLY the JSON object, no markdown, no code fences, no explanation
- Text field values (item names, paymentNote) in ${outputLang}. Structured fields stay in their natural format.`;
}

async function callGemini(prompt, lang = 'en') {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const payload = JSON.stringify({
        contents: [{
            role: 'user',
            parts: [
                { text: buildSystemPrompt(lang) },
                { text: `Invoice description: ${prompt}` }
            ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
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
                    if (parsed.error) {
                        return reject(new Error(parsed.error.message || 'Gemini API error'));
                    }
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) return reject(new Error('Empty response from Gemini API'));
                    const match = text.match(/\{[\s\S]*\}/);
                    if (!match) return reject(new Error('No JSON found in Gemini API response'));
                    resolve(JSON.parse(match[0]));
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

async function handleGeminiInvoice(req, res, body) {
    const { prompt, lang } = body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return sendJson(res, 400, { error: 'prompt is required' });
    }
    try {
        const data = await callGemini(prompt.trim(), lang || 'en');
        return sendJson(res, 200, { success: true, data });
    } catch (err) {
        return sendJson(res, 500, { error: 'AI processing failed' });
    }
}

module.exports = { handleGeminiInvoice };
