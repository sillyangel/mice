    'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { getNavidromeAPI, RadioStation } from '@/lib/navidrome';
import { FaWifi, FaPlay, FaPlus, FaTrash } from 'react-icons/fa6';

const RadioStationsPage = () => {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStation, setNewStation] = useState({
    name: '',
    streamUrl: '',
    homePageUrl: ''
  });
  const { toast } = useToast();
  const { playTrack } = useAudioPlayer();
  const loadRadioStations = useCallback(async () => {
    setIsLoading(true);
    try {
      const api = getNavidromeAPI();
      if (!api) {
        throw new Error('Navidrome API not available');
      }
      const stationList = await api.getInternetRadioStations();
      setStations(stationList);
    } catch (error) {
      console.error('Failed to load radio stations:', error);
      toast({
        title: "Error",
        description: "Failed to load radio stations. Please check your Navidrome connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRadioStations();
  }, [loadRadioStations]);

  const addRadioStation = async () => {
    if (!newStation.name || !newStation.streamUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and stream URL.",
        variant: "destructive"
      });
      return;
    }    try {
      const api = getNavidromeAPI();
      if (!api) {
        throw new Error('Navidrome API not available');
      }
      await api.createInternetRadioStation(
        newStation.name,
        newStation.streamUrl,
        newStation.homePageUrl || undefined
      );
      
      toast({
        title: "Success",
        description: "Radio station added successfully.",
      });
      
      setNewStation({ name: '', streamUrl: '', homePageUrl: '' });
      setIsAddDialogOpen(false);
      await loadRadioStations();
    } catch (error) {
      console.error('Failed to add radio station:', error);
      toast({
        title: "Error",
        description: "Failed to add radio station.",
        variant: "destructive"
      });
    }
  };

  const deleteRadioStation = async (stationId: string) => {    try {
      const api = getNavidromeAPI();
      if (!api) {
        throw new Error('Navidrome API not available');
      }
      await api.deleteInternetRadioStation(stationId);
      
      toast({
        title: "Success",
        description: "Radio station deleted successfully.",
      });
      
      await loadRadioStations();
    } catch (error) {
      console.error('Failed to delete radio station:', error);
      toast({
        title: "Error",
        description: "Failed to delete radio station.",
        variant: "destructive"
      });
    }
  };

  const playRadioStation = (station: RadioStation) => {
    const radioTrack = {
      id: `radio-${station.id}`,
      name: station.name,
      url: station.streamUrl,
      artist: 'Internet Radio',
      album: 'Live Stream',
      duration: 0, // Radio streams don't have duration
      albumId: '',
      artistId: ''
    };

    playTrack(radioTrack);
    toast({
      title: "Playing Radio",
      description: `Now playing: ${station.name}`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">Loading radio stations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pb-24 max-w-none">
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Radio Stations</h1>
            <p className="text-muted-foreground text-sm">
              Listen to internet radio stations.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FaPlus className="w-4 h-4 mr-2" />
                Add Station
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Radio Station</DialogTitle>
                <DialogDescription>
                  Add a new internet radio station to your collection.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="station-name">Station Name</Label>
                  <Input
                    id="station-name"
                    placeholder="e.g., Jazz FM"
                    value={newStation.name}
                    onChange={(e) => setNewStation(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stream-url">Stream URL</Label>
                  <Input
                    id="stream-url"
                    placeholder="https://stream.example.com/jazz"
                    value={newStation.streamUrl}
                    onChange={(e) => setNewStation(prev => ({ ...prev, streamUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepage-url">Homepage URL (optional)</Label>
                  <Input
                    id="homepage-url"
                    placeholder="https://www.jazzfm.com"
                    value={newStation.homePageUrl}
                    onChange={(e) => setNewStation(prev => ({ ...prev, homePageUrl: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={addRadioStation}>Add Station</Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {stations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FaWifi className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Radio Stations</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven&apos;t added any radio stations yet. Click the &quot;Add Station&quot; button to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((station) => (
              <Card key={station.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FaWifi className="w-5 h-5" />
                    {station.name}
                  </CardTitle>
                  {station.homePageUrl && (
                    <CardDescription>
                      <a 
                        href={station.homePageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => playRadioStation(station)}
                      className="flex-1"
                    >
                      <FaPlay className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => deleteRadioStation(station.id)}
                    >
                      <FaTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RadioStationsPage;
