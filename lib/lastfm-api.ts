interface LastFmCredentials {
  apiKey: string;
  apiSecret: string;
  sessionKey?: string;
  username?: string;
}

interface LastFmArtistInfo {
  name: string;
  bio?: {
    summary: string;
    content: string;
  };
  stats?: {
    listeners: string;
    playcount: string;
  };
  similar?: {
    artist: Array<{
      name: string;
      url: string;
      image: Array<{
        '#text': string;
        size: string;
      }>;
    }>;
  };
  tags?: {
    tag: Array<{
      name: string;
      url: string;
    }>;
  };
  image?: Array<{
    '#text': string;
    size: string;
  }>;
}

interface LastFmTopTracks {
  track: Array<{
    name: string;
    playcount: string;
    listeners: string;
    artist: {
      name: string;
      mbid: string;
      url: string;
    };
    image: Array<{
      '#text': string;
      size: string;
    }>;
    '@attr': {
      rank: string;
    };
  }>;
}

export class LastFmAPI {
  private baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  
  private getCredentials(): LastFmCredentials | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('lastfm-credentials');
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private async makeRequest(method: string, params: Record<string, string>): Promise<any> {
    const credentials = this.getCredentials();
    if (!credentials?.apiKey) {
      throw new Error('No Last.fm API key available');
    }

    const url = new URL(this.baseUrl);
    url.searchParams.append('method', method);
    url.searchParams.append('api_key', credentials.apiKey);
    url.searchParams.append('format', 'json');
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || 'Last.fm API error');
    }

    return data;
  }

  async getArtistInfo(artistName: string): Promise<LastFmArtistInfo | null> {
    try {
      const data = await this.makeRequest('artist.getInfo', {
        artist: artistName,
        autocorrect: '1'
      });
      
      return data.artist || null;
    } catch (error) {
      console.error('Failed to fetch artist info from Last.fm:', error);
      return null;
    }
  }

  async getArtistTopTracks(artistName: string, limit: number = 10): Promise<LastFmTopTracks | null> {
    try {
      const data = await this.makeRequest('artist.getTopTracks', {
        artist: artistName,
        limit: limit.toString(),
        autocorrect: '1'
      });
      
      return data.toptracks || null;
    } catch (error) {
      console.error('Failed to fetch artist top tracks from Last.fm:', error);
      return null;
    }
  }

  async getSimilarArtists(artistName: string, limit: number = 6): Promise<LastFmArtistInfo['similar'] | null> {
    try {
      const data = await this.makeRequest('artist.getSimilar', {
        artist: artistName,
        limit: limit.toString(),
        autocorrect: '1'
      });
      
      return data.similarartists || null;
    } catch (error) {
      console.error('Failed to fetch similar artists from Last.fm:', error);
      return null;
    }
  }

  isAvailable(): boolean {
    const credentials = this.getCredentials();
    return !!credentials?.apiKey;
  }
}

export const lastFmAPI = new LastFmAPI();
