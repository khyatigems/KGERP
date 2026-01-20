import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.warn("Google Drive credentials missing.");
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });

  return google.drive({ version: 'v3', auth });
}

export async function findOrCreateFolder(folderName: string, parentId?: string) {
  try {
    const drive = getDriveClient();
    if (!drive) return null;

    const parent = parentId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!parent) {
        console.warn("No parent folder ID provided for Google Drive.");
        return null;
    }

    // Check if folder exists
    // Escape single quotes in folderName to prevent query injection/errors
    const sanitizedName = folderName.replace(/'/g, "\\'");
    const query = `mimeType='application/vnd.google-apps.folder' and name='${sanitizedName}' and '${parent}' in parents and trashed=false`;
    
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create folder
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });

    return file.data.id;
  } catch (error) {
    console.error('Google Drive folder error:', error);
    return null;
  }
}

export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
) {
  try {
    const drive = getDriveClient();
    if (!drive) return null;

    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!targetFolderId) {
      console.warn("Google Drive target folder missing. Skipping upload.");
      return null;
    }

    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };

    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
      supportsAllDrives: true,
    });

    return response.data;
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
}
