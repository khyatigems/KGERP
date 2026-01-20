
import 'dotenv/config';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function checkDriveFolder() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientEmail || !privateKey || !folderId) {
      console.error("Missing Google Drive credentials or Folder ID in .env");
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log(`Service Account Email: ${clientEmail}`);
    console.log(`Checking folder ID: ${folderId}`);
    
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, driveId, owners, capabilities, trashing',
      supportsAllDrives: true,
    });

    const file = res.data;
    console.log("Folder Name:", file.name);
    console.log("Mime Type:", file.mimeType);
    
    if (file.driveId) {
        console.log("✅ Folder is in a Shared Drive (Team Drive).");
        console.log("Drive ID:", file.driveId);
    } else {
        console.warn("⚠️ Folder is in 'My Drive' (Personal Storage).");
        console.warn("Service Accounts usually CANNOT upload to My Drive folders because they have 0 quota.");
        console.warn("Please create a folder in a Shared Drive and use its ID.");
    }

    console.log("Capabilities:", JSON.stringify(file.capabilities, null, 2));

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error checking folder:", err.message || String(error));
  }
}

checkDriveFolder();
