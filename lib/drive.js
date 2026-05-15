const { google } = require('googleapis');
const { oAuth2Client } = require('./auth');
const stream = require('stream');

async function uploadInvoiceToDrive(userEmail, invoiceData, pdfBase64) {
    if (!oAuth2Client || !oAuth2Client.credentials || !oAuth2Client.credentials.refresh_token) {
        throw new Error("Google account not connected or missing permissions.");
    }

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // 1. Find or create "Faktury" folder
    let folderId = await findFolder(drive, "Faktury");
    if (!folderId) {
        folderId = await createFolder(drive, "Faktury");
    }

    // 2. Prepare file metadata and media
    const fileName = `${invoiceData.invoiceNumber}.pdf`;
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };

    // Convert base64 to stream
    const buffer = Buffer.from(pdfBase64.split("base64,")[1], 'base64');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const media = {
        mimeType: 'application/pdf',
        body: bufferStream
    };

    // 3. Upload file
    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });
        console.log(`[Drive] File uploaded for ${userEmail}, ID: ${file.data.id}`);
        return file.data.id;
    } catch (err) {
        console.error(`[Drive] Upload failed for ${userEmail}:`, err);
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
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    return file.data.id;
}

module.exports = {
    uploadInvoiceToDrive
};
