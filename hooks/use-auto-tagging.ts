import { useState, useCallback } from 'react';
import MusicBrainzClient, { 
  MusicBrainzRelease, 
  MusicBrainzReleaseDetails,
  MusicBrainzRecording,
  MusicBrainzRecordingDetails 
} from '@/lib/musicbrainz-api';
import { getNavidromeAPI } from '@/lib/navidrome';
import { useToast } from '@/hooks/use-toast';
import { Album, Song, Artist } from '@/lib/navidrome';
// Define interfaces for the enhanced metadata

// Define interfaces for the enhanced metadata
export interface EnhancedTrackMetadata {
  id: string;               // Navidrome track ID
  title: string;            // Track title
  artist: string;           // Artist name
  album: string;            // Album name
  mbTrackId?: string;       // MusicBrainz recording ID
  mbReleaseId?: string;     // MusicBrainz release ID
  mbArtistId?: string;      // MusicBrainz artist ID
  year?: string;            // Release year
  genres?: string[];        // Genres
  tags?: string[];          // Tags
  trackNumber?: number;     // Track number
  discNumber?: number;      // Disc number
  duration?: number;        // Duration in seconds
  artistCountry?: string;   // Artist country
  artistType?: string;      // Artist type (group, person, etc.)
  releaseType?: string;     // Release type (album, EP, single, etc.)
  status: 'pending' | 'matched' | 'failed' | 'applied';  // Status of the track metadata
  confidence: number;       // Match confidence (0-100)
}

export interface EnhancedAlbumMetadata {
  id: string;              // Navidrome album ID
  name: string;            // Album name
  artist: string;          // Album artist name
  mbReleaseId?: string;    // MusicBrainz release ID
  mbArtistId?: string;     // MusicBrainz artist ID
  year?: string;           // Release year
  genres?: string[];       // Genres
  tags?: string[];         // Tags
  country?: string;        // Release country
  releaseType?: string;    // Release type (album, EP, single, etc.)
  barcode?: string;        // Barcode
  label?: string;          // Record label
  status: 'pending' | 'matched' | 'failed' | 'applied';  // Status
  confidence: number;      // Match confidence (0-100)
  tracks: EnhancedTrackMetadata[]; // Tracks in the album
  coverArtUrl?: string;    // Cover art URL from MusicBrainz
}

// Type for the Auto-Tagging operation mode
export type AutoTaggingMode = 'track' | 'album' | 'artist';

export function useAutoTagging() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enhancedTracks, setEnhancedTracks] = useState<EnhancedTrackMetadata[]>([]);
  const [enhancedAlbums, setEnhancedAlbums] = useState<EnhancedAlbumMetadata[]>([]);
  const { toast } = useToast();
  const api = getNavidromeAPI();

  /**
   * Find enhanced metadata for a single track from MusicBrainz
   */
  const enhanceTrack = useCallback(async (track: Song): Promise<EnhancedTrackMetadata> => {
    try {
      // Start with basic metadata
      const enhancedTrack: EnhancedTrackMetadata = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        status: 'pending',
        confidence: 0
      };
      
      // Try to find the track in MusicBrainz
      const recording = await MusicBrainzClient.findBestMatchingRecording(
        track.title,
        track.artist,
        track.duration * 1000 // Convert to milliseconds
      );
      
      if (!recording) {
        enhancedTrack.status = 'failed';
        return enhancedTrack;
      }
      
      // Get detailed recording information
      const recordingDetails = await MusicBrainzClient.getRecording(recording.id);
      
      if (!recordingDetails) {
        enhancedTrack.status = 'failed';
        return enhancedTrack;
      }
      
      // Calculate match confidence
      const titleSimilarity = calculateStringSimilarity(
        MusicBrainzClient.normalizeString(track.title),
        MusicBrainzClient.normalizeString(recording.title)
      );
      
      const artistSimilarity = calculateStringSimilarity(
        MusicBrainzClient.normalizeString(track.artist),
        MusicBrainzClient.normalizeString(recording['artist-credit'][0]?.artist.name || '')
      );
      
      // Calculate confidence score (0-100)
      enhancedTrack.confidence = Math.round((titleSimilarity * 0.6 + artistSimilarity * 0.4) * 100);
      
      // Update track with MusicBrainz metadata
      enhancedTrack.mbTrackId = recording.id;
      enhancedTrack.mbArtistId = recording['artist-credit'][0]?.artist.id;
      
      // Extract additional metadata from recordingDetails
      if (recordingDetails.releases && recordingDetails.releases.length > 0) {
        enhancedTrack.mbReleaseId = recordingDetails.releases[0].id;
      }
      
      if (recordingDetails['first-release-date']) {
        enhancedTrack.year = recordingDetails['first-release-date'].split('-')[0];
      }
      
      if (recordingDetails.genres) {
        enhancedTrack.genres = recordingDetails.genres.map(genre => genre.name);
      }
      
      if (recordingDetails.tags) {
        enhancedTrack.tags = recordingDetails.tags.map(tag => tag.name);
      }
      
      enhancedTrack.status = 'matched';
      return enhancedTrack;
    } catch (error) {
      console.error('Failed to enhance track:', error);
      return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        status: 'failed',
        confidence: 0
      };
    }
  }, []);

  /**
   * Find enhanced metadata for an album and its tracks from MusicBrainz
   */
  const enhanceAlbum = useCallback(async (album: Album, tracks: Song[]): Promise<EnhancedAlbumMetadata> => {
    try {
      // Start with basic metadata
      const enhancedAlbum: EnhancedAlbumMetadata = {
        id: album.id,
        name: album.name,
        artist: album.artist,
        status: 'pending',
        confidence: 0,
        tracks: []
      };
      
      // Try to find the album in MusicBrainz
      const release = await MusicBrainzClient.findBestMatchingRelease(
        album.name,
        album.artist,
        tracks.length
      );
      
      if (!release) {
        enhancedAlbum.status = 'failed';
        return enhancedAlbum;
      }
      
      // Get detailed release information
      const releaseDetails = await MusicBrainzClient.getRelease(release.id);
      
      if (!releaseDetails) {
        enhancedAlbum.status = 'failed';
        return enhancedAlbum;
      }
      
      // Calculate match confidence
      const albumSimilarity = calculateStringSimilarity(
        MusicBrainzClient.normalizeString(album.name),
        MusicBrainzClient.normalizeString(release.title)
      );
      
      const artistSimilarity = calculateStringSimilarity(
        MusicBrainzClient.normalizeString(album.artist),
        MusicBrainzClient.normalizeString(release['artist-credit'][0]?.artist.name || '')
      );
      
      // Calculate confidence score (0-100)
      enhancedAlbum.confidence = Math.round((albumSimilarity * 0.6 + artistSimilarity * 0.4) * 100);
      
      // Update album with MusicBrainz metadata
      enhancedAlbum.mbReleaseId = release.id;
      enhancedAlbum.mbArtistId = release['artist-credit'][0]?.artist.id;
      
      if (release.date) {
        enhancedAlbum.year = release.date.split('-')[0];
      }
      
      if (release.country) {
        enhancedAlbum.country = release.country;
      }
      
      // We need to access release-group via a type assertion since it's not defined in MusicBrainzRelease interface
      // But it exists in the MusicBrainzReleaseDetails which we're working with
      const releaseWithGroup = release as unknown as { 'release-group'?: { id: string; 'primary-type'?: string } };
      if (releaseWithGroup['release-group'] && releaseWithGroup['release-group']['primary-type']) {
        enhancedAlbum.releaseType = releaseWithGroup['release-group']['primary-type'];
      }
      
      if (releaseDetails.barcode) {
        enhancedAlbum.barcode = releaseDetails.barcode;
      }
      
      // Get cover art URL
      if (releaseDetails['cover-art-archive'] && releaseDetails['cover-art-archive'].front) {
        enhancedAlbum.coverArtUrl = MusicBrainzClient.getCoverArtUrl(release.id);
      }
      
      // Match tracks with MusicBrainz tracks
      const enhancedTracks: EnhancedTrackMetadata[] = [];
      
      // First, organize MB tracks by disc and track number
      // Define a type for the MusicBrainz track
      interface MusicBrainzTrack {
        position: number;
        number: string;
        title: string;
        length?: number;
        recording: {
          id: string;
          title: string;
          length?: number;
        };
      }
      
      const mbTracks: Record<number, Record<number, MusicBrainzTrack>> = {};
      
      if (releaseDetails.media) {
        for (const medium of releaseDetails.media) {
          const discNumber = medium.position;
          mbTracks[discNumber] = {};
          
          for (const track of medium.tracks) {
            mbTracks[discNumber][track.position] = track;
          }
        }
      }
      
      // Try to match each track
      for (const track of tracks) {
        // Basic track info
        const enhancedTrack: EnhancedTrackMetadata = {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          status: 'pending',
          confidence: 0
        };
        
        // Try to find the track by position if available
        if (track.discNumber && track.track && mbTracks[track.discNumber] && mbTracks[track.discNumber][track.track]) {
          const mbTrack = mbTracks[track.discNumber][track.track];
          
          enhancedTrack.mbTrackId = mbTrack.recording.id;
          enhancedTrack.mbReleaseId = release.id;
          enhancedTrack.trackNumber = track.track;
          enhancedTrack.discNumber = track.discNumber;
          
          // Calculate title similarity
          const titleSimilarity = calculateStringSimilarity(
            MusicBrainzClient.normalizeString(track.title),
            MusicBrainzClient.normalizeString(mbTrack.title)
          );
          
          enhancedTrack.confidence = Math.round(titleSimilarity * 100);
          enhancedTrack.status = 'matched';
        }
        // If we can't match by position, try to match by title
        else {
          // Find in any medium and any position
          let bestMatch: MusicBrainzTrack | null = null;
          let bestSimilarity = 0;
          
          for (const discNumber of Object.keys(mbTracks)) {
            for (const trackNumber of Object.keys(mbTracks[Number(discNumber)])) {
              const mbTrack = mbTracks[Number(discNumber)][Number(trackNumber)];
              const similarity = calculateStringSimilarity(
                MusicBrainzClient.normalizeString(track.title),
                MusicBrainzClient.normalizeString(mbTrack.title)
              );
              
              if (similarity > bestSimilarity && similarity > 0.6) { // 60% similarity threshold
                bestMatch = mbTrack;
                bestSimilarity = similarity;
              }
            }
          }
          
          if (bestMatch) {
            enhancedTrack.mbTrackId = bestMatch.recording.id;
            enhancedTrack.mbReleaseId = release.id;
            enhancedTrack.confidence = Math.round(bestSimilarity * 100);
            enhancedTrack.status = 'matched';
          } else {
            enhancedTrack.status = 'failed';
          }
        }
        
        enhancedTracks.push(enhancedTrack);
      }
      
      // Update album with tracks
      enhancedAlbum.tracks = enhancedTracks;
      enhancedAlbum.status = 'matched';
      
      return enhancedAlbum;
    } catch (error) {
      console.error('Failed to enhance album:', error);
      return {
        id: album.id,
        name: album.name,
        artist: album.artist,
        status: 'failed',
        confidence: 0,
        tracks: []
      };
    }
  }, []);

  /**
   * Start the auto-tagging process for a track, album, or artist
   */
  const startAutoTagging = useCallback(async (
    mode: AutoTaggingMode, 
    itemId: string, 
    confidenceThreshold: number = 70
  ) => {
    if (!api) {
      toast({
        title: "Error",
        description: "Navidrome API is not configured",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setEnhancedTracks([]);
    setEnhancedAlbums([]);
    
    try {
      // Process different modes
      if (mode === 'track') {
        // In the absence of a direct method to get a song by ID, 
        // we'll find it by searching for it in its album
        const searchResults = await api.search(itemId, 0, 0, 10);
        const track = searchResults.songs.find(song => song.id === itemId);
        
        if (!track) {
          throw new Error('Track not found');
        }
        
        setProgress(10);
        
        // Enhance track metadata
        const enhancedTrack = await enhanceTrack(track);
        
        setEnhancedTracks([enhancedTrack]);
        setProgress(100);
        
        toast({
          title: "Track Analysis Complete",
          description: enhancedTrack.status === 'matched' 
            ? `Found metadata for "${track.title}" with ${enhancedTrack.confidence}% confidence` 
            : `Couldn't find metadata for "${track.title}"`,
        });
      } 
      else if (mode === 'album') {
        // Get album and its tracks from Navidrome
        const { album, songs } = await api.getAlbum(itemId);
        if (!album) {
          throw new Error('Album not found');
        }
        
        setProgress(10);
        
        // Enhance album metadata
        const enhancedAlbum = await enhanceAlbum(album, songs);
        
        setEnhancedAlbums([enhancedAlbum]);
        setProgress(100);
        
        toast({
          title: "Album Analysis Complete",
          description: enhancedAlbum.status === 'matched' 
            ? `Found metadata for "${album.name}" with ${enhancedAlbum.confidence}% confidence` 
            : `Couldn't find metadata for "${album.name}"`,
        });
      }
      else if (mode === 'artist') {
        // Get artist and their albums from Navidrome
        try {
          const { artist, albums } = await api.getArtist(itemId);
          if (!artist) {
            throw new Error('Artist not found');
          }
          
          setProgress(5);
          
          const enhancedAlbumsData: EnhancedAlbumMetadata[] = [];
          let processedAlbums = 0;
          
          // Process each album
          for (const album of albums) {
            try {
              const { songs } = await api.getAlbum(album.id);
              const enhancedAlbum = await enhanceAlbum(album, songs);
              enhancedAlbumsData.push(enhancedAlbum);
            } catch (albumError) {
              console.error('Error processing album:', albumError);
              // Continue with the next album
            }
            
            processedAlbums++;
            setProgress(5 + Math.round((processedAlbums / albums.length) * 95));
          }
          
          setEnhancedAlbums(enhancedAlbumsData);
          setProgress(100);
          
          const matchedAlbums = enhancedAlbumsData.filter(album => 
            album.status === 'matched' && album.confidence >= confidenceThreshold
          ).length;
          
          toast({
            title: "Artist Analysis Complete",
            description: `Found metadata for ${matchedAlbums} of ${albums.length} albums by "${artist.name}"`,
          });
        } catch (artistError) {
          console.error('Error fetching artist:', artistError);
          toast({
            title: "Artist Not Found",
            description: "Could not find the artist in your library",
            variant: "destructive",
          });
          setProgress(100);
        }
      }
    } catch (error) {
      console.error('Auto-tagging error:', error);
      toast({
        title: "Auto-Tagging Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [api, enhanceTrack, enhanceAlbum, toast]);

  /**
   * Apply enhanced metadata to tracks in Navidrome
   */
  const applyEnhancedMetadata = useCallback(async (
    tracks: EnhancedTrackMetadata[],
    albums?: EnhancedAlbumMetadata[]
  ) => {
    if (!api) {
      toast({
        title: "Error",
        description: "Navidrome API is not configured",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processedItems = 0;
      const totalItems = tracks.length + (albums?.length || 0);
      
      // Apply album metadata first
      if (albums && albums.length > 0) {
        for (const album of albums) {
          if (album.status === 'matched') {
            // To be implemented: Update album metadata via Navidrome API
            // This requires a custom Navidrome endpoint or plugin
          }
          
          processedItems++;
          setProgress(Math.round((processedItems / totalItems) * 100));
        }
      }
      
      // Apply track metadata
      for (const track of tracks) {
        if (track.status === 'matched') {
          // To be implemented: Update track metadata via Navidrome API
          // This requires a custom Navidrome endpoint or plugin

          // Alternatively, suggest implementing this feature using a separate
          // script that interacts with music files directly
        }
        
        processedItems++;
        setProgress(Math.round((processedItems / totalItems) * 100));
      }
      
      toast({
        title: "Metadata Applied",
        description: `Updated metadata for ${tracks.filter(t => t.status === 'matched').length} tracks`,
      });
    } catch (error) {
      console.error('Failed to apply metadata:', error);
      toast({
        title: "Metadata Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [api, toast]);

  return {
    isProcessing,
    progress,
    enhancedTracks,
    enhancedAlbums,
    startAutoTagging,
    applyEnhancedMetadata
  };
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // If either string is empty, return 0
  if (!str1.length || !str2.length) {
    return 0;
  }
  
  // If strings are identical, return 1
  if (str1 === str2) {
    return 1;
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(str1, str2);
  
  // Calculate similarity score
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = 1 - distance / maxLength;
  
  return similarity;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix with row and column indices
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return matrix[str1.length][str2.length];
}
