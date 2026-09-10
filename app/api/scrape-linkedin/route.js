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
      { error: error.message || 'Failed to scrape profile. Try pasting the data manually.' },
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
    headline: '',
    scrapedSuccessfully: false
  };

  try {
    const titleMatch = html.match(/<title>([^|]*)/i);
    if (titleMatc
cat > app/api/scrape-linkedin/route.js << 'EOF'
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
      { error: error.message || 'Failed to scrape profile. Try pasting the data manually.' },
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
    headline: '',
    scrapedSuccessfully: false
  };

  try {
    const titleMatch = html.match(/<title>([^|]*)/i);
    if (titleMatch) {
      const titlePart = titleMatch[1].trim();
      const parts = titlePart.split('•').map(p => p.trim());
      profileData.name = parts[0] || '';
    }

    const headlineMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)/i);
    if (headlineMatch) {
      profileData.headline = headlineMatch[1];
      const headlineParts = headlineMatch[1].split('•').map(p => p.trim());
      const posAtCompany = headlineParts[0];
      const atMatch = posAtCompany.match(/(.+?)\s+at\s+(.+)/i);
      if (atMatch) {
        profileData.position = atMatch[1].trim();
        profileData.company = atMatch[2].trim();
      }
      if (headlineParts[2]) {
        profileData.location = headlineParts[2];
      }
    }

    const jsonldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
    if (jsonldMatch) {
      try {
        const jsonld = JSON.parse(jsonldMatch[1]);
        if (jsonld.name) profileData.name = jsonld.name;
        if (jsonld.jobTitle) profileData.position = jsonld.jobTitle;
      } catch (e) {}
    }

    if (!profileData.name) {
      const nameMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)/i);
      if (nameMatch) {
        profileData.name = nameMatch[1].split('•')[0].trim();
      }
    }

    const sizeMatch = html.match(/(\d+),(\d+)\+?\s+employees?/i);
    if (sizeMatch) {
      const num = parseInt(sizeMatch[0].replace(/[^\d]/g, ''));
      profileData.companySize = num;
    }

    if (!profileData.location) {
      const locMatch = html.match(/(?:based in|location[:"]*)\s*([^<,]+)/i);
      if (locMatch) {
        profileData.location = locMatch[1].trim().substring(0, 50);
      }
    }

    profileData.scrapedSuccessfully = !!(profileData.name && profileData.position);

  } catch (error) {
    console.error('Extraction error:', error);
  }

  return profileData;
}
