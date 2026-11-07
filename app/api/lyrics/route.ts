import { NextRequest, NextResponse } from 'next/server';

interface SyllableItem {
  Text: string;
  IsPartOfWord?: boolean;
  StartTime: number;
  EndTime: number;
}

interface VocalContent {
  Type: string;
  OppositeAligned?: boolean;
  Lead?: {
    Syllables: SyllableItem[];
    StartTime?: number;
    EndTime?: number;
  };
  Background?: {
    Syllables: SyllableItem[];
    StartTime?: number;
    EndTime?: number;
  }[];
  StartTime?: number;
  EndTime?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const album = searchParams.get('album');
  const duration = searchParams.get('duration');

  const apiKey = process.env.SPICY_LYRICS_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    // 1. Search for the track using SpicyLyrics search endpoint
    const searchUrl = new URL('https://api.spicylyrics.org/v1/tracks/search');
    searchUrl.searchParams.set('title', title);
    if (artist) searchUrl.searchParams.set('artist', artist);
    if (album) searchUrl.searchParams.set('album', album);
    if (duration) searchUrl.searchParams.set('duration', duration);

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 86400 }, // Cache search for 24 hours
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Track not found' }, { status: searchRes.status });
    }

    const searchData = await searchRes.json();
    const results = searchData?.Body?.results;
    if (!results || !results.length) {
      return NextResponse.json({ error: 'No track matches found' }, { status: 404 });
    }

    const matchedTrack = results[0];
    const trackId = matchedTrack.id; // Spotify / canonical ID

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID missing' }, { status: 404 });
    }

    // 2. Query lyrics by ID
    const lyricsRes = await fetch(`https://api.spicylyrics.org/v1/lyrics/${trackId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 86400 },
    });

    if (!lyricsRes.ok) {
      return NextResponse.json({ error: 'Lyrics not found' }, { status: lyricsRes.status });
    }

    const lyricsData = await lyricsRes.json();
    return NextResponse.json(lyricsData);
  } catch (error) {
    console.error('Error fetching SpicyLyrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
