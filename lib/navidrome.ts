import crypto from 'crypto';

export interface NavidromeConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface SubsonicResponse<T = Record<string, unknown>> {
  'subsonic-response': {
    status: string;
    version: string;
    type: string;
    serverVersion?: string;
    openSubsonic?: boolean;
    error?: {
      code: number;
      message: string;
    };
  } & T;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  playCount?: number;
  created: string;
  starred?: string;
  year?: number;
  genre?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  starred?: string;
  coverArt?: string;
}

export interface Song {
  id: string;
  parent: string;
  isDir: boolean;
  title: string;
  album: string;
  artist: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size: number;
  contentType: string;
  suffix: string;
  duration: number;
  bitRate?: number;
  path: string;
  playCount?: number;
  discNumber?: number;
  created: string;
  albumId: string;
  artistId: string;
  type: string;
  starred?: string;
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner: string;
  public: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed: string;
  coverArt?: string;
}

export interface RadioStation {
  id: string;
  streamUrl: string;
  name: string;
  homePageUrl?: string;
}

export interface AlbumInfo {
  notes?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  biography?: string;
}

export interface ArtistInfo {
  biography?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  similarArtist?: Artist[];
}

class NavidromeAPI {
  private config: NavidromeConfig;
  private clientName = 'miceclient';
  private version = '1.16.0';

  constructor(config: NavidromeConfig) {
    this.config = config;
  }

  private generateSalt(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private generateToken(password: string, salt: string): string {
    return crypto.createHash('md5').update(password + salt).digest('hex');
  }

  async makeRequest(endpoint: string, params: Record<string, string | number> = {}): Promise<Record<string, unknown>> {
    const salt = this.generateSalt();
    const token = this.generateToken(this.config.password, salt);

    const queryParams = new URLSearchParams({
      u: this.config.username,
      t: token,
      s: salt,
      v: this.version,
      c: this.clientName,
      f: 'json',
      ...params
    });

    const url = `${this.config.serverUrl}/rest/${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SubsonicResponse = await response.json();
      
      if (data['subsonic-response'].status === 'failed') {
        throw new Error(data['subsonic-response'].error?.message || 'Unknown error');
      }
      
      return data['subsonic-response'];
    } catch (error) {
      console.error('Navidrome API request failed:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.makeRequest('ping');
      return true;
    } catch {
      return false;
    }
  }

  async getArtists(): Promise<Artist[]> {
    const response = await this.makeRequest('getArtists');
    const artists: Artist[] = [];
    
    const artistsData = response.artists as { index?: Array<{ artist?: Artist[] }> };
    if (artistsData?.index) {
      for (const index of artistsData.index) {
        if (index.artist) {
          artists.push(...index.artist);
        }
      }
    }
    
    return artists;
  }

  async getArtist(artistId: string): Promise<{ artist: Artist; albums: Album[] }> {
    const response = await this.makeRequest('getArtist', { id: artistId });
    const artistData = response.artist as Artist & { album?: Album[] };
    return {
      artist: artistData,
      albums: artistData.album || []
    };
  }

  async getAlbums(type?: 'newest' | 'recent' | 'frequent' | 'random' | 'alphabeticalByName' | 'alphabeticalByArtist' | 'starred' | 'highest', size: number = 500, offset: number = 0): Promise<Album[]> {
    const response = await this.makeRequest('getAlbumList2', { 
      type: type || 'newest',
      size,
      offset
    });
    const albumListData = response.albumList2 as { album?: Album[] };
    return albumListData?.album || [];
  }

  async getAlbum(albumId: string): Promise<{ album: Album; songs: Song[] }> {
    const response = await this.makeRequest('getAlbum', { id: albumId });
    const albumData = response.album as Album & { song?: Song[] };
    return {
      album: albumData,
      songs: albumData.song || []
    };
  }

  async search(query: string, artistCount = 20, albumCount = 20, songCount = 20): Promise<{
    artists: Artist[];
    albums: Album[];
    songs: Song[];
  }> {
    const response = await this.makeRequest('search3', {
      query,
      artistCount,
      albumCount,
      songCount
    });

    const searchData = response.searchResult3 as {
      artist?: Artist[];
      album?: Album[];
      song?: Song[];
    };

    return {
      artists: searchData?.artist || [],
      albums: searchData?.album || [],
      songs: searchData?.song || []
    };
  }

  async getPlaylists(): Promise<Playlist[]> {
    const response = await this.makeRequest('getPlaylists');
    const playlistsData = response.playlists as { playlist?: Playlist[] };
    return playlistsData?.playlist || [];
  }

  async getPlaylist(playlistId: string): Promise<{ playlist: Playlist; songs: Song[] }> {
    const response = await this.makeRequest('getPlaylist', { id: playlistId });
    const playlistData = response.playlist as Playlist & { entry?: Song[] };
    return {
      playlist: playlistData,
      songs: playlistData.entry || []
    };
  }

  async createPlaylist(name: string, songIds?: string[]): Promise<Playlist> {
    const params: Record<string, string | number> = { name };
    if (songIds && songIds.length > 0) {
      songIds.forEach((id, index) => {
        params[`songId[${index}]`] = id;
      });
    }
    
    const response = await this.makeRequest('createPlaylist', params);
    return response.playlist as Playlist;
  }

  async updatePlaylist(playlistId: string, name?: string, comment?: string, songIds?: string[]): Promise<void> {
    const params: Record<string, string | number> = { playlistId };
    if (name) params.name = name;
    if (comment) params.comment = comment;
    if (songIds) {
      songIds.forEach((id, index) => {
        params[`songId[${index}]`] = id;
      });
    }
    
    await this.makeRequest('updatePlaylist', params);
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.makeRequest('deletePlaylist', { id: playlistId });
  }

  getStreamUrl(songId: string, maxBitRate?: number): string {
    const salt = this.generateSalt();
    const token = this.generateToken(this.config.password, salt);
    
    const params = new URLSearchParams({
      u: this.config.username,
      t: token,
      s: salt,
      v: this.version,
      c: this.clientName,
      id: songId
    });

    if (maxBitRate) {
      params.append('maxBitRate', maxBitRate.toString());
    }

    return `${this.config.serverUrl}/rest/stream?${params.toString()}`;
  }

  getCoverArtUrl(coverArtId: string, size?: number): string {
    const salt = this.generateSalt();
    const token = this.generateToken(this.config.password, salt);
    
    const params = new URLSearchParams({
      u: this.config.username,
      t: token,
      s: salt,
      v: this.version,
      c: this.clientName,
      id: coverArtId
    });

    if (size) {
      params.append('size', size.toString());
    }

    return `${this.config.serverUrl}/rest/getCoverArt?${params.toString()}`;
  }

  async star(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const paramName = type === 'song' ? 'id' : type === 'album' ? 'albumId' : 'artistId';
    await this.makeRequest('star', { [paramName]: id });
  }

  async unstar(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const paramName = type === 'song' ? 'id' : type === 'album' ? 'albumId' : 'artistId';
    await this.makeRequest('unstar', { [paramName]: id });
  }

  async scrobble(songId: string, submission: boolean = true): Promise<void> {
    await this.makeRequest('scrobble', { 
      id: songId, 
      submission: submission.toString(),
      time: Date.now()
    });
  }

  // Enhanced scrobbling functionality for Last.fm integration
  async updateNowPlaying(songId: string): Promise<void> {
    try {
      await this.makeRequest('scrobble', { 
        id: songId, 
        submission: 'false',
        time: Date.now()
      });
    } catch (error) {
      console.error('Failed to update now playing:', error);
      // Don't throw - this is not critical
    }
  }

  async scrobbleTrack(songId: string, timestamp?: number): Promise<void> {
    try {
      await this.makeRequest('scrobble', { 
        id: songId, 
        submission: 'true',
        time: timestamp || Date.now()
      });
    } catch (error) {
      console.error('Failed to scrobble track:', error);
      // Don't throw - this is not critical
    }
  }

  // Helper method to determine if a track should be scrobbled
  // According to Last.fm guidelines: track should be scrobbled if played for at least 
  // 30 seconds OR half the track duration, whichever comes first
  shouldScrobble(playedDuration: number, totalDuration: number): boolean {
    const minimumTime = 30; // 30 seconds minimum
    const halfTrackTime = totalDuration / 2;
    return playedDuration >= Math.min(minimumTime, halfTrackTime);
  }

  async getAllSongs(size = 500, offset = 0): Promise<Song[]> {
    const response = await this.makeRequest('search3', {
      query: '',
      songCount: size,
      songOffset: offset,
      artistCount: 0,
      albumCount: 0
    });
    
    const searchData = response.searchResult3 as { song?: Song[] };
    return searchData?.song || [];
  }

  async getRadioStations(): Promise<RadioStation[]> {
    const response = await this.makeRequest('getRadioStations');
    const radioStationsData = response.radioStations as { radioStation?: RadioStation[] };
    return radioStationsData?.radioStation || [];
  }

  async getRadioStation(stationId: string): Promise<RadioStation> {
    const response = await this.makeRequest('getRadioStation', { id: stationId });
    return response.radioStation as RadioStation;
  }

  async getInternetRadioStations(): Promise<RadioStation[]> {
    try {
      const response = await this.makeRequest('getInternetRadioStations');
      const radioData = response.internetRadioStations as { internetRadioStation?: RadioStation[] };
      return radioData?.internetRadioStation || [];
    } catch (error) {
      console.error('Failed to get internet radio stations:', error);
      return [];
    }
  }

  async createInternetRadioStation(name: string, streamUrl: string, homePageUrl?: string): Promise<void> {
    const params: Record<string, string> = { name, streamUrl };
    if (homePageUrl) params.homePageUrl = homePageUrl;
    await this.makeRequest('createInternetRadioStation', params);
  }

  async deleteInternetRadioStation(id: string): Promise<void> {
    await this.makeRequest('deleteInternetRadioStation', { id });
  }

  async getArtistInfo(artistId: string): Promise<{ artist: Artist; info: ArtistInfo }> {
    const response = await this.makeRequest('getArtistInfo2', { id: artistId });
    const artistData = response.artist as Artist;
    const artistInfo = response.info as ArtistInfo;
    return {
      artist: artistData,
      info: artistInfo
    };
  }

  async getAlbumInfo(albumId: string): Promise<{ album: Album; info: AlbumInfo }> {
    const response = await this.makeRequest('getAlbumInfo2', { id: albumId });
    const albumData = response.album as Album;
    const albumInfo = response.info as AlbumInfo;
    return {
      album: albumData,
      info: albumInfo
    };
  }

  async search2(query: string, artistCount = 20, albumCount = 20, songCount = 20): Promise<{
    artists: Artist[];
    albums: Album[];
    songs: Song[];
  }> {
    const response = await this.makeRequest('search2', {
      query,
      artistCount,
      albumCount,
      songCount
    });

    const searchData = response.searchResult2 as {
      artist?: Artist[];
      album?: Album[];
      song?: Song[];
    };

    return {
      artists: searchData?.artist || [],
      albums: searchData?.album || [],
      songs: searchData?.song || []
    };
  }

  async getArtistInfo2(artistId: string, count = 20, includeNotPresent = false): Promise<ArtistInfo> {
    const response = await this.makeRequest('getArtistInfo2', {
      id: artistId,
      count,
      includeNotPresent: includeNotPresent.toString()
    });
    return response.artistInfo2 as ArtistInfo;
  }

  async getAlbumInfo2(albumId: string): Promise<AlbumInfo> {
    const response = await this.makeRequest('getAlbumInfo2', {
      id: albumId
    });
    return response.albumInfo2 as AlbumInfo;
  }

  async getStarred2(): Promise<{ starred2: { song?: Song[]; album?: Album[]; artist?: Artist[] } }> {
    try {
      const response = await this.makeRequest('getStarred2');
      return response as { starred2: { song?: Song[]; album?: Album[]; artist?: Artist[] } };
    } catch (error) {
      console.error('Failed to get starred items:', error);
      return { starred2: {} };
    }
  }

  async getAlbumSongs(albumId: string): Promise<Song[]> {
    try {
      const response = await this.makeRequest('getAlbum', { id: albumId });
      const albumData = response.album as { song?: Song[] };
      return albumData?.song || [];
    } catch (error) {
      console.error('Failed to get album songs:', error);
      return [];
    }
  }

  async getArtistTopSongs(artistName: string, limit: number = 10): Promise<Song[]> {
    try {
      // Search for songs by the artist and return them sorted by play count
      const searchResult = await this.search2(artistName, 0, 0, limit * 3);
      
      // Filter songs that are actually by this artist (exact match)
      const artistSongs = searchResult.songs.filter(song => 
        song.artist.toLowerCase() === artistName.toLowerCase()
      );
      
      // Sort by play count (descending) and limit results
      return artistSongs
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get artist top songs:', error);
      return [];
    }
  }
}

// Singleton instance management
let navidromeInstance: NavidromeAPI | null = null;

export function getNavidromeAPI(customConfig?: NavidromeConfig): NavidromeAPI | null {
  let config: NavidromeConfig;
  
  if (customConfig) {
    config = customConfig;
  } else {
    // Try to get config from localStorage first (client-side)
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('navidrome-config');
      if (savedConfig) {
        try {
          config = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Failed to parse saved Navidrome config:', error);
          config = getEnvConfig();
        }
      } else {
        config = getEnvConfig();
      }
    } else {
      // Server-side: use environment variables
      config = getEnvConfig();
    }
  }
  
  if (!config.serverUrl || !config.username || !config.password) {
    // Return null instead of throwing an error when configuration is incomplete
    // console.log('Navidrome configuration is incomplete. Please configure in settings.');
    return null;
  }
  
  // Always create a new instance if config is provided or if no instance exists
  if (customConfig || !navidromeInstance) {
    navidromeInstance = new NavidromeAPI(config);
  }
  
  return navidromeInstance;
}

function getEnvConfig(): NavidromeConfig {
  return {
    serverUrl: process.env.NEXT_PUBLIC_NAVIDROME_URL || '',
    username: process.env.NEXT_PUBLIC_NAVIDROME_USERNAME || '',
    password: process.env.NEXT_PUBLIC_NAVIDROME_PASSWORD || ''
  };
}

export function resetNavidromeAPI(): void {
  navidromeInstance = null;
}

export default NavidromeAPI;
