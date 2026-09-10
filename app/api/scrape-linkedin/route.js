import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes('linkedin.com')) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL' },
        { status: 400 }
      );
    }

    const linkedinUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await fetch(linkedinUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Could not fetch LinkedIn profile. The profile may be private.');
    }

    const html = await response.text();
    const profileData = extractProfileData(html, linkedinUrl);

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape profile.' },
      { status: 500 }
    );
  }
}

function extractProfileData(html, url) {
  const profileData = {
    linkedinUrl: url,
    name: '',
    position: '',
    company: '',
    location: '',
    companySize: null,
  };

  try {
    const titleMatch = html.match(/<title>([^|]*)/i);
    if (titleMatch) {
      profileData.name = titleMatch[1].trim();
    }

    const headlineMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)/i);
    if (headlineMatch) {
      const parts = headlineMatch[1].split('•').map(p => p.trim());
      const posAtCompany = parts[0];
      const atMatch = posAtCompany.match(/(.+?)\s+at\s+(.+)/i);
      if (atMatch) {
        profileData.position = atMatch[1].trim();
        profileData.company = atMatch[2].trim();
      }
      profileData.location = parts[2] || '';
    }

    const sizeMatch = html.match(/(\d+),(\d+)\+?\s+employees?/i);
    if (sizeMatch) {
      profileData.companySize = parseInt(sizeMatch[0].replace(/[^\d]/g, ''));
    }
  } catch (error) {
    console.error('Extraction error:', error);
  }

  return profileData;
}
