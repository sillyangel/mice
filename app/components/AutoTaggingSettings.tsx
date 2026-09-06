'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FaTags } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { AutoTaggingDialog } from './AutoTaggingDialog';

export const AutoTaggingSettings = () => {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [autoTaggingEnabled, setAutoTaggingEnabled] = useState(false);
  const [autoTagDialogOpen, setAutoTagDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState({
    id: '',
    name: 'Library',
    mode: 'artist' as 'track' | 'album' | 'artist'
  });
  const [autoTagOptions, setAutoTagOptions] = useState({
    rateLimit: 1000, // milliseconds between requests
    autoProcess: false,
    preferLocalMetadata: true,
    tagsToUpdate: ['title', 'artist', 'album', 'year', 'genre'],
  });

  useEffect(() => {
    setIsClient(true);
    
    // Load saved preferences from localStorage
    const savedAutoTagging = localStorage.getItem('auto-tagging-enabled');
    if (savedAutoTagging !== null) {
      setAutoTaggingEnabled(savedAutoTagging === 'true');
    }
    
    // Load saved auto-tag options
    const savedOptions = localStorage.getItem('auto-tagging-options');
    if (savedOptions !== null) {
      try {
        setAutoTagOptions(JSON.parse(savedOptions));
      } catch (error) {
        console.error('Failed to parse stored auto-tagging options:', error);
      }
    }
  }, []);

  const handleAutoTaggingToggle = (enabled: boolean) => {
    setAutoTaggingEnabled(enabled);
    if (isClient) {
      localStorage.setItem('auto-tagging-enabled', enabled.toString());
    }
    toast({
      title: enabled ? 'Auto-Tagging Enabled' : 'Auto-Tagging Disabled',
      description: enabled 
        ? 'Music will be automatically tagged with metadata from MusicBrainz' 
        : 'Auto-tagging has been disabled',
    });
  };

  const handleOptionsChange = (key: string, value: unknown) => {
    setAutoTagOptions(prev => {
      const newOptions = { ...prev, [key]: value };
      if (isClient) {
        localStorage.setItem('auto-tagging-options', JSON.stringify(newOptions));
      }
      return newOptions;
    });
  };

  const rateLimitError =
    isClient && autoTagOptions.rateLimit != null &&
    (autoTagOptions.rateLimit < 500 || autoTagOptions.rateLimit > 5000)
      ? 'Rate limit must be between 500 and 5000 ms.'
      : '';

  const handleTagSelectionChange = (tag: string, isSelected: boolean) => {
    setAutoTagOptions(prev => {
      const currentTags = [...prev.tagsToUpdate];
      const newTags = isSelected 
        ? [...currentTags, tag]
        : currentTags.filter(t => t !== tag);
      
      const newOptions = { ...prev, tagsToUpdate: newTags };
      if (isClient) {
        localStorage.setItem('auto-tagging-options', JSON.stringify(newOptions));
      }
      return newOptions;
    });
  };

  const isTagSelected = (tag: string) => {
    return autoTagOptions.tagsToUpdate.includes(tag);
  };

  return (
    <>
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaTags className="w-5 h-5" />
            Auto-Tagging
          </CardTitle>
          <CardDescription>
            Configure metadata auto-tagging with MusicBrainz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Auto-Tagging</p>
              <p className="text-sm text-muted-foreground">
                Automatically fetch and apply metadata from MusicBrainz
              </p>
            </div>
            <Switch 
              checked={autoTaggingEnabled} 
              onCheckedChange={handleAutoTaggingToggle} 
            />
          </div>

          {autoTaggingEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rate-limit">API Rate Limit (ms)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  min={500}
                  max={5000}
                  step={100}
                  value={autoTagOptions.rateLimit}
                  onChange={(e) => handleOptionsChange('rateLimit', Number(e.target.value))}
                  className={rateLimitError ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!rateLimitError}
                  aria-describedby={rateLimitError ? "rate-limit-error" : undefined}
                />
                {rateLimitError && (
                  <p id="rate-limit-error" className="text-sm text-destructive" role="alert">{rateLimitError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Time between API requests in milliseconds (min: 500ms)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto Process Results</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply best matches without confirmation
                  </p>
                </div>
                <Switch 
                  checked={autoTagOptions.autoProcess}
                  onCheckedChange={(checked) => handleOptionsChange('autoProcess', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Prefer Local Metadata</p>
                  <p className="text-sm text-muted-foreground">
                    Keep existing metadata when confidence is low
                  </p>
                </div>
                <Switch 
                  checked={autoTagOptions.preferLocalMetadata}
                  onCheckedChange={(checked) => handleOptionsChange('preferLocalMetadata', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags to Update</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['title', 'artist', 'album', 'year', 'genre', 'albumArtist', 'trackNumber', 'discNumber'].map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Switch 
                        id={`tag-${tag}`}
                        checked={isTagSelected(tag)}
                        onCheckedChange={(checked) => handleTagSelectionChange(tag, checked)}
                      />
                      <Label htmlFor={`tag-${tag}`} className="capitalize">
                        {tag === 'albumArtist' ? 'Album Artist' : 
                         tag === 'trackNumber' ? 'Track Number' :
                         tag === 'discNumber' ? 'Disc Number' : tag}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={() => {
                  // Set selected item to represent the whole library
                  setSelectedItem({
                    id: 'library',
                    name: 'Full Library',
                    mode: 'artist'
                  });
                  setAutoTagDialogOpen(true);
                }} variant="outline">
                  <FaTags className="w-4 h-4 mr-2" />
                  Open Auto-Tagging Tool
                </Button>
              </div>
            </>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Metadata is fetched from MusicBrainz when you play tracks</li>
              <li>Tags can be applied automatically or manually reviewed</li>
              <li>Right-click on tracks or albums to tag them manually</li>
              <li>MusicBrainz API has rate limits, so don&apos;t set too fast</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AutoTaggingDialog 
        isOpen={autoTagDialogOpen}
        onClose={() => setAutoTagDialogOpen(false)}
        mode={selectedItem.mode}
        itemId={selectedItem.id}
        itemName={selectedItem.name}
      />
    </>
  );
};
