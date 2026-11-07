'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Album, Artist, Song, getNavidromeAPI } from '@/lib/navidrome';
import { extractAmbientColor, getCachedAmbientColor } from '@/lib/image-utils';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { ArtistBio } from '@/app/components/ArtistBio';
import { SimilarArtists } from '@/app/components/SimilarArtists';
import Loading from '@/app/components/loading';
import { Play, Pause, Star, Shuffle, MoreHorizontal, Share2, Info, ChevronRight, Plus } from 'lucide-react';
import { EqualizerBars } from '@/app/components/EqualizerBars';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ArtistPage() {
  const { artist: artistId } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [isPlayingArtist, setIsPlayingArtist] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<string>('#1f1d1c');

  const { getArtist, starItem, unstarItem } = useNavidrome();
  const { playTrack, playArtist, playAlbum, addAlbumToQueue, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const api = getNavidromeAPI();

  // Extract dominant color from artist image to match album background (cached & canonical 300px)
  useEffect(() => {
    const imgUrl = artist?.coverArt && api
      ? api.getCoverArtUrl(artist.coverArt, 300)
      : (artistAlbums[0]?.coverArt && api ? api.getCoverArtUrl(artistAlbums[0].coverArt, 300) : null);

    if (!imgUrl) return;

    const cached = getCachedAmbientColor(imgUrl);
    if (cached) {
      setDominantColor(cached);
      return;
    }

    let cancelled = false;
    extractAmbientColor(imgUrl, '#1f1d1c').then((color) => {
      if (!cancelled) setDominantColor(color);
    });
    return () => {
      cancelled = true;
    };
  }, [artist?.coverArt, artistAlbums, api]);

  useEffect(() => {
    let isMounted = true;
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        if (artistId && api) {
          const artistData = await getArtist(artistId as string);
          if (!isMounted) return;
          setArtist(artistData.artist);
          setArtistAlbums(artistData.albums);
          setIsStarred(!!artistData.artist.starred);

          try {
            const songs = await api.getArtistTopSongs(artistData.artist.name, 10, artistData.artist.id);
            if (isMounted) setPopularSongs(songs);
          } catch (e) {
            console.error('Failed to fetch top songs:', e);
          }
        }
      } catch (error) {
        console.error('Failed to fetch artist data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArtistData();
    return () => {
      isMounted = false;
    };
  }, [artistId, getArtist, api]);

  const handleStar = async () => {
    if (!artist) return;
    try {
      if (isStarred) {
        await unstarItem(artist.id, 'artist');
        setIsStarred(false);
      } else {
        await starItem(artist.id, 'artist');
        setIsStarred(true);
      }
    } catch (e) {
      console.error('Failed to star/unstar artist:', e);
    }
  };

  const handlePlayArtist = async () => {
    if (!artist) return;
    setIsPlayingArtist(true);
    try {
      await playArtist(artist.id);
    } catch (e) {
      console.error('Failed to play artist:', e);
    } finally {
      setIsPlayingArtist(false);
    }
  };

  const songToTrack = (song: Song) => {
    if (!api) throw new Error('Navidrome API not configured');
    return {
      id: song.id,
      name: song.title,
      url: api.getStreamUrlForSong(song),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred
    };
  };

  const handlePlaySong = (song: Song) => {
    if (currentTrack?.id === song.id) {
      togglePlayPause();
      return;
    }
    const track = songToTrack(song);
    playTrack(track, true);
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <Loading />;
  if (!artist) return <div className="p-8 text-center text-muted-foreground">Artist not found</div>;

  const artistImageUrl = artist.coverArt && api
    ? api.getCoverArtUrl(artist.coverArt, 1400)
    : (artistAlbums[0]?.coverArt && api ? api.getCoverArtUrl(artistAlbums[0].coverArt, 1400) : '/default-user.jpg');

  // Segregate albums and singles/EPs like Apple Music, sorted newest first (descending by year)
  const getAlbumYear = (album: Album): number => {
    if (typeof album.year === 'number' && album.year > 0) return album.year;
    if (album.releaseDate) {
      if (typeof album.releaseDate === 'object' && typeof album.releaseDate.year === 'number') {
        return album.releaseDate.year;
      }
      if (typeof album.releaseDate === 'string') {
        const parsed = parseInt(album.releaseDate.slice(0, 4), 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    if (album.originalReleaseDate) {
      if (typeof album.originalReleaseDate === 'object' && typeof album.originalReleaseDate.year === 'number') {
        return album.originalReleaseDate.year;
      }
      if (typeof album.originalReleaseDate === 'string') {
        const parsed = parseInt(album.originalReleaseDate.slice(0, 4), 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  };

  const sortByYearDesc = (a: Album, b: Album) => {
    const yearA = getAlbumYear(a);
    const yearB = getAlbumYear(b);
    if (yearB !== yearA) {
      return yearB - yearA;
    }
    // Fallback to created date or name if years match
    return (b.created || '').localeCompare(a.created || '');
  };

  const fullAlbums = artistAlbums
    .filter(a => (a.songCount || 0) >= 6)
    .sort(sortByYearDesc);

  const singlesAndEPs = artistAlbums
    .filter(a => (a.songCount || 0) < 6)
    .sort(sortByYearDesc);

  const latestRelease = artistAlbums.length > 0
    ? [...artistAlbums].sort(sortByYearDesc)[0]
    : null;

  return (
    <div
      className="min-h-full pb-36 text-[#e1deda] transition-colors duration-700"
      style={{
        backgroundColor: dominantColor,
        backgroundImage: `radial-gradient(ellipse 90% 70% at 20% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 80%), linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)`
      }}
    >
      {/* Apple Music Full-Bleed Cinematic Artist Header */}
      <div className="relative w-full h-[360px] md:h-[460px] lg:h-[500px] overflow-hidden select-none">
        {/* Background Artwork Image with Apple Music Fog & Edge Gradients */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{ backgroundImage: `url(${artistImageUrl})` }}
        />
        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

        {/* Top Floating Utility Controls */}
        <div className="absolute top-6 right-6 lg:right-12 z-20 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
              <DropdownMenuItem onClick={handlePlayArtist} className="cursor-pointer">
                <Play className="w-4 h-4 mr-2" /> Play Artist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStar} className="cursor-pointer">
                <Star className="w-4 h-4 mr-2" /> {isStarred ? 'Unstar Artist' : 'Star Artist'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center/Bottom Artist Billboard Info */}
        <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-6xl lg:text-[72px] font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-4">
            {artist.name}
          </h1>

          {/* Action Row: Info Pill, Large White Play Button, Star Favorite Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowBioModal(!showBioModal)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 shadow-md cursor-pointer"
              title="About Artist"
            >
              <Info className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayArtist}
              disabled={isPlayingArtist}
              className="w-14 h-14 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center transition-all active:scale-95 shadow-[0_6px_20px_rgba(0,0,0,0.4)] cursor-pointer"
              title="Play Artist"
            >
              <Play className="w-6 h-6 fill-black translate-x-0.5" />
            </button>

            <button
              onClick={handleStar}
              className={`w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer ${
                isStarred ? 'text-yellow-400' : 'text-white'
              }`}
              title={isStarred ? "Starred" : "Star"}
            >
              <Star className={`w-5 h-5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Content Container */}
      <div className="max-w-[1340px] mx-auto px-6 lg:px-12 pt-10 space-y-12">
        {/* Latest Release & Top Songs Row (as seen in Apple Music Screenshot) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Latest Release Card */}
          {latestRelease && (
            <div className="lg:col-span-4 space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Latest Release
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative w-28 h-28 rounded-lg overflow-hidden shrink-0 shadow-lg group/cover bg-black/30">
                  <Image
                    src={latestRelease.coverArt && api ? api.getCoverArtUrl(latestRelease.coverArt, 240) : '/default-user.jpg'}
                    alt={latestRelease.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-between p-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAlbum(latestRelease.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white backdrop-blur-md shadow-md active:scale-95 transition-all"
                      title="Play Album"
                    >
                      <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button
                          className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white backdrop-blur-md shadow-md active:scale-95 transition-all"
                          title="More options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
                        <DropdownMenuItem onClick={() => playAlbum(latestRelease.id)} className="cursor-pointer">
                          <Play className="w-4 h-4 mr-2" /> Play Next
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addAlbumToQueue(latestRelease.id)} className="cursor-pointer">
                          <Plus className="w-4 h-4 mr-2" /> Add to Queue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50 mb-1 font-medium">
                    {latestRelease.year ? String(latestRelease.year) : 'Album'}
                  </p>
                  <Link
                    href={`/album/${latestRelease.id}`}
                    className="text-[17px] font-semibold text-white hover:underline truncate block leading-snug"
                  >
                    {latestRelease.name}
                  </Link>
                  <p className="text-xs text-white/60 truncate mt-1">
                    {latestRelease.songCount} {latestRelease.songCount === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Songs 2-column or list view */}
          {popularSongs.length > 0 && (
            <div className={`${latestRelease ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-3`}>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Top Songs <ChevronRight className="w-4 h-4 text-white/40" />
              </h2>
              <div className="divide-y divide-white/[0.06] border-t border-b border-white/[0.06]">
                {popularSongs.slice(0, 5).map((song, idx) => {
                  const playing = currentTrack?.id === song.id;
                  const isHovered = hoveredSongId === song.id;

                  return (
                    <div
                      key={song.id}
                      onMouseEnter={() => setHoveredSongId(song.id)}
                      onMouseLeave={() => setHoveredSongId(null)}
                      onClick={() => handlePlaySong(song)}
                      className={`group flex items-center h-12 px-2 rounded-md transition-colors cursor-pointer ${
                        playing ? 'bg-white/10' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      {/* Track number / Play icon */}
                      <div className="w-7 shrink-0 text-xs text-white/40 font-mono">
                        {playing ? (
                          isHovered ? (
                            isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-white text-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                            )
                          ) : (
                            <EqualizerBars className="w-3.5 h-3.5 text-white" isAnimating={isPlaying} />
                          )
                        ) : isHovered ? (
                          <Play className="w-3.5 h-3.5 fill-white text-white" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      {/* Small Thumbnail */}
                      <div className="w-8 h-8 rounded overflow-hidden shrink-0 mr-3 bg-black/40">
                        <Image
                          src={song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 64) : '/default-user.jpg'}
                          alt={song.title}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Song Title & Album */}
                      <div className="flex-1 min-w-0 pr-4">
                        <span className={`text-[14px] truncate block ${
                          playing ? 'text-primary font-medium' : 'text-white/90'
                        }`}>
                          {song.title}
                        </span>
                      </div>

                      {/* Song duration */}
                      <div className="text-xs text-white/40 font-mono shrink-0 pr-2">
                        {formatDuration(song.duration)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Albums Grid Section */}
        {fullAlbums.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Albums
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {fullAlbums.map((album) => (
                <AlbumArtwork
                  key={album.id}
                  album={album}
                  showArtist={false}
                  className="w-full"
                  aspectRatio="square"
                  width={220}
                  height={220}
                />
              ))}
            </div>
          </div>
        )}

        {/* Singles & EPs Grid Section (matching Apple Music Screenshot 1) */}
        {singlesAndEPs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Singles & EPs <ChevronRight className="w-5 h-5 text-white/40" />
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {singlesAndEPs.map((single) => (
                <AlbumArtwork
                  key={single.id}
                  album={single}
                  showArtist={false}
                  className="w-full"
                  aspectRatio="square"
                  width={220}
                  height={220}
                />
              ))}
            </div>
          </div>
        )}

        {/* About / Bio Section */}
        <div className="pt-4 border-t border-white/[0.08]">
          <ArtistBio artistName={artist.name} />
        </div>

        {/* Similar Artists */}
        <div className="pt-2">
          <SimilarArtists artistName={artist.name} />
        </div>
      </div>
    </div>
  );
}
