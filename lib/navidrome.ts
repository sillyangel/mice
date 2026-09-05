import { md5, randomHex } from './md5';

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

export type OSTimestamp =
  | string
  | {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      second?: number;
      millis?: number;
      timeZone?: string;
    };

export interface ItemGenre {
  name: string;
}

export interface Contributor {
  name?: string;
  artistId?: string;
  roles?: string[];
  subRoles?: string[];
  sortOrder?: number;
}

export interface RecordLabel {
  name?: string;
  musicBrainzId?: string;
  sortOrder?: number;
}

export interface DiscTitle {
  disc?: number;
  title?: string;
}

export interface Movement {
  name?: string;
  index?: number;
}

export interface Work {
  title?: string;
  id?: string;
  movements?: Movement[];
}

export interface ReplayGain {
  trackGain?: number;
  albumGain?: number;
  trackPeak?: number;
  albumPeak?: number;
  baseGain?: number;
  fallbackGain?: number;
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
  played?: string;
  userRating?: number;
  averageRating?: number;
  created: string;
  starred?: string;
  year?: number;
  genre?: string;
  genres?: ItemGenre[];
  artists?: Contributor[];
  displayArtist?: string;
  recordLabels?: RecordLabel[];
  musicBrainzId?: string;
  releaseTypes?: string[];
  moods?: string[];
  sortName?: string;
  originalReleaseDate?: OSTimestamp;
  releaseDate?: OSTimestamp;
  isCompilation?: boolean;
  discTitles?: DiscTitle[];
  explicitStatus?: 'explicit' | 'nonExplicit' | 'unknown';
  version?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  starred?: string;
  coverArt?: string;
  musicBrainzId?: string;
  sortName?: string;
  roles?: string[];
  disambiguation?: string;
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
  genres?: ItemGenre[];
  artists?: Contributor[];
  displayArtist?: string;
  albumArtists?: Contributor[];
  displayAlbumArtist?: string;
  contributors?: Contributor[];
  displayComposer?: string;
  coverArt?: string;
  size: number;
  contentType: string;
  suffix: string;
  duration: number;
  bitRate?: number;
  bitDepth?: number;
  samplingRate?: number;
  channelCount?: number;
  path: string;
  playCount?: number;
  played?: string;
  discNumber?: number;
  created: string;
  albumId: string;
  artistId: string;
  type: string;
  starred?: string;
  bpm?: number;
  comment?: string;
  sortName?: string;
  mediaType?: string;
  musicBrainzId?: string;
  isrc?: string;
  moods?: string[];
  replayGain?: number;
  explicitStatus?: 'explicit' | 'nonExplicit' | 'unknown';
  works?: Work[];
  movements?: Movement[];
  groupings?: number[];
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
  readOnly?: boolean;
  validUntil?: string;
  genre?: string;
}

export interface RadioStation {
  id: string;
  streamUrl: string;
  name: string;
  homePageUrl?: string;
  coverArt?: string;
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

export interface User {
  username: string;
  email?: string;
  scrobblingEnabled: boolean;
  maxBitRate?: number;
  adminRole: boolean;
  settingsRole: boolean;
  downloadRole: boolean;
  uploadRole: boolean;
  playlistRole: boolean;
  coverArtRole: boolean;
  commentRole: boolean;
  podcastRole: boolean;
  streamRole: boolean;
  jukeboxRole: boolean;
  shareRole: boolean;
  videoConversionRole: boolean;
  avatarLastChanged?: string;
}

export interface OpenSubsonicExtension {
  name: string;
  versions: number[];
}

export interface LyricLine {
  start?: number;
  value?: string;
}

export interface Cue {
  time?: number;
  endTime?: number;
  byteStart?: number;
  byteEnd?: number;
}

export interface CueLine {
  line?: number;
  agentId?: string;
  value?: string;
  cue?: Cue[];
}

export interface Agent {
  id?: string;
  role?: string;
  attribution?: string;
  name?: string;
}

export interface StructuredLyrics {
  lang?: string;
  kind?: string;
  synced?: boolean;
  offset?: number;
  agentId?: string;
  agents?: Agent[];
  line?: LyricLine[];
  cueLine?: CueLine[];
}

export interface Genre {
  songCount: number;
  albumCount?: number;
  value: string;
}

export interface TokenInfo {
  username?: string;
  sub?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface NowPlayingEntry extends Song {
  username?: string;
  minutesAgo?: number;
  playerId?: number;
  playerName?: string;
}

interface RequestOptions {
  cacheMs?: number;
}

class NavidromeAPI {
  private config: NavidromeConfig;
  private clientName = 'miceclient';
  private version = '1.16.1';

  private requestCache = new Map<string, { expiry: number; response: Record<string, unknown> }>();
  private inFlight = new Map<string, Promise<Record<string, unknown>>>();
  private extensionsPromise: Promise<OpenSubsonicExtension[]> | null = null;

  constructor(config: NavidromeConfig) {
    this.config = config;
  }

  private cacheKey(endpoint: string, params: Record<string, string | number>): string {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${k}=${v}`);
    return `${endpoint}?${parts.join('&')}`;
  }

  private clearRequestCache(): void {
    this.requestCache.clear();
  }

  async makeRequest(endpoint: string, params: Record<string, string | number> = {}, options: RequestOptions = {}): Promise<Record<string, unknown>> {
    if (options.cacheMs) {
      const key = this.cacheKey(endpoint, params);
      const cached = this.requestCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.response;
      }
      const pending = this.inFlight.get(key);
      if (pending) {
        return pending;
      }
      const promise = this.performRequest(endpoint, params).then((response) => {
        const cacheMs = options.cacheMs as number;
        this.requestCache.set(key, { expiry: Date.now() + cacheMs, response });
        return response;
      }).finally(() => {
        this.inFlight.delete(key);
      });
      this.inFlight.set(key, promise);
      return promise;
    }
    return this.performRequest(endpoint, params);
  }

  private async performRequest(endpoint: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
    const salt = randomHex(8);
    const token = md5(this.config.password + salt);

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

  getServerVersion(): string {
    return this.version;
  }

  async ping(): Promise<boolean> {
    try {
      await this.makeRequest('ping', {}, { cacheMs: 15_000 });
      return true;
    } catch {
      return false;
    }
  }

  async getUserInfo(): Promise<User> {
    const response = await this.makeRequest('getUser', { username: this.config.username }, { cacheMs: 60_000 });
    const userData = response.user as User;
    return userData;
  }

  async getArtists(): Promise<Artist[]> {
    const response = await this.makeRequest('getArtists', {}, { cacheMs: 60_000 });
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
    try {
      const response = await this.makeRequest('getArtist', { id: artistId }, { cacheMs: 60_000 });
      const artistData = response.artist as Artist & { album?: Album[] };
      return {
        artist: artistData,
        albums: artistData.album || []
      };
    } catch (error) {
      console.error('Navidrome API request failed:', error);
      throw new Error('Artist not found');
    }
  }

  async getAlbums(type?: 'newest' | 'recent' | 'frequent' | 'random' | 'alphabeticalByName' | 'alphabeticalByArtist' | 'starred' | 'highest', size: number = 500, offset: number = 0): Promise<Album[]> {
    const response = await this.makeRequest('getAlbumList2', {
      type: type || 'newest',
      size,
      offset
    }, { cacheMs: 30_000 });
    const albumListData = response.albumList2 as { album?: Album[] };
    return albumListData?.album || [];
  }

  async getAlbum(albumId: string): Promise<{ album: Album; songs: Song[] }> {
    const response = await this.makeRequest('getAlbum', { id: albumId }, { cacheMs: 30_000 });
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
    }, { cacheMs: 30_000 });

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
    const response = await this.makeRequest('getPlaylists', {}, { cacheMs: 30_000 });
    const playlistsData = response.playlists as { playlist?: Playlist[] };
    return playlistsData?.playlist || [];
  }

  async getPlaylist(playlistId: string): Promise<{ playlist: Playlist; songs: Song[] }> {
    const response = await this.makeRequest('getPlaylist', { id: playlistId }, { cacheMs: 30_000 });
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
    this.clearRequestCache();
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
    this.clearRequestCache();
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.makeRequest('deletePlaylist', { id: playlistId });
    this.clearRequestCache();
  }

  getStreamUrl(songId: string, maxBitRate?: number): string {
    const salt = randomHex(8);
    const token = md5(this.config.password + salt);

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

  // Direct download URL (original file). Useful for offline caching where the browser can handle transcoding.
  getDownloadUrl(songId: string): string {
    const salt = randomHex(8);
    const token = md5(this.config.password + salt);

    const params = new URLSearchParams({
      u: this.config.username,
      t: token,
      s: salt,
      v: this.version,
      c: this.clientName,
      id: songId
    });

    return `${this.config.serverUrl}/rest/download?${params.toString()}`;
  }

  getCoverArtUrl(coverArtId: string, size?: number): string {
    const salt = randomHex(8);
    const token = md5(this.config.password + salt);

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
    this.clearRequestCache();
  }

  async unstar(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const paramName = type === 'song' ? 'id' : type === 'album' ? 'albumId' : 'artistId';
    await this.makeRequest('unstar', { [paramName]: id });
    this.clearRequestCache();
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
    }
  }

  // Helper method to determine if a track should be scrobbled
  // According to Last.fm guidelines: track should be scrobbled if played for at least
  // 30 seconds OR half the track duration, whichever comes first
  shouldScrobble(playedDuration: number, totalDuration: number): boolean {
    const minimumTime = 30;
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
    }, { cacheMs: 30_000 });

    const searchData = response.searchResult3 as { song?: Song[] };
    return searchData?.song || [];
  }

  async getRadioStations(): Promise<RadioStation[]> {
    const response = await this.makeRequest('getRadioStations', {}, { cacheMs: 60_000 });
    const radioStationsData = response.radioStations as { radioStation?: RadioStation[] };
    return radioStationsData?.radioStation || [];
  }

  async getRadioStation(stationId: string): Promise<RadioStation> {
    const response = await this.makeRequest('getRadioStation', { id: stationId }, { cacheMs: 60_000 });
    return response.radioStation as RadioStation;
  }

  async getInternetRadioStations(): Promise<RadioStation[]> {
    try {
      const response = await this.makeRequest('getInternetRadioStations', {}, { cacheMs: 60_000 });
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
    this.clearRequestCache();
  }

  async deleteInternetRadioStation(id: string): Promise<void> {
    await this.makeRequest('deleteInternetRadioStation', { id });
    this.clearRequestCache();
  }

  async getArtistInfo(artistId: string): Promise<{ artist: Artist; info: ArtistInfo }> {
    const response = await this.makeRequest('getArtistInfo2', { id: artistId }, { cacheMs: 60_000 });
    const artistData = response.artist as Artist;
    const artistInfo = response.info as ArtistInfo;
    return {
      artist: artistData,
      info: artistInfo
    };
  }

  async getAlbumInfo(albumId: string): Promise<{ album: Album; info: AlbumInfo }> {
    const response = await this.makeRequest('getAlbumInfo2', { id: albumId }, { cacheMs: 60_000 });
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
    }, { cacheMs: 30_000 });

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
    }, { cacheMs: 60_000 });
    return response.artistInfo2 as ArtistInfo;
  }

  async getAlbumInfo2(albumId: string): Promise<AlbumInfo> {
    const response = await this.makeRequest('getAlbumInfo2', {
      id: albumId
    }, { cacheMs: 60_000 });
    return response.albumInfo2 as AlbumInfo;
  }

  async getStarred2(): Promise<{ starred2: { song?: Song[]; album?: Album[]; artist?: Artist[] } }> {
    try {
      const response = await this.makeRequest('getStarred2', {}, { cacheMs: 15_000 });
      return response as { starred2: { song?: Song[]; album?: Album[]; artist?: Artist[] } };
    } catch (error) {
      console.error('Failed to get starred items:', error);
      return { starred2: {} };
    }
  }

  async getAlbumSongs(albumId: string): Promise<Song[]> {
    try {
      const response = await this.makeRequest('getAlbum', { id: albumId }, { cacheMs: 30_000 });
      const albumData = response.album as { song?: Song[] };
      return albumData?.song || [];
    } catch (error) {
      console.error('Failed to get album songs:', error);
      return [];
    }
  }

  // OpenSubsonic: getOpenSubsonicExtensions with instance-level caching.
  async getOpenSubsonicExtensions(): Promise<OpenSubsonicExtension[]> {
    if (!this.extensionsPromise) {
      this.extensionsPromise = this.performRequest('getOpenSubsonicExtensions', {})
        .then((response) => {
          const data = response.openSubsonicExtensions as { extension?: OpenSubsonicExtension[] };
          return data?.extension || [];
        })
        .catch(() => []);
    }
    return this.extensionsPromise;
  }

  async hasExtension(name: string): Promise<boolean> {
    const extensions = await this.getOpenSubsonicExtensions();
    return extensions.some((extension) => extension.name === name);
  }

  // OpenSubsonic: getLyricsBySongId (songLyrics extension, v1/v2)
  async getLyricsBySongId(songId: string, enhanced = false): Promise<StructuredLyrics[]> {
    const response = await this.makeRequest('getLyricsBySongId', {
      id: songId,
      ...(enhanced ? { enhanced: 'true' } : {})
    }, { cacheMs: 60_000 });
    const list = response.lyricsList as { structuredLyrics?: StructuredLyrics[] };
    return list?.structuredLyrics || [];
  }

  // OpenSubsonic: reportPlayback (playbackReport extension)
  async reportPlayback(options: {
    mediaId: string;
    mediaType?: 'song' | 'podcast';
    positionMs?: number;
    state?: 'starting' | 'playing' | 'paused' | 'stopped';
    playbackRate?: number;
    ignoreScrobble?: boolean;
  }): Promise<void> {
    const params: Record<string, string | number> = { mediaId: options.mediaId };
    if (options.mediaType) params.mediaType = options.mediaType;
    if (options.positionMs !== undefined) params.positionMs = options.positionMs;
    if (options.state) params.state = options.state;
    if (options.playbackRate !== undefined) params.playbackRate = options.playbackRate;
    if (options.ignoreScrobble !== undefined) params.ignoreScrobble = options.ignoreScrobble ? 'true' : 'false';
    try {
      await this.makeRequest('reportPlayback', params);
    } catch (error) {
      console.error('Failed to report playback:', error);
    }
  }

  // OpenSubsonic: getTopSongs with topSongsByArtistId support (id param)
  async getTopSongs(artistId: string, count = 10, artistName?: string): Promise<Song[]> {
    try {
      const params: Record<string, string | number> = { count };
      const supportsId = await this.hasExtension('topSongsByArtistId');
      if (supportsId) {
        params.id = artistId;
      } else if (artistName) {
        params.artist = artistName;
      } else {
        return [];
      }
      const response = await this.makeRequest('getTopSongs', params, { cacheMs: 60_000 });
      const top = response.topSongs as { song?: Song[] };
      return top?.song || [];
    } catch (error) {
      console.error('Failed to get top songs:', error);
      return [];
    }
  }

  // OpenSubsonic: getSong
  async getSong(id: string): Promise<Song | undefined> {
    const response = await this.makeRequest('getSong', { id }, { cacheMs: 30_000 });
    return response.song as Song | undefined;
  }

  // OpenSubsonic: setRating
  async setRating(id: string, rating: number): Promise<void> {
    await this.makeRequest('setRating', { id, rating });
    this.clearRequestCache();
  }

  // OpenSubsonic: getGenres
  async getGenres(): Promise<{ song?: Genre[]; album?: Genre[]; artist?: Genre[] }> {
    const response = await this.makeRequest('getGenres', {}, { cacheMs: 60_000 });
    return (response.genres as { song?: Genre[]; album?: Genre[]; artist?: Genre[] }) || {};
  }

  // OpenSubsonic: tokenInfo
  async tokenInfo(): Promise<TokenInfo | undefined> {
    try {
      const response = await this.makeRequest('tokenInfo', {});
      return response.tokenInfo as TokenInfo | undefined;
    } catch {
      return undefined;
    }
  }

  // OpenSubsonic: getNowPlaying
  async getNowPlaying(): Promise<NowPlayingEntry[]> {
    try {
      const response = await this.makeRequest('getNowPlaying', {}, { cacheMs: 30_000 });
      const nowPlaying = response.nowPlaying as { entry?: NowPlayingEntry[] };
      return nowPlaying?.entry || [];
    } catch (error) {
      console.error('Failed to get now playing:', error);
      return [];
    }
  }

  async getScanStatus(): Promise<{ scanning: boolean; count?: number } | undefined> {
    try {
      const response = await this.makeRequest('getScanStatus', {}, { cacheMs: 30_000 });
      return response.scanStatus as { scanning: boolean; count?: number };
    } catch {
      return undefined;
    }
  }

  async startScan(): Promise<void> {
    await this.makeRequest('startScan', {});
  }

  getArtistTopSongs(artistName: string, limit: number = 10, artistId?: string): Promise<Song[]> {
    if (artistId) {
      return this.getTopSongs(artistId, limit, artistName);
    }
    return this.getArtistTopSongsBySearch(artistName, limit);
  }

  private async getArtistTopSongsBySearch(artistName: string, limit: number): Promise<Song[]> {
    try {
      const searchResult = await this.search2(artistName, 0, 0, limit * 3);

      const artistSongs = searchResult.songs.filter(song =>
        song.artist.toLowerCase() === artistName.toLowerCase()
      );

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
    return null;
  }

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