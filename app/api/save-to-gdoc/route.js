import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = '1faL1m-vp-DGQcU3iVhya4YSok71ckozRslbkdI9Quxs';
const SHEET_NAME = 'Sheet1';

export async function POST(request) {
  try {
    const result = await request.json();

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json(
        { error: 'Google credentials not configured' },
        { status: 500 }
      );
    }

    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const jwtClient = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    await jwtClient.authorize();

    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    const values = [
      [
        new Date().toLocaleDateString(),
        result.name || '',
        result.position || '',
        result.company || '',
        result.location || '',
        result.icpStatus || '',
        result.linkedinUrl || ''
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return NextResponse.json({ success: true, message: 'Saved to Google Sheets' });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save to Google Sheets' },
      { status: 500 }
    );
  }
}