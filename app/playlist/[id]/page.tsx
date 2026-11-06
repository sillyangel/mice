'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Playlist, Song, getNavidromeAPI } from '@/lib/navidrome';
import { extractAmbientColor, getCachedAmbientColor } from '@/lib/image-utils';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Play, Pause, Star, Shuffle, MoreHorizontal, Share2, Plus } from 'lucide-react';
import { EqualizerBars } from '@/app/components/EqualizerBars';
import { Button } from '@/components/ui/button';
import Loading from "@/app/components/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState<string>('#1f1d1c');
  const [starredSongs, setStarredSongs] = useState<Set<string>>(new Set());
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  const { getPlaylist, starItem, unstarItem } = useNavidrome();
  const { playTrack, playTracks, addToQueue, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const api = getNavidromeAPI();

  useEffect(() => {
    let isMounted = true;
    const fetchPlaylistData = async () => {
      setLoading(true);
      try {
        const playlistData = await getPlaylist(id as string);
        if (!isMounted) return;
        setPlaylist(playlistData.playlist);
        setTracklist(playlistData.songs);

        const starred = new Set(
          playlistData.songs.filter(s => s.starred).map(s => s.id)
        );
        setStarredSongs(starred);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchPlaylistData();
    }
    return () => {
      isMounted = false;
    };
  }, [id, getPlaylist]);

  // Extract Apple-like dominant background color from playlist cover artwork (cached & canonical 300px)
  useEffect(() => {
    const coverArt = playlist?.coverArt || (tracklist.length > 0 ? tracklist[0].coverArt : null);
    if (!coverArt || !api) return;

    const imgUrl = api.getCoverArtUrl(coverArt, 300);
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
  }, [playlist?.coverArt, tracklist, api]);

  // Synchronize dominant background color with theme-color meta tag for WCO titlebar
  useEffect(() => {
    if (!dominantColor) return;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    const prevColor = metaThemeColor?.content || '#141517';
    if (metaThemeColor) {
      metaThemeColor.content = dominantColor;
    }
    return () => {
      if (metaThemeColor) {
        metaThemeColor.content = prevColor;
      }
    };
  }, [dominantColor]);

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

  const handlePlayClick = (song: Song) => {
    if (currentTrack?.id === song.id) {
      togglePlayPause();
      return;
    }
    const track = songToTrack(song);
    playTrack(track, true);
  };

  const handlePlayPlaylist = () => {
    if (!tracklist.length || !api) return;
    playTracks(tracklist.map(songToTrack), 0);
  };

  const handleShufflePlaylist = () => {
    if (!tracklist.length || !api) return;
    const shuffled = [...tracklist];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTracks(shuffled.map(songToTrack), 0);
  };

  const handleSongStar = async (song: Song) => {
    try {
      const isStarred = starredSongs.has(song.id);
      if (isStarred) {
        await unstarItem(song.id, 'song');
        setStarredSongs(prev => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
      } else {
        await starItem(song.id, 'song');
        setStarredSongs(prev => new Set(prev).add(song.id));
      }
    } catch (e) {
      console.error('Failed to star/unstar song:', e);
    }
  };

  const isCurrentlyPlaying = (song: Song): boolean => {
    return currentTrack?.id === song.id;
  };

  const formatDuration = (
    duration: number,
    style: 'clock' | 'human' = 'clock'
  ): string => {
    if (style === 'clock') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const totalMinutes = Math.floor(duration / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const getPlaylistCoverUrl = () => {
    if (playlist?.coverArt && api) {
      return api.getCoverArtUrl(playlist.coverArt, 600);
    }
    if (tracklist.length > 0 && tracklist[0].coverArt && api) {
      return api.getCoverArtUrl(tracklist[0].coverArt, 600);
    }
    return '/default-user.jpg';
  };

  if (loading) return <Loading />;
  if (!playlist) return <div className="p-8 text-center text-muted-foreground">Playlist not found</div>;

  return (
    <div
      className="min-h-full transition-colors duration-700 pb-36 text-[#e1deda]"
      style={{
        backgroundColor: dominantColor,
        backgroundImage: `radial-gradient(ellipse 90% 70% at 20% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 80%), linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)`
      }}
    >
      <div className="max-w-[1340px] mx-auto px-6 lg:px-12 pt-8">
        {/* Top Header Utilities */}
        <div className="flex justify-end items-center gap-2 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
              <DropdownMenuItem onClick={handlePlayPlaylist} className="cursor-pointer">
                <Play className="w-4 h-4 mr-2" /> Play Next
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShufflePlaylist} className="cursor-pointer">
                <Shuffle className="w-4 h-4 mr-2" /> Shuffle Playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-10 mb-10">
          {/* Playlist Artwork */}
          <div className="shrink-0 group relative">
            <Image
              src={getPlaylistCoverUrl()}
              alt={playlist.name}
              width={270}
              height={270}
              priority
              className="rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover aspect-square"
            />
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0 text-center md:text-left flex flex-col justify-start">
            <h1 className="text-3xl lg:text-[40px] font-bold tracking-tight text-white leading-tight mb-2">
              {playlist.name}
            </h1>

            <p className="text-xl lg:text-[22px] font-semibold text-white/90 mb-2">
              {playlist.owner || 'Apple Music'}
            </p>

            <p className="text-sm text-white/60 mb-5 font-normal tracking-wide">
              {playlist.songCount} songs • {formatDuration(playlist.duration || 0, 'human')}
            </p>

            {playlist.comment && (
              <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-white/70">
                {playlist.comment}
              </p>
            )}

            {/* Apple Music Pill Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 mt-auto">
              <button
                onClick={handlePlayPlaylist}
                className="inline-flex items-center justify-center gap-2 h-10 px-7 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-md"
              >
                <Play className="w-4 h-4 fill-black" />
                Play
              </button>
              <button
                onClick={handleShufflePlaylist}
                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm active:scale-95 transition-all backdrop-blur-md"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Playlist Table */}
        <div className="mt-8">
          {/* Table Header Bar */}
          <div className="grid grid-cols-[1fr_80px] md:grid-cols-[5fr_3fr_80px] lg:grid-cols-[4fr_3fr_3fr_80px] items-center px-4 pb-3 text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/[0.07]">
            <div className="text-left">Song</div>
            <div className="hidden md:block text-left">Artist</div>
            <div className="hidden lg:block text-left">Album</div>
            <div className="text-right pr-7">Time</div>
          </div>

          <div className="relative">
            {tracklist.map((song, index) => {
              const playing = isCurrentlyPlaying(song);
              const isHovered = hoveredTrackId === song.id;

              return (
                <div
                  key={song.id}
                  onMouseEnter={() => setHoveredTrackId(song.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  onClick={() => handlePlayClick(song)}
                  className={`group relative grid grid-cols-[1fr_80px] md:grid-cols-[5fr_3fr_80px] lg:grid-cols-[4fr_3fr_3fr_80px] items-center h-14 px-4 rounded-md transition-colors cursor-pointer ${
                    playing
                      ? 'bg-white/10 text-white'
                      : 'hover:bg-white/[0.06] text-white hover:text-white'
                  }`}
                >
                  {/* Song (Artwork + Title) */}
                  <div className="flex items-center min-w-0 pr-4">
                    <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 mr-3.5 bg-black/30">
                      <Image
                        src={song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 80) : '/default-user.jpg'}
                        alt={song.album}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        playing || isHovered ? 'opacity-100' : 'opacity-0'
                      }`}>
                        {playing ? (
                          isHovered ? (
                            isPlaying ? (
                              <Pause className="w-4 h-4 fill-white text-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white" />
                            )
                          ) : (
                            <EqualizerBars className="w-4 h-4 text-white" isAnimating={isPlaying} />
                          )
                        ) : (
                          <Play className="w-4 h-4 fill-white text-white" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className={`text-[15px] font-normal truncate block ${
                        playing ? 'text-primary font-medium' : 'text-white/90'
                      }`}>
                        {song.title}
                      </span>
                      {/* Mobile fallback artist subtitle */}
                      <span className="text-xs text-white/50 truncate block md:hidden">
                        {song.artist}
                      </span>
                    </div>
                  </div>

                  {/* Artist (Desktop column) */}
                  <div className="hidden md:block truncate pr-4 text-sm text-white/60">
                    <Link
                      href={`/artist/${song.artistId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white hover:underline truncate"
                    >
                      {song.artist}
                    </Link>
                  </div>

                  {/* Album (Desktop column) */}
                  <div className="hidden lg:block truncate pr-4 text-sm text-white/70">
                    <Link
                      href={`/album/${song.albumId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white hover:underline truncate"
                    >
                      {song.album}
                    </Link>
                  </div>

                  {/* Duration + More menu */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongStar(song);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-opacity ${
                        starredSongs.has(song.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 text-white/50 hover:text-white'
                      }`}
                      title={starredSongs.has(song.id) ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${starredSongs.has(song.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white/50'}`}
                      />
                    </button>

                    <span className="text-xs text-white/60 font-mono tracking-tight">
                      {formatDuration(song.duration)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-opacity ${
                            isHovered || playing ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayClick(song);
                          }}
                          className="cursor-pointer"
                        >
                          <Play className="w-4 h-4 mr-2" /> Play
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSongStar(song);
                          }}
                          className="cursor-pointer"
                        >
                          <Star className="w-4 h-4 mr-2" /> {starredSongs.has(song.id) ? 'Starred' : 'Star'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Flat horizontal separator between rows */}
                  <div className="absolute bottom-0 left-4 right-4 h-px bg-white/[0.05] pointer-events-none group-last:hidden" />
                </div>
              );
            })}
          </div>

          {/* Footer Metadata */}
          <div className="mt-10 pt-6 border-t border-white/[0.07] text-xs text-white/50 space-y-1 pb-16 font-normal">
            <p>{playlist.songCount} songs, {formatDuration(playlist.duration || 0, 'human')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
