import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = '1faL1m-vp-DGQcU3iVhya4YSok71ckozRslbkdI9Quxs';
const SHEET_NAME = 'Sheet1';

export async function POST(request) {
  try {
    const result = await request.json();

    // Get credentials from environment variable
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    // Create JWT client
    const jwtClient = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    // Authorize
    await jwtClient.authorize();

    // Create Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    // Prepare row data
    const values = [
      [
        new Date().toLocaleDateString(),
        result.name || '',
        result.position || '',
        result.company || '',
        result.location || '',
        result.icpStatus,
        result.linkedinUrl || ''
      ]
    ];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return NextResponse.json({
      success: true,
      message: 'Saved to Google Sheets'
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save' },
      { status: 500 }
    );
  }
}