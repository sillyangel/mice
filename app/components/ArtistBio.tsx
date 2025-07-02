'use client';
import { useState, useEffect } from 'react';
import { lastFmAPI } from '@/lib/lastfm-api';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface ArtistBioProps {
  artistName: string;
}

export function ArtistBio({ artistName }: ArtistBioProps) {
  const [bio, setBio] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastFmUrl, setLastFmUrl] = useState<string>('');

  useEffect(() => {
    const fetchArtistInfo = async () => {
      if (!lastFmAPI.isAvailable()) return;
      
      setLoading(true);
      try {
        const artistInfo = await lastFmAPI.getArtistInfo(artistName);
        if (artistInfo?.bio?.summary) {
          // Clean up the bio text (remove HTML tags and Last.fm links)
          let cleanBio = artistInfo.bio.summary
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          // Remove the "Read more on Last.fm" part
          cleanBio = cleanBio.replace(/Read more on Last\.fm.*$/i, '').trim();
          
          setBio(cleanBio);
          setLastFmUrl(`https://www.last.fm/music/${encodeURIComponent(artistName)}`);
        }
      } catch (error) {
        console.error('Failed to fetch artist bio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistInfo();
  }, [artistName]);

  if (!lastFmAPI.isAvailable() || loading || !bio) {
    return null;
  }

  const shouldTruncate = bio.length > 300;
  const displayBio = shouldTruncate && !expanded ? bio.substring(0, 300) + '...' : bio;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">About</h2>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {displayBio}
        </p>
        
        <div className="flex items-center gap-2">
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs h-7 px-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show more
                </>
              )}
            </Button>
          )}
          
          {lastFmUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs h-7 px-2"
            >
              <a 
                href={lastFmUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Last.fm
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
