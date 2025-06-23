'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";

interface AudioSettingsProps {
  crossfadeDuration: number;
  setCrossfadeDuration: (duration: number) => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  crossfadeDuration,
  setCrossfadeDuration
}) => {
  const { cacheStatus, clearCache } = useAudioPlayer();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audio Settings</CardTitle>
          <CardDescription>
            Configure audio playback settings including crossfade and caching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Crossfade Settings */}
          <div className="space-y-3">
            <Label>Crossfade Duration: {crossfadeDuration}s</Label>
            <Slider
              value={[crossfadeDuration]}
              onValueChange={(value) => setCrossfadeDuration(value[0])}
              max={10}
              min={0}
              step={0.5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Smooth transition time between tracks (0 = disabled, up to 10 seconds)
            </p>
          </div>

          {/* Cache Settings */}
          <div className="space-y-3">
            <Label>Audio Cache</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Cache Status</p>
                <p className="text-sm text-muted-foreground">
                  {cacheStatus.size} / {cacheStatus.maxSize} tracks cached
                </p>
              </div>
              <Button variant="outline" onClick={clearCache}>
                Clear Cache
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Cached audio files enable instant playback and gapless transitions. 
              The cache automatically manages itself, keeping recently played and upcoming tracks.
            </p>
          </div>

          {/* Audio Quality Settings */}
          <div className="space-y-3">
            <Label>Audio Quality</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Audio quality is determined by your Navidrome server settings. 
                Higher quality streams will use more bandwidth and cache space.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gapless Playback</CardTitle>
          <CardDescription>
            Advanced audio features for seamless listening
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Gapless playback enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Automatic preloading enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Smart cache management enabled</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              These features work together to provide the best possible listening experience 
              with minimal interruption between tracks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
