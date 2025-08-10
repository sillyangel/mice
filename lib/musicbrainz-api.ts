/**
 * MusicBrainz API client for the auto-tagging feature
 * 
 * This module provides functions to search and fetch metadata from MusicBrainz,
 * which is an open music encyclopedia that collects music metadata.
 */

// Define the User-Agent string as per MusicBrainz API guidelines
// https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting#User-Agent
const USER_AGENT = 'mice/1.0.0 (https://github.com/sillyangel/mice)';

// Base URL for MusicBrainz API
const API_BASE_URL = 'https://musicbrainz.org/ws/2';

// Add a delay between requests to comply with MusicBrainz rate limiting
const RATE_LIMIT_DELAY = 1100; // Slightly more than 1 second to be safe

// Queue for API requests to ensure proper rate limiting
const requestQueue: (() => Promise<unknown>)[] = [];
let isProcessingQueue = false;

/**
 * Process the request queue with proper rate limiting
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('MusicBrainz API request failed:', error);
      }
      
      // Wait before processing the next request
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Make a rate-limited request to the MusicBrainz API
 */
async function makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const requestFn = async () => {
      try {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        
        // Add format parameter
        url.searchParams.append('fmt', 'json');
        
        // Add other parameters
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        
        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': USER_AGENT
          }
        });
        
        if (!response.ok) {
          throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        resolve(data as T);
      } catch (error) {
        reject(error);
      }
    };
    
    // Add request to queue
    requestQueue.push(requestFn);
    processQueue();
  });
}

/**
 * Search for releases (albums) in MusicBrainz
 */
export async function searchReleases(query: string, limit: number = 10): Promise<MusicBrainzRelease[]> {
  try {
    interface ReleaseSearchResult {
      releases: MusicBrainzRelease[];
    }
    
    const data = await makeRequest<ReleaseSearchResult>('/release', {
      query,
      limit: limit.toString()
    });
    
    return data.releases || [];
  } catch (error) {
    console.error('Failed to search releases:', error);
    return [];
  }
}

/**
 * Search for recordings (tracks) in MusicBrainz
 */
export async function searchRecordings(query: string, limit: number = 10): Promise<MusicBrainzRecording[]> {
  try {
    interface RecordingSearchResult {
      recordings: MusicBrainzRecording[];
    }
    
    const data = await makeRequest<RecordingSearchResult>('/recording', {
      query,
      limit: limit.toString()
    });
    
    return data.recordings || [];
  } catch (error) {
    console.error('Failed to search recordings:', error);
    return [];
  }
}

/**
 * Get detailed information about a release by its MBID
 */
export async function getRelease(mbid: string): Promise<MusicBrainzReleaseDetails | null> {
  try {
    // Request with recording-level relationships to get track-level data
    const data = await makeRequest<MusicBrainzReleaseDetails>(`/release/${mbid}`, {
      inc: 'recordings+artists+labels+artist-credits'
    });
    
    return data;
  } catch (error) {
    console.error(`Failed to get release ${mbid}:`, error);
    return null;
  }
}

/**
 * Get detailed information about a recording by its MBID
 */
export async function getRecording(mbid: string): Promise<MusicBrainzRecordingDetails | null> {
  try {
    const data = await makeRequest<MusicBrainzRecordingDetails>(`/recording/${mbid}`, {
      inc: 'artists+releases+artist-credits'
    });
    
    return data;
  } catch (error) {
    console.error(`Failed to get recording ${mbid}:`, error);
    return null;
  }
}

/**
 * Find the best matching release for the given album information
 * This uses fuzzy matching to find the most likely match
 */
export async function findBestMatchingRelease(
  albumName: string, 
  artistName: string,
  trackCount?: number
): Promise<MusicBrainzRelease | null> {
  try {
    // Build a search query with both album and artist
    const query = `release:"${albumName}" AND artist:"${artistName}"`;
    const releases = await searchReleases(query, 5);
    
    if (!releases || releases.length === 0) {
      return null;
    }
    
    // If track count is provided, prioritize releases with the same track count
    if (trackCount !== undefined) {
      const exactTrackCountMatch = releases.find(release => 
        release['track-count'] === trackCount
      );
      
      if (exactTrackCountMatch) {
        return exactTrackCountMatch;
      }
    }
    
    // Just return the first result as it's likely the best match
    return releases[0];
  } catch (error) {
    console.error('Failed to find matching release:', error);
    return null;
  }
}

/**
 * Find the best matching recording for the given track information
 */
export async function findBestMatchingRecording(
  trackName: string,
  artistName: string,
  duration?: number // in milliseconds
): Promise<MusicBrainzRecording | null> {
  try {
    // Build a search query with both track and artist
    const query = `recording:"${trackName}" AND artist:"${artistName}"`;
    const recordings = await searchRecordings(query, 5);
    
    if (!recordings || recordings.length === 0) {
      return null;
    }
    
    // If duration is provided, try to find a close match
    if (duration !== undefined) {
      // Convert to milliseconds if not already (MusicBrainz uses milliseconds)
      const durationMs = duration < 1000 ? duration * 1000 : duration;
      
      // Find recording with the closest duration (within 5 seconds)
      const durationMatches = recordings.filter(recording => {
        if (!recording.length) return false;
        return Math.abs(recording.length - durationMs) < 5000; // 5 second tolerance
      });
      
      if (durationMatches.length > 0) {
        return durationMatches[0];
      }
    }
    
    // Just return the first result as it's likely the best match
    return recordings[0];
  } catch (error) {
    console.error('Failed to find matching recording:', error);
    return null;
  }
}

// Type definitions for MusicBrainz API responses

export interface MusicBrainzRelease {
  id: string; // MBID
  title: string;
  'artist-credit': Array<{
    artist: {
      id: string;
      name: string;
    };
    name: string;
  }>;
  date?: string;
  country?: string;
  'track-count': number;
  status?: string;
  disambiguation?: string;
}

export interface MusicBrainzReleaseDetails extends MusicBrainzRelease {
  media: Array<{
    position: number;
    format?: string;
    tracks: Array<{
      position: number;
      number: string;
      title: string;
      length?: number;
      recording: {
        id: string;
        title: string;
        length?: number;
      };
    }>;
  }>;
  'cover-art-archive'?: {
    artwork: boolean;
    count: number;
    front: boolean;
    back: boolean;
  };
  barcode?: string;
  'release-group'?: {
    id: string;
    'primary-type'?: string;
  };
}

export interface MusicBrainzRecording {
  id: string; // MBID
  title: string;
  length?: number; // in milliseconds
  'artist-credit': Array<{
    artist: {
      id: string;
      name: string;
    };
    name: string;
  }>;
  releases?: Array<{
    id: string;
    title: string;
  }>;
  isrcs?: string[];
}

export interface MusicBrainzRecordingDetails extends MusicBrainzRecording {
  disambiguation?: string;
  'first-release-date'?: string;
  genres?: Array<{
    id: string;
    name: string;
  }>;
  tags?: Array<{
    count: number;
    name: string;
  }>;
}

// Cover art functions
// MusicBrainz has a separate API for cover art: Cover Art Archive

export function getCoverArtUrl(releaseId: string, size: 'small' | 'large' | '500' | 'full' = 'large'): string {
  return `https://coverartarchive.org/release/${releaseId}/front-${size}`;
}

// Utility function to normalize strings for comparison
export function normalizeString(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Replace multiple spaces with a single space
    .trim();
}

// Export the MusicBrainz client as a singleton
const MusicBrainzClient = {
  searchReleases,
  searchRecordings,
  getRelease,
  getRecording,
  findBestMatchingRelease,
  findBestMatchingRecording,
  getCoverArtUrl,
  normalizeString
};

export default MusicBrainzClient;
