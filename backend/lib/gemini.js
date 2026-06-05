'use strict';
const https = require('https');
const { fetchAresByIco, fetchAresByName } = require('./ares');

// Czech VAT rate categories — guides per-item taxRate selection (item 8).
const VAT_RATE_GUIDANCE = `VAT RATE SELECTION (Czech rates) — pick the taxRate per item from the goods/service it represents:
- 21% (standard / "základní sazba"): professional & B2B services (IT, marketing, legal, consulting, accounting, design), general goods & retail (electronics, clothing, vehicles, machinery, fuel, furniture), alcoholic & soft drinks, standard commercial construction, SaaS / digital products & downloads.
- 12% (reduced / "snížená sazba"): foodstuffs & agricultural products, animal feed, plants & seeds, tap water & sewage, district heating, residential/social housing construction & repairs, public passenger transport, taxi, hotel accommodation, tickets to cultural & sport venues, pharmaceuticals & medical devices, hairdressing & small repairs (shoes, bikes, clothing), newspapers, magazines & periodicals.
- 0% (exempt with right to deduction): books, e-books and audiobooks (advertising content under 50%), and similar exempt supplies.
Coffee, tea and food products are 12%. When unsure between 21% and 12%, prefer 21% for services and 12% for foodstuffs.`;

// Supplier tax-status clause — makes the model honour the supplier's DPH status (item 9).
function taxStatusClause(vatPayer) {
    if (vatPayer === false) {
        return `SUPPLIER TAX STATUS: The supplier is NOT a VAT payer (neplátce DPH).
- Set taxRate to 0 for EVERY item, regardless of the goods or whether the user mentions VAT.`;
    }
    return `SUPPLIER TAX STATUS: The supplier IS a VAT payer (plátce DPH).
- Assign the correct VAT rate per item using the VAT RATE SELECTION rules above.
- If the user asks to add tax/VAT but no specific rate is given, use the category-appropriate rate (default 21% for services).`;
}

function buildSystemPrompt(lang = 'en', vatPayer = true) {
    const today = new Date().toISOString().split('T')[0];
    const outputLang = lang === 'cs' ? 'Czech' : 'English';
    return `You are an invoice data extractor for a Czech/Slovak invoice application.
Extract invoice information from the user's natural language description.

Today's date is ${today}. Use this when computing relative dates like "due in 14 days" or "due end of month".

${VAT_RATE_GUIDANCE}

${taxStatusClause(vatPayer)}

Rules:
- supplierName / supplierIco: only set if the prompt explicitly names the issuing company (e.g. "from ABC s.r.o." or "Invoice by XYZ"); otherwise return empty string
- clientCountry: "CZ" for Czech clients, "SK" for Slovak clients, default "CZ"
- currency: "CZK" unless EUR is explicitly mentioned
- prices are plain numbers, no currency symbols
- qty is a plain number
- dueDate: calculate from today (${today}) — "due in 14 days" → add 14 days; default to 14 days if not mentioned
- Text field values (item names, paymentNote) must be in ${outputLang}`;
}

function buildAudioSystemPrompt(lang = 'en', vatPayer = true) {
    const today = new Date().toISOString().split('T')[0];
    const outputLang = lang === 'cs' ? 'Czech' : 'English';
    return `You are an invoice data extractor for a Czech/Slovak invoice application.
The user has recorded a spoken description of an invoice they want to create. Extract the invoice information from their speech.

Today's date is ${today}. Use this when computing relative dates like "due in 14 days" or "due end of month".

${VAT_RATE_GUIDANCE}

${taxStatusClause(vatPayer)}

Rules:
- supplierName / supplierIco: only set if explicitly mentioned in speech; otherwise return empty string
- clientCountry: "CZ" for Czech clients, "SK" for Slovak clients, default "CZ"
- currency: "CZK" unless EUR is explicitly mentioned
- prices are plain numbers, no currency symbols
- qty is a plain number
- dueDate: calculate from today (${today}); default to 14 days if not mentioned
- transcript: include a faithful, verbatim transcription of what was said, in the original spoken language
- Text field values (item names, paymentNote) must be in ${outputLang}`;
}

function buildImageSystemPrompt(lang = 'en', vatPayer = true) {
    const today = new Date().toISOString().split('T')[0];
    const outputLang = lang === 'cs' ? 'Czech' : 'English';
    return `You are an invoice data extractor for a Czech/Slovak invoice application.
Extract invoice fields from the photo/scan provided. The image may be an existing invoice, receipt, bill, price list or menu — extract the orderable items and their prices.

Today's date is ${today}. Use this when a date is missing or relative.

${VAT_RATE_GUIDANCE}

${taxStatusClause(vatPayer)}

Rules:
- Treat the entity that ISSUED the invoice (top of document, with IČO/DIČ, "Dodavatel") as the supplier — fill supplierName / supplierIco / supplierVat / supplierAddress if visible.
- Treat the RECIPIENT ("Odběratel", "Bill to") as the client — fill clientName / clientIco / clientVat / clientAddress / clientArea / clientEmail / clientPhone if visible.
- clientCountry: infer from address; "CZ" or "SK" if Czech/Slovak, else "OTHER". Default "CZ".
- currency: read from the invoice; CZK, EUR or USD only. Default "CZK".
- issueDate / dueDate: YYYY-MM-DD. If only one date is shown, set issueDate; default dueDate to issueDate + 14 days.
- variableSymbol: numeric only if shown.
- items: one row per line item. price = unit price excluding VAT (plain number). qty = quantity. taxRate per the rules above. If only totals are shown and line items aren't itemized, create a single item with the total as price and qty 1.
- If the user provides extra written instructions alongside the image, honour them (e.g. which items to include, quantities, the client's IČO).
- If a field is not visible, return an empty string (or 0 for numeric).
- DO NOT invent data. Do not hallucinate IČO or VAT numbers.
- Text field values (item names, paymentNote) must be in ${outputLang}.`;
}

// Defensive guard: when the supplier is a non-payer, force every item to 0% VAT (item 9).
function enforceTaxStatus(data, vatPayer) {
    if (vatPayer === false && Array.isArray(data?.items)) {
        data.items.forEach((item) => { item.taxRate = 0; });
    }
    return data;
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
                        taxRate: { type: 'number', description: 'Czech VAT rate (0, 12 or 21) chosen per the VAT RATE SELECTION rules; 0 if the supplier is not a VAT payer' }
                    },
                    required: ['name', 'qty', 'price', 'taxRate']
                }
            }
        },
        required: ['clientName', 'clientCountry', 'currency', 'issueDate', 'dueDate', 'items']
    };
}

function buildAudioResponseSchema() {
    const schema = buildResponseSchema();
    return {
        ...schema,
        properties: {
            ...schema.properties,
            transcript: { type: 'string', description: 'Verbatim transcription of what was said, in the original spoken language' }
        }
    };
}

function callGeminiApi(prompt, lang = 'en', vatPayer = true) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const payload = JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(lang, vatPayer) }] },
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

async function parseInvoiceWithAI(prompt, lang = 'en', vatPayer = true) {
    const data = await callGeminiApi(prompt, lang, vatPayer);
    enforceTaxStatus(data, vatPayer);
    await Promise.all([
        enrichWithAres(data).catch(() => {}),
        enrichSupplierWithAres(data).catch(() => {})
    ]);
    return data;
}

function callGeminiImageApi(imageBase64, mimeType, lang = 'en', opts = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const { vatPayer = true, userText = '' } = opts;
    const instruction = userText
        ? `Extract invoice data from this image. Additional written instructions from the user: ${userText}`
        : 'Extract invoice data from this image.';

    const payload = JSON.stringify({
        system_instruction: { parts: [{ text: buildImageSystemPrompt(lang, vatPayer) }] },
        contents: [{
            role: 'user',
            parts: [
                { text: instruction },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
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

async function parseInvoiceImageWithAI(imageBase64, mimeType, lang = 'en', opts = {}) {
    const data = await callGeminiImageApi(imageBase64, mimeType, lang, opts);
    enforceTaxStatus(data, opts.vatPayer);
    await Promise.all([
        enrichWithAres(data).catch(() => {}),
        enrichSupplierWithAres(data).catch(() => {})
    ]);
    return data;
}

function callGeminiAudioApi(audioBase64, mimeType, lang = 'en', vatPayer = true) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const payload = JSON.stringify({
        system_instruction: { parts: [{ text: buildAudioSystemPrompt(lang, vatPayer) }] },
        contents: [{
            role: 'user',
            parts: [
                { text: 'Extract invoice data from this voice recording.' },
                { inline_data: { mime_type: mimeType, data: audioBase64 } }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseSchema: buildAudioResponseSchema()
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

async function parseInvoiceAudioWithAI(audioBase64, mimeType, lang = 'en', vatPayer = true) {
    const data = await callGeminiAudioApi(audioBase64, mimeType, lang, vatPayer);
    enforceTaxStatus(data, vatPayer);
    await Promise.all([
        enrichWithAres(data).catch(() => {}),
        enrichSupplierWithAres(data).catch(() => {})
    ]);
    return data;
}

module.exports = { parseInvoiceWithAI, parseInvoiceImageWithAI, parseInvoiceAudioWithAI };
