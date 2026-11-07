'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAudioPlayer } from "./AudioPlayerContext";
import { presets } from "@/lib/audio-effects";

interface AudioSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioSettingsDialog({ isOpen, onClose }: AudioSettingsDialogProps) {
  const { 
    audioSettings,
    updateAudioSettings,
    equalizerPreset,
    setEqualizerPreset,
  } = useAudioPlayer();

  const handleCrossfadeChange = (value: number[]) => {
    updateAudioSettings({ crossfadeDuration: value[0] });
  };

  const handleReplayGainToggle = (enabled: boolean) => {
    updateAudioSettings({ replayGainEnabled: enabled });
  };

  const handleGaplessToggle = (enabled: boolean) => {
    updateAudioSettings({ gaplessPlayback: enabled });
  };

  const handleEqualizerPresetChange = (preset: string) => {
    setEqualizerPreset(preset);
    updateAudioSettings({ equalizer: preset });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Audio Settings</DialogTitle>
          <DialogDescription>
            Configure playback settings and audio effects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Crossfade */}
          <div className="space-y-2">
            <Label>Crossfade Duration ({audioSettings.crossfadeDuration}s)</Label>
            <Slider
              value={[audioSettings.crossfadeDuration]}
              onValueChange={handleCrossfadeChange}
              min={0}
              max={5}
              step={0.5}
            />
          </div>

          {/* Lyrics Sync Offset */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Lyrics Sync Offset ({Math.round((audioSettings.lyricsOffset ?? 0.22) * 1000)}ms)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                onClick={() => updateAudioSettings({ lyricsOffset: 0.22 })}
              >
                Reset (220ms)
              </Button>
            </div>
            <Slider
              value={[audioSettings.lyricsOffset ?? 0.22]}
              onValueChange={([val]) => updateAudioSettings({ lyricsOffset: val })}
              min={-0.3}
              max={0.8}
              step={0.02}
            />
            <p className="text-xs text-muted-foreground">
              Advances or delays lyrics to sync with vocal attacks and compensate for audio output latency.
            </p>
          </div>

          {/* ReplayGain */}
          <div className="flex items-center justify-between">
            <Label>ReplayGain</Label>
            <Switch
              checked={audioSettings.replayGainEnabled}
              onCheckedChange={handleReplayGainToggle}
            />
          </div>

          {/* Gapless Playback */}
          <div className="flex items-center justify-between">
            <Label>Gapless Playback</Label>
            <Switch
              checked={audioSettings.gaplessPlayback}
              onCheckedChange={handleGaplessToggle}
            />
          </div>

          {/* Equalizer Presets */}
          <div className="space-y-2">
            <Label>Equalizer Preset</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(presets).map((preset) => (
                <Button
                  key={preset}
                  variant={preset === equalizerPreset ? "default" : "outline"}
                  onClick={() => handleEqualizerPresetChange(preset)}
                  className="w-full"
                >
                  {presets[preset].name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
