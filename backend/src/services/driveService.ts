import { google } from 'googleapis';
import path from 'path';

// Buscamos el archivo JSON de la cuenta de servicio que pusiste en la carpeta backend
// El archivo está en la raíz de backend, así que subimos un nivel desde 'src'
const KEYFILEPATH = path.join(process.cwd(), 'service-account.json');

// Permiso de solo lectura para Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];


const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Esta función es la que pedirá los datos de la canción a Google
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