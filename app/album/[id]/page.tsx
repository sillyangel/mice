'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Album, Song, AlbumInfo } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Play, Pause, Heart, Shuffle, MoreHorizontal, Plus } from 'lucide-react';
import { EqualizerBars } from '@/app/components/EqualizerBars';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import Loading from "@/app/components/loading";
import { getNavidromeAPI } from '@/lib/navidrome';
import { useFavoriteAlbums } from '@/hooks/use-favorite-albums';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [starredSongs, setStarredSongs] = useState<Set<string>>(new Set());
  const [dominantColor, setDominantColor] = useState<string>('#1a1614');
  const [isExpandedNotes, setIsExpandedNotes] = useState(false);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  const { getAlbum, getAlbumInfo2, starItem, unstarItem } = useNavidrome();
  const { playTrack, playAlbum, playAlbumFromTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { isFavoriteAlbum, toggleFavoriteAlbum } = useFavoriteAlbums();
  const isMobile = useIsMobile();
  const api = getNavidromeAPI();

  useEffect(() => {
    let isMounted = true;

    const fetchAlbumData = async () => {
      setLoading(true);
      try {
        const albumData = await getAlbum(id as string);
        if (!isMounted) return;

        setAlbum(albumData.album);
        setTracklist(albumData.songs);
        setIsStarred(!!albumData.album.starred);

        const starredSongIds = new Set(
          albumData.songs.filter(song => song.starred).map(song => song.id)
        );
        setStarredSongs(starredSongIds);

        // Fetch album editorial description/notes
        try {
          const info = await getAlbumInfo2(id as string);
          if (isMounted && info) {
            setAlbumInfo(info);
          }
        } catch {
          // Editorial info is optional
        }
      } catch (error) {
        console.error('Failed to fetch album:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchAlbumData();
    }

    return () => {
      isMounted = false;
    };
  }, [id, getAlbum, getAlbumInfo2]);

  // Extract Apple-like dominant background color from cover artwork
  useEffect(() => {
    if (!album?.coverArt || !api) return;

    const imgUrl = api.getCoverArtUrl(album.coverArt, 300);
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 64;
          canvas.height = 64;
          ctx.drawImage(img, 0, 0, 64, 64);
          const imageData = ctx.getImageData(0, 0, 64, 64);
          const data = imageData.data;
          let r = 0, g = 0, b = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            // Downweight extremely bright/white or dark pixels for rich tinting
            const pr = data[i];
            const pg = data[i + 1];
            const pb = data[i + 2];
            const brightness = (pr + pg + pb) / 3;
            if (brightness > 20 && brightness < 240) {
              r += pr;
              g += pg;
              b += pb;
              count++;
            }
          }

          if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            // Apply slight darkening/warmth for Apple Music's ambient canvas look
            const targetR = Math.max(16, Math.floor(r * 0.45));
            const targetG = Math.max(14, Math.floor(g * 0.40));
            const targetB = Math.max(14, Math.floor(b * 0.38));
            setDominantColor(`rgb(${targetR}, ${targetG}, ${targetB})`);
          }
        }
      } catch (e) {
        console.warn('Could not extract color:', e);
      }
    };

    img.src = imgUrl;
  }, [album?.coverArt, api]);

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

  const handleStar = async () => {
    if (!album) return;
    try {
      if (isStarred) {
        await unstarItem(album.id, 'album');
        setIsStarred(false);
      } else {
        await starItem(album.id, 'album');
        setIsStarred(true);
      }
    } catch (error) {
      console.error('Failed to star/unstar album:', error);
    }
  };

  const handleSongStar = async (song: Song) => {
    try {
      const isCurrentlyStarred = starredSongs.has(song.id);
      if (isCurrentlyStarred) {
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
    } catch (error) {
      console.error('Failed to star/unstar song:', error);
    }
  };

  const handlePlayClick = async (song: Song): Promise<void> => {
    if (!album) return;
    if (currentTrack?.id === song.id) {
      togglePlayPause();
      return;
    }
    try {
      await playAlbumFromTrack(album.id, song.id);
    } catch (error) {
      console.error('Failed to play album from track:', error);
    }
  };

  const handleShuffleAlbum = async (): Promise<void> => {
    if (!album || !tracklist.length) return;
    try {
      const shuffled = [...tracklist].sort(() => Math.random() - 0.5);
      await playAlbumFromTrack(album.id, shuffled[0].id);
    } catch (error) {
      console.error('Failed to shuffle album:', error);
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

  const getCoverArtUrl = (size: number = 600) => {
    return album?.coverArt && api
      ? api.getCoverArtUrl(album.coverArt, size)
      : '/default-user.jpg';
  };

  // Apple Music format: "August 9, 2024" or year
  const getFormattedReleaseDate = () => {
    if (album?.created) {
      try {
        const d = new Date(album.created);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      } catch {}
    }
    return album?.year ? String(album.year) : '';
  };

  if (loading) return <Loading />;
  if (!album) return <div className="p-8 text-center text-muted-foreground">Album not found</div>;

  return (
    <div
      className="min-h-full transition-colors duration-700 pb-36 text-[#e1deda]"
      style={{
        backgroundColor: dominantColor,
        backgroundImage: `radial-gradient(ellipse 90% 70% at 20% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 80%), linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)`
      }}
    >
      <div className="max-w-[1340px] mx-auto px-6 lg:px-12 pt-8">
        {/* Top Header Row with More Options */}
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
              <DropdownMenuItem onClick={() => playAlbum(album.id)} className="cursor-pointer">
                <Play className="w-4 h-4 mr-2" /> Play Next
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShuffleAlbum} className="cursor-pointer">
                <Shuffle className="w-4 h-4 mr-2" /> Shuffle Album
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleStar} className="cursor-pointer">
                <Heart className="w-4 h-4 mr-2" /> {isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Apple Music Hero Section */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-10 mb-10">
          {/* Album Cover Art */}
          <div className="shrink-0 group relative">
            <Image
              src={getCoverArtUrl(600)}
              alt={album.name}
              width={270}
              height={270}
              priority
              className="rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover aspect-square"
            />
          </div>

          {/* Album Metadata & Editorial Notes */}
          <div className="flex-1 min-w-0 text-center md:text-left flex flex-col justify-start">
            <h1 className="text-3xl lg:text-[40px] font-bold tracking-tight text-white leading-tight mb-1">
              {album.name}
            </h1>

            <div className="mb-2">
              <Link
                href={`/artist/${album.artistId}`}
                className="text-xl lg:text-[22px] font-semibold text-[#ff375f] hover:underline inline-block"
              >
                {album.artist.split(';').join(', ')}
              </Link>
            </div>

            <p className="text-sm text-white/60 mb-5 font-normal tracking-wide">
              {album.genre || 'Music'} {album.year ? `• ${album.year}` : ''}
            </p>

            {/* Editorial / Description Note */}
            {albumInfo?.notes ? (
              <div className="mb-6 max-w-2xl text-[14px] leading-relaxed text-white/70">
                <p className={isExpandedNotes ? '' : 'line-clamp-3'}>
                  {albumInfo.notes}
                </p>
                {albumInfo.notes.length > 180 && (
                  <button
                    onClick={() => setIsExpandedNotes(!isExpandedNotes)}
                    className="mt-1 text-xs font-semibold text-white/90 hover:text-white uppercase tracking-wider"
                  >
                    {isExpandedNotes ? 'LESS' : 'MORE'}
                  </button>
                )}
              </div>
            ) : null}

            {/* Action Buttons: (ShuffleIcon) (PlayIcon Play) (HeartIcon) */}
            <div className="flex items-center justify-center md:justify-start gap-3 mt-auto">
              {/* Shuffle button (icon only, first) */}
              <button
                onClick={handleShuffleAlbum}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/15 text-white active:scale-95 transition-all backdrop-blur-md"
                title="Shuffle Album"
                aria-label="Shuffle Album"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Play button (second) */}
              <button
                onClick={() => playAlbum(album.id)}
                className="inline-flex items-center justify-center gap-2 h-10 px-7 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-md"
              >
                <Play className="w-4 h-4 fill-black" />
                Play
              </button>

              {/* Heart button (third) to fav the album */}
              <button
                onClick={handleStar}
                className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all backdrop-blur-md ${
                  isStarred 
                    ? 'bg-[#ff375f]/20 text-[#ff375f] hover:bg-[#ff375f]/30' 
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
                title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
                aria-label={isStarred ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart className={`w-4 h-4 ${isStarred ? 'fill-[#ff375f] text-[#ff375f]' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tracklist Table */}
        <div className="mt-8">
          <div className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
            {tracklist.map((song, index) => {
              const playing = isCurrentlyPlaying(song);
              const isHovered = hoveredTrackId === song.id;
              const isSongStarred = starredSongs.has(song.id);

              return (
                <div
                  key={song.id}
                  onMouseEnter={() => setHoveredTrackId(song.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  onClick={() => handlePlayClick(song)}
                  className={`group relative flex items-center h-12 px-3 rounded-md transition-colors cursor-pointer ${
                    playing
                      ? 'bg-white/10 text-white'
                      : 'hover:bg-white/[0.06] text-white/80 hover:text-white'
                  }`}
                >
                  {/* Track Number / Play / Pause / Equalizer Button */}
                  <div className="w-8 shrink-0 flex items-center justify-start text-sm">
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
                      <span className="text-white/40 text-sm font-normal">
                        {song.track || index + 1}
                      </span>
                    )}
                  </div>

                  {/* Song Title and (if applicable) Feat Artist */}
                  <div className="flex-1 min-w-0 pr-4">
                    <span className={`text-[15px] font-normal truncate block ${
                      playing ? 'text-[#ff375f] font-medium' : 'text-white/90'
                    }`}>
                      {song.title}
                    </span>
                  </div>

                  {/* Right side: Star/Heart + Duration + Options Menu */}
                  <div className="shrink-0 flex items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongStar(song);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-opacity ${
                        isSongStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 text-white/40 hover:text-white'
                      }`}
                      title={isSongStarred ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isSongStarred ? 'fill-[#ff375f] text-[#ff375f]' : 'text-white/40'}`}
                      />
                    </button>

                    <span className="text-xs text-white/40 font-mono tracking-tight">
                      {formatDuration(song.duration)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-opacity ${
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
                          <Heart className="w-4 h-4 mr-2" /> {starredSongs.has(song.id) ? 'Favorited' : 'Favorite'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Metadata */}
          <div className="mt-10 pt-6 border-t border-white/[0.07] text-xs text-white/50 space-y-1 pb-16 font-normal">
            <p className="text-white/70">{getFormattedReleaseDate()}</p>
            <p>{album.songCount} songs, {formatDuration(album.duration, 'human')}</p>
            <p className="text-white/40">℗ {album.year || new Date().getFullYear()} {album.artist}</p>
          </div>
        </div>
      </div>
    </div>
  );
}