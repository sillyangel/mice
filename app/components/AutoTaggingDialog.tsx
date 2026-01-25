'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAutoTagging, EnhancedTrackMetadata, EnhancedAlbumMetadata } from "@/hooks/use-auto-tagging";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MusicIcon, 
  AlbumIcon, 
  UsersIcon, 
  CheckCircle2Icon, 
  XCircleIcon, 
  AlertTriangleIcon, 
  InfoIcon 
} from 'lucide-react';
import Image from 'next/image';

interface AutoTaggingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'track' | 'album' | 'artist';
  itemId: string;
  itemName: string;
  artistName?: string;
}

export const AutoTaggingDialog: React.FC<AutoTaggingDialogProps> = ({
  isOpen,
  onClose,
  mode,
  itemId,
  itemName,
  artistName
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks');
  const [isApplying, setIsApplying] = useState(false);
  const {
    isProcessing,
    progress,
    enhancedTracks,
    enhancedAlbums,
    startAutoTagging,
    applyEnhancedMetadata
  } = useAutoTagging();

  // Start auto-tagging when the dialog is opened
  useEffect(() => {
    if (isOpen && itemId && !isProcessing && progress === 0) {
      // Wrap in try/catch to handle any errors that might occur during auto-tagging
      try {
        startAutoTagging(mode, itemId, confidenceThreshold);
      } catch (error) {
        console.error('Failed to start auto-tagging:', error);
        toast({
          title: "Auto-Tagging Error",
          description: error instanceof Error ? error.message : "Failed to start auto-tagging",
          variant: "destructive",
        });
        onClose();
      }
    }
  }, [isOpen, itemId, mode, isProcessing, progress, startAutoTagging, confidenceThreshold, toast, onClose]);

  // Set the active tab based on the mode
  useEffect(() => {
    if (mode === 'track') {
      setActiveTab('tracks');
    } else if (mode === 'album' || mode === 'artist') {
      setActiveTab('albums');
    }
  }, [mode]);

  const handleApplyMetadata = async () => {
    try {
      setIsApplying(true);
      await applyEnhancedMetadata(
        enhancedTracks.filter(track => track.status === 'matched' && track.confidence >= confidenceThreshold),
        enhancedAlbums.filter(album => album.status === 'matched' && album.confidence >= confidenceThreshold)
      );
      onClose();
    } catch (error) {
      console.error('Failed to apply metadata:', error);
      toast({
        title: "Error",
        description: "Failed to apply metadata",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Get match statistics
  const matchedTracks = enhancedTracks.filter(track => track.status === 'matched' && track.confidence >= confidenceThreshold).length;
  const totalTracks = enhancedTracks.length;
  const matchedAlbums = enhancedAlbums.filter(album => album.status === 'matched' && album.confidence >= confidenceThreshold).length;
  const totalAlbums = enhancedAlbums.length;

  const getStatusIcon = (status: 'pending' | 'matched' | 'failed' | 'applied', confidence: number) => {
    if (status === 'pending') return <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />;
    if (status === 'failed') return <XCircleIcon className="w-4 h-4 text-red-500" />;
    if (status === 'matched' && confidence >= confidenceThreshold) return <CheckCircle2Icon className="w-4 h-4 text-green-500" />;
    if (status === 'matched' && confidence < confidenceThreshold) return <InfoIcon className="w-4 h-4 text-yellow-500" />;
    if (status === 'applied') return <CheckCircle2Icon className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500';
    if (confidence >= 70) return 'bg-green-400';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Render the appropriate dialog/sheet based on mobile status
  const DialogComponent = isMobile ? Sheet : Dialog;
  const DialogContentComponent = isMobile ? SheetContent : DialogContent;
  const DialogHeaderComponent = isMobile ? SheetHeader : DialogHeader;
  const DialogTitleComponent = isMobile ? SheetTitle : DialogTitle;
  const DialogDescriptionComponent = isMobile ? SheetDescription : DialogDescription;

  return (
    <DialogComponent open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContentComponent className={isMobile ? "p-0 pt-8" : "max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"}>
        <DialogHeaderComponent className={isMobile ? "p-6 pb-2" : ""}>
          <DialogTitleComponent>
            Auto-Tagging {mode === 'track' ? 'Track' : mode === 'album' ? 'Album' : 'Artist'}
          </DialogTitleComponent>
          <DialogDescriptionComponent>
            {isProcessing ? (
              `Analyzing ${mode === 'track' ? 'track' : mode === 'album' ? 'album' : 'artist'} "${itemName}"`
            ) : (
              `Found metadata for ${matchedTracks} of ${totalTracks} tracks${totalAlbums > 0 ? ` and ${matchedAlbums} of ${totalAlbums} albums` : ''}`
            )}
          </DialogDescriptionComponent>

          {/* Progress bar */}
          {(isProcessing || isApplying) && (
            <div className="my-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {isProcessing ? 'Analyzing metadata...' : 'Applying metadata...'}
              </p>
            </div>
          )}
        </DialogHeaderComponent>

        {/* Tabs for tracks and albums */}
        {!isProcessing && !isApplying && (
          <div className={`flex-1 overflow-hidden flex flex-col ${isMobile ? "px-6" : ""}`}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tracks' | 'albums')} className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <TabsList>
                  <TabsTrigger value="tracks" disabled={totalTracks === 0}>
                    <MusicIcon className="w-4 h-4 mr-2" /> Tracks ({matchedTracks}/{totalTracks})
                  </TabsTrigger>
                  <TabsTrigger value="albums" disabled={totalAlbums === 0}>
                    <AlbumIcon className="w-4 h-4 mr-2" /> Albums ({matchedAlbums}/{totalAlbums})
                  </TabsTrigger>
                </TabsList>

                {/* Confidence threshold slider */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Min. Confidence: {confidenceThreshold}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Tracks tab content */}
              <TabsContent value="tracks" className="flex-1 overflow-auto data-[state=active]:flex flex-col">
                <div className="rounded-md border">
                  <div className="bg-muted p-2 grid grid-cols-12 gap-2 text-sm font-medium">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Title</div>
                    <div className="col-span-3">Artist</div>
                    <div className="col-span-2">Album</div>
                    <div className="col-span-2 text-right">Confidence</div>
                  </div>
                  <div className="divide-y max-h-[50vh] overflow-auto">
                    {enhancedTracks.map(track => (
                      <div key={track.id} className="grid grid-cols-12 gap-2 p-2 items-center">
                        <div className="col-span-1">
                          {getStatusIcon(track.status, track.confidence)}
                        </div>
                        <div className="col-span-4 truncate">
                          {track.title}
                        </div>
                        <div className="col-span-3 truncate">
                          {track.artist}
                        </div>
                        <div className="col-span-2 truncate">
                          {track.album}
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-2">
                          <div className="h-2 w-10 rounded-full bg-gray-200">
                            <div 
                              className={`h-full rounded-full ${getConfidenceColor(track.confidence)}`} 
                              style={{ width: `${track.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs">{track.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Albums tab content */}
              <TabsContent value="albums" className="flex-1 overflow-auto data-[state=active]:flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-auto p-1">
                  {enhancedAlbums.map(album => (
                    <div key={album.id} className="border rounded-lg overflow-hidden">
                      <div className="flex">
                        {/* Album cover */}
                        <div className="relative w-24 h-24">
                          {album.coverArtUrl ? (
                            <Image
                              src={album.coverArtUrl}
                              alt={album.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <AlbumIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {/* Status badge */}
                          <div className="absolute top-1 left-1">
                            {getStatusIcon(album.status, album.confidence)}
                          </div>
                        </div>
                        {/* Album info */}
                        <div className="flex-1 p-3">
                          <h4 className="font-medium text-sm truncate">{album.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 w-10 rounded-full bg-gray-200">
                              <div 
                                className={`h-full rounded-full ${getConfidenceColor(album.confidence)}`} 
                                style={{ width: `${album.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs">{album.confidence}%</span>
                          </div>
                          {album.year && (
                            <p className="text-xs mt-1">Year: {album.year}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className={`${isMobile ? "p-6 pt-4" : "mt-4"}`}>
          <div className="w-full flex flex-col md:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing || isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyMetadata}
              disabled={
                isProcessing || 
                isApplying || 
                (matchedTracks === 0 && matchedAlbums === 0)
              }
            >
              Apply Metadata
            </Button>
          </div>
        </DialogFooter>
      </DialogContentComponent>
    </DialogComponent>
  );
};

export default AutoTaggingDialog;
