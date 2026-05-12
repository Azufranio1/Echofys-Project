import { google } from 'googleapis';
import serviceAccount from '../../service-account.json'; // ajusta el path si es necesario

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,  // 👈 objeto directo, no keyFile
  scopes: SCOPES,
});

export const drive = google.drive({ version: 'v3', auth });