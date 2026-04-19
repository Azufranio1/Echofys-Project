import { google } from 'googleapis';
import path from 'path';

const KEYFILEPATH = path.join(process.cwd(), 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// AÑADIMOS 'export' AQUÍ
export const drive = google.drive({ version: 'v3', auth });

export const getFileStream = async (fileId: string) => {
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (error) {
    console.error('Error al obtener el stream de Drive:', error);
    throw error;
  }
};