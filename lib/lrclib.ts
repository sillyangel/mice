interface LrcLibTrack {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

interface LyricLine {
  time: number;
  text: string;
}

export class LrcLibClient {
  private baseUrl = 'https://lrclib.net/api';

  async searchTrack(artist: string, track: string, album?: string, duration?: number): Promise<LrcLibTrack | null> {
    try {
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: track,
      });

      if (album) {
        params.append('album_name', album);
      }

      if (duration) {
        params.append('duration', Math.round(duration).toString());
      }

      const response = await fetch(`${this.baseUrl}/search?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results: LrcLibTrack[] = await response.json();
      
      // Return the best match (first result is usually the best)
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Failed to search lyrics:', error);
      return null;
    }
  }

  async getTrackById(id: number): Promise<LrcLibTrack | null> {
    try {
      const response = await fetch(`${this.baseUrl}/get/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get track by ID:', error);
      return null;
    }
  }

  parseSyncedLyrics(syncedLyrics: string): LyricLine[] {
    if (!syncedLyrics) return [];

    const lines = syncedLyrics.split('\n');
    const lyricLines: LyricLine[] = [];

    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const centiseconds = parseInt(match[3], 10);
        const text = match[4].trim();

        const time = minutes * 60 + seconds + centiseconds / 100;
        lyricLines.push({ time, text });
      }
    }

    return lyricLines.sort((a, b) => a.time - b.time);
  }

  getCurrentLyricIndex(lyricLines: LyricLine[], currentTime: number): number {
    if (lyricLines.length === 0) return -1;

    for (let i = lyricLines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricLines[i].time) {
        return i;
      }
    }

    return -1;
  }
}

export const lrcLibClient = new LrcLibClient();
