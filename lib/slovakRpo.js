const https = require('https');
const { sendJson } = require('./utils');

/**
 * Slovak Business Register (RPO) API Client
 * Docs: https://susrrpo.docs.apiary.io/
 */

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'InvoiceMaker/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, parsed });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'Invalid JSON from RPO', snippet: data.slice(0, 200) });
        }
      });
    }).on('error', reject);
  });
}

/**
 * Search organizations by name
 */
async function handleRpoSearch(req, res, body) {
  const name = String(body.name || '').trim();
  const limit = body.limit || 8;
  if (!name) return sendJson(res, 400, { error: 'Missing search name' });

  // Note: The public RPO API might have specific query params. 
  // Base on suspecting the API structure from documentation:
  const url = `https://rpo.statistics.sk/rpo/api/organizations?name=${encodeURIComponent(name)}&limit=${limit}`;
  
  try {
    const result = await requestJson(url);
    if (result.ok) {
      // Map RPO format to internal format
      const mapped = (result.parsed || []).map(org => ({
        name: org.fullName || org.name,
        ico: org.cin || org.ico,
        address: formatRpoAddress(org.address),
        city: org.address?.municipality?.name || '',
        dic: org.tin || '', // Tax mapping if available
        icDph: org.vatin || '', // VAT mapping if available
      }));
      sendJson(res, 200, mapped);
    } else {
      sendJson(res, result.status || 502, { error: 'RPO search failed', details: result.error });
    }
  } catch (error) {
    sendJson(res, 502, { error: 'RPO search failed', details: error.message });
  }
}

/**
 * Lookup organization by ICO
 */
async function handleRpoIco(req, res, url) {
  const ico = (url.searchParams.get('ico') || '').trim();
  if (!ico) return sendJson(res, 400, { error: 'Missing ico' });

  const apiUrl = `https://rpo.statistics.sk/rpo/api/organizations?cin=${encodeURIComponent(ico)}`;
  
  try {
    const result = await requestJson(apiUrl);
    if (result.ok && result.parsed && result.parsed.length > 0) {
      const org = result.parsed[0];
      const mapped = {
        name: org.fullName || org.name,
        ico: org.cin || org.ico,
        address: formatRpoAddress(org.address),
        city: org.address?.municipality?.name || '',
        dic: org.tin || '',
        icDph: org.vatin || '',
      };
      sendJson(res, 200, mapped);
    } else {
      sendJson(res, 404, { error: 'Organization not found in RPO' });
    }
  } catch (error) {
    sendJson(res, 502, { error: 'RPO lookup failed', details: error.message });
  }
}

function formatRpoAddress(addr) {
  if (!addr) return '';
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.regNumber || addr.buildingNumber) {
    parts.push(`${addr.regNumber || ''}${addr.regNumber && addr.buildingNumber ? '/' : ''}${addr.buildingNumber || ''}`);
  }
  const streetPart = parts.join(' ').trim();
  const cityPart = `${addr.municipality?.name || ''} ${addr.postalCode || ''}`.trim();
  return [streetPart, cityPart].filter(Boolean).join(', ');
}

module.exports = {
  handleRpoSearch,
  handleRpoIco
};
