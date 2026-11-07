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

interface CacheEntry {
  data: any;
  status: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 1000;

function cleanCacheIfNeeded() {
  if (memoryCache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, 200);
    for (const k of keysToDelete) {
      memoryCache.delete(k);
    }
  }
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

  const cacheKey = `${(title || '').trim().toLowerCase()}::${(artist || '').trim().toLowerCase()}::${(album || '').trim().toLowerCase()}`;

  // Check in-memory cache
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      status: cached.status,
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'X-Lyrics-Cache': 'HIT',
      },
    });
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
      next: { revalidate: 86400 * 7 }, // Cache search for 7 days
    });

    if (!searchRes.ok) {
      const errorData = { error: 'Track not found' };
      memoryCache.set(cacheKey, {
        data: errorData,
        status: searchRes.status,
        expiresAt: Date.now() + 86400 * 1000, // Negative cache for 24h
      });
      cleanCacheIfNeeded();
      return NextResponse.json(errorData, {
        status: searchRes.status,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const searchData = await searchRes.json();
    const results = searchData?.Body?.results;
    if (!results || !results.length) {
      const errorData = { error: 'No track matches found' };
      memoryCache.set(cacheKey, {
        data: errorData,
        status: 404,
        expiresAt: Date.now() + 86400 * 1000,
      });
      cleanCacheIfNeeded();
      return NextResponse.json(errorData, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const matchedTrack = results[0];
    const trackId = matchedTrack.id; // Spotify / canonical ID

    if (!trackId) {
      const errorData = { error: 'Track ID missing' };
      return NextResponse.json(errorData, { status: 404 });
    }

    // 2. Query lyrics by ID
    const lyricsRes = await fetch(`https://api.spicylyrics.org/v1/lyrics/${trackId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 86400 * 7 }, // Cache lyrics for 7 days
    });

    if (!lyricsRes.ok) {
      const errorData = { error: 'Lyrics not found' };
      memoryCache.set(cacheKey, {
        data: errorData,
        status: lyricsRes.status,
        expiresAt: Date.now() + 86400 * 1000,
      });
      cleanCacheIfNeeded();
      return NextResponse.json(errorData, {
        status: lyricsRes.status,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const lyricsData = await lyricsRes.json();

    // Cache successful lyrics in memory for 7 days
    memoryCache.set(cacheKey, {
      data: lyricsData,
      status: 200,
      expiresAt: Date.now() + 7 * 86400 * 1000,
    });
    cleanCacheIfNeeded();

    return NextResponse.json(lyricsData, {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'X-Lyrics-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error fetching SpicyLyrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
