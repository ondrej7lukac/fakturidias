'use strict';

// Normalise Czech/Slovak number strings: "1 500,50" or "1500.50" → 1500.5
function parseAmount(raw) {
    if (raw == null) return NaN;
    const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
    return parseFloat(s);
}

// Find the first header column index that contains any of the given substrings (case-insensitive)
function findCol(headers, ...needles) {
    const lc = headers.map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());
    for (const needle of needles) {
        const idx = lc.findIndex(h => h.includes(needle.toLowerCase()));
        if (idx !== -1) return idx;
    }
    return -1;
}

// Split a semicolon-separated CSV line respecting quoted fields
function splitLine(line, sep = ';') {
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; continue; }
        if (!inQ && ch === sep) { cells.push(cur); cur = ''; }
        else cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
}

// ─── Fio XML ────────────────────────────────────────────────────────────────
function parseFioXml(content) {
    const txs = [];
    // Match each <Transaction>...</Transaction> block
    const txBlocks = content.match(/<Transaction>[\s\S]*?<\/Transaction>/g) || [];
    for (const block of txBlocks) {
        const amtMatch = block.match(/<column1[^>]*>([^<]*)<\/column1>/);
        const vsMatch  = block.match(/<column5[^>]*>([^<]*)<\/column5>/);
        const dateMatch = block.match(/<column0[^>]*>([^<]*)<\/column0>/);
        const amt = amtMatch ? parseAmount(amtMatch[1]) : NaN;
        const vs  = vsMatch  ? vsMatch[1].trim()  : null;
        const date = dateMatch ? dateMatch[1].split('+')[0].trim() : null;
        if (!isNaN(amt) && amt > 0 && vs) txs.push({ amount: amt, vs, date });
    }
    return txs;
}

// ─── Generic CSV ─────────────────────────────────────────────────────────────
function parseCsv(content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    // Find the header row — first line that contains a recognisable column keyword
    const headerKeywords = ['datum', 'date', 'objem', 'kredit', 'částka', 'amount', 'vs', 'variabilní'];
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const lower = lines[i].toLowerCase();
        if (headerKeywords.some(k => lower.includes(k))) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return [];

    const sep = lines[headerIdx].includes(';') ? ';' : ',';
    const headers = splitLine(lines[headerIdx], sep);

    // Map columns
    const colVS     = findCol(headers, 'vs', 'variabilní symbol', 'variable symbol', 'variabilni');
    const colAmt    = findCol(headers, 'objem', 'kredit', 'částka', 'credit', 'amount');
    const colDebet  = findCol(headers, 'debet', 'debit');
    const colDate   = findCol(headers, 'datum', 'date');

    if (colVS === -1 || colAmt === -1) return [];

    const txs = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const cells = splitLine(lines[i], sep);
        if (cells.length < Math.max(colVS, colAmt) + 1) continue;

        const vs  = cells[colVS]?.replace(/\D/g, '') || '';
        if (!vs) continue;

        let amt = parseAmount(cells[colAmt]);

        // Some banks (Air Bank, ČS) have separate Kredit/Debet columns
        // colAmt may be "Kredit" — already only positive values
        // If there's also a Debet column and amount is empty, skip
        if (isNaN(amt) || amt <= 0) {
            if (colDebet !== -1) {
                // Try debet column — if it has a value the row is an outgoing payment, skip
                const dbt = parseAmount(cells[colDebet]);
                if (!isNaN(dbt) && dbt > 0) continue;
            }
            continue;
        }

        const date = colDate !== -1 ? cells[colDate] : null;
        txs.push({ amount: amt, vs, date });
    }
    return txs;
}

// ─── Public API ──────────────────────────────────────────────────────────────
function parseStatement(content, filename = '') {
    const trimmed = content.trim();
    if (trimmed.startsWith('<') || filename.toLowerCase().endsWith('.xml')) {
        return parseFioXml(trimmed);
    }
    return parseCsv(trimmed);
}

function matchInvoices(transactions, invoices) {
    const payable = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
    const matched = [];

    for (const tx of transactions) {
        const normalVS = (tx.vs || '').replace(/^0+/, '');
        if (!normalVS) continue;

        const invoice = payable.find(inv => {
            const invVS = (inv.payment?.variableSymbol || inv.invoiceNumber || '')
                .replace(/\D/g, '').replace(/^0+/, '');
            return invVS && invVS === normalVS && Math.abs((inv.amount || 0) - tx.amount) < 0.02;
        });

        if (invoice && !matched.find(m => m.invoice.id === invoice.id)) {
            matched.push({ invoice, txDate: tx.date, txAmount: tx.amount, txVS: tx.vs });
        }
    }
    return matched;
}

module.exports = { parseStatement, matchInvoices };
