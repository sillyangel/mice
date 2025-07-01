'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavidrome } from "@/app/components/NavidromeContext";
import { AlbumArtwork } from "@/app/components/album-artwork";
import { ArtistIcon } from "@/app/components/artist-icon";
import { Album, Artist, Song } from "@/lib/navidrome";
import { Heart, Music, Disc, Mic } from "lucide-react";
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";
import Image from "next/image";

const FavoritesPage = () => {
  const { api, isConnected } = useNavidrome();
  const { playTrack, addToQueue } = useAudioPlayer();
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!api || !isConnected) return;
      
      setLoading(true);
      try {
        const [albums, songs, artists] = await Promise.all([
          api.getAlbums('starred', 100),
          api.getStarred2(),
          api.getArtists()
        ]);

        setFavoriteAlbums(albums);
        
        // Filter starred songs and artists from the starred2 response
        if (songs.starred2) {
          setFavoriteSongs(songs.starred2.song || []);
          setFavoriteArtists((songs.starred2.artist || []).filter((artist: Artist) => artist.starred));
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [api, isConnected]);

  const handlePlaySong = (song: Song) => {
    playTrack({
      id: song.id,
      name: song.title,
      artist: song.artist,
      album: song.album,
      albumId: song.albumId,
      artistId: song.artistId,
      url: api?.getStreamUrl(song.id) || '',
      duration: song.duration,
      coverArt: song.coverArt ? api?.getCoverArtUrl(song.coverArt) : undefined,
    });
  };

  const handlePlayAlbum = async (album: Album) => {
    if (!api) return;
    
    try {
      const songs = await api.getAlbumSongs(album.id);
      if (songs.length > 0) {
        const tracks = songs.map((song: Song) => ({
          id: song.id,
          name: song.title,
          artist: song.artist,
          album: song.album,
          albumId: song.albumId,
          artistId: song.artistId,
          url: api.getStreamUrl(song.id),
          duration: song.duration,
          coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt) : undefined,
        }));
        
        playTrack(tracks[0]);
        tracks.slice(1).forEach((track: any) => addToQueue(track));
      }
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  };

  const toggleFavorite = async (id: string, type: 'song' | 'album' | 'artist', isStarred: boolean) => {
    if (!api) return;
    
    try {
      if (isStarred) {
        await api.unstar(id, type);
      } else {
        await api.star(id, type);
      }
      
      // Refresh favorites
      if (type === 'album') {
        const albums = await api.getAlbums('starred', 100);
        setFavoriteAlbums(albums);
      } else if (type === 'song') {
        const songs = await api.getStarred2();
        setFavoriteSongs(songs.starred2?.song || []);
      } else if (type === 'artist') {
        const songs = await api.getStarred2();
        setFavoriteArtists((songs.starred2?.artist || []).filter((artist: Artist) => artist.starred));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Please connect to your Navidrome server to view favorites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Favorites</h1>
            <p className="text-muted-foreground">Your starred albums, songs, and artists</p>
          </div>
        </div>

        <Tabs defaultValue="albums" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="albums" className="flex items-center gap-2">
              <Disc className="w-4 h-4" />
              Albums ({favoriteAlbums.length})
            </TabsTrigger>
            <TabsTrigger value="songs" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Songs ({favoriteSongs.length})
            </TabsTrigger>
            <TabsTrigger value="artists" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Artists ({favoriteArtists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="albums" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading favorite albums...</p>
              </div>
            ) : favoriteAlbums.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favorite albums yet</p>
                <p className="text-sm text-muted-foreground mt-2">Star albums to see them here</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favoriteAlbums.map((album) => (
                  <Card key={album.id} className="overflow-hidden">
                    <div className="aspect-square relative group">
                        {album.coverArt && api ? (
                            <Image
                                src={api.getCoverArtUrl(album.coverArt)}
                                alt={album.name}
                                fill
                                className="w-full h-full object-cover rounded"
                                sizes="(max-width: 768px) 100vw, 300px"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                                <Disc className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" onClick={() => handlePlayAlbum(album)}>
                                Play
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleFavorite(album.id, 'album', !!album.starred)}
                            >
                                <Heart className={`w-4 h-4 ${album.starred ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                        </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{album.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {album.songCount} songs • {Math.floor(album.duration / 60)} min
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="songs" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading favorite songs...</p>
              </div>
            ) : favoriteSongs.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favorite songs yet</p>
                <p className="text-sm text-muted-foreground mt-2">Star songs to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteSongs.map((song, index) => (
                  <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 group">
                    <div className="w-8 text-sm text-muted-foreground text-center">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 relative flex-shrink-0">
                      {song.coverArt && api ? (
                        <Image
                          src={api.getCoverArtUrl(song.coverArt)}
                          alt={song.album}
                          fill
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{song.album}</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => handlePlaySong(song)}>
                        Play
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => toggleFavorite(song.id, 'song', !!song.starred)}
                      >
                        <Heart className={`w-4 h-4 ${song.starred ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="artists" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading favorite artists...</p>
              </div>
            ) : favoriteArtists.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favorite artists yet</p>
                <p className="text-sm text-muted-foreground mt-2">Star artists to see them here</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favoriteArtists.map((artist) => (
                  <Card key={artist.id} className="overflow-hidden">
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 mx-auto mb-4">
                        <ArtistIcon artist={artist} />
                      </div>
                      <h3 className="font-semibold truncate">{artist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {artist.albumCount} albums
                      </p>
                      <div className="flex justify-center gap-2 mt-4">
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/artist/${encodeURIComponent(artist.name)}`}>
                            View
                          </a>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toggleFavorite(artist.id, 'artist', !!artist.starred)}
                        >
                          <Heart className={`w-4 h-4 ${artist.starred ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FavoritesPage;
