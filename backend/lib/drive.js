'use strict';
const { google } = require('googleapis');
const { oAuth2Client } = require('./auth');
const stream = require('stream');

async function uploadInvoiceToDrive(userEmail, invoiceData, pdfBase64) {
    if (!oAuth2Client?.credentials?.refresh_token) {
        throw new Error('Google account not connected or missing permissions.');
    }

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    let folderId = await findFolder(drive, 'Faktury');
    if (!folderId) folderId = await createFolder(drive, 'Faktury');

    const fileName = `${invoiceData.invoiceNumber}.pdf`;
    const buffer = Buffer.from(pdfBase64.split('base64,')[1], 'base64');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    try {
        const file = await drive.files.create({
            resource: { name: fileName, parents: [folderId] },
            media: { mimeType: 'application/pdf', body: bufferStream },
            fields: 'id'
        });
        console.log(`[Drive] Uploaded for ${userEmail}, ID: ${file.data.id}`);
        return file.data.id;
    } catch (err) {
        console.error(`[Drive] Upload failed for ${userEmail}:`, err.message);
        throw err;
    }
}

async function findFolder(drive, folderName) {
    const res = await drive.files.list({
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    return res.data.files.length > 0 ? res.data.files[0].id : null;
}

async function createFolder(drive, folderName) {
    const file = await drive.files.create({
        resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
    });
    return file.data.id;
}

module.exports = { uploadInvoiceToDrive };
