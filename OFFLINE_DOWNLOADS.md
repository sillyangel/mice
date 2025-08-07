# Offline Downloads Feature

This document describes the offline downloads functionality implemented in the Mice Navidrome client.

## Overview

The offline downloads feature allows users to download music for offline listening using modern web technologies including Service Workers and Cache API, with localStorage fallback for browsers without Service Worker support.

## Components

### 1. Service Worker (`/public/sw.js`)
- Handles audio, image, and API caching
- Manages download operations in the background
- Provides offline audio playback capabilities
- Implements cache-first strategy for downloaded content

### 2. Download Manager Hook (`/hooks/use-offline-downloads.ts`)
- Provides React interface for download operations
- Manages download progress and status
- Handles Service Worker communication
- Provides localStorage fallback for metadata

### 3. Cache Management Component (`/app/components/CacheManagement.tsx`)
- Enhanced to show offline download statistics
- Displays download progress during operations
- Lists downloaded content with removal options
- Shows Service Worker support status

### 4. Offline Indicator Component (`/app/components/OfflineIndicator.tsx`)
- Shows download status for albums and songs
- Provides download/remove buttons
- Displays visual indicators on album artwork

## Features

### Download Capabilities
- **Album Downloads**: Download entire albums with all tracks and artwork
- **Individual Song Downloads**: Download single tracks
- **Progress Tracking**: Real-time download progress with track-by-track updates
- **Error Handling**: Graceful handling of failed downloads with retry options

### Visual Indicators
- **Album Artwork**: Small download icon in top-right corner of downloaded albums
- **Album Pages**: Download buttons and status indicators
- **Song Lists**: Individual download indicators for tracks
- **Library View**: Visual badges showing offline availability

### Offline Storage
- **Service Worker Cache**: True offline storage for audio files and images
- **localStorage Fallback**: Metadata-only storage for limited browser support
- **Progressive Enhancement**: Works in all browsers with varying capabilities

### Cache Management
- **Storage Statistics**: Shows total offline storage usage
- **Content Management**: List and remove downloaded content
- **Cache Cleanup**: Clear expired and unnecessary cache data
- **Progress Monitoring**: Real-time download progress display

## Usage

### Downloading Content

#### From Album Page
1. Navigate to any album page
2. Click the "Download" button (desktop) or small download button (mobile)
3. Monitor progress in the cache management section
4. Downloaded albums show indicators on artwork and in lists

#### From Settings Page
1. Go to Settings → Cache & Offline Downloads
2. View current download statistics
3. Monitor active downloads
4. Manage downloaded content

### Managing Downloads

#### Viewing Downloaded Content
- Settings page shows list of all downloaded albums and songs
- Album artwork displays download indicators
- Individual songs show download status

#### Removing Downloads
- Use the "X" button next to items in the cache management list
- Use "Remove Download" button on album pages
- Clear all cache to remove everything

## Technical Implementation

### Service Worker Features
- **Audio Caching**: Streams are cached using the Subsonic API
- **Image Caching**: Album artwork and avatars cached separately
- **API Caching**: Metadata cached with network-first strategy
- **Background Downloads**: Downloads continue even when page is closed

### Browser Compatibility
- **Full Support**: Modern browsers with Service Worker support
- **Limited Support**: Older browsers get metadata-only caching
- **Progressive Enhancement**: Features gracefully degrade

### Storage Strategy
- **Audio Cache**: Large files stored in Service Worker cache
- **Image Cache**: Artwork cached separately for optimization
- **Metadata Cache**: Song/album information in localStorage
- **Size Management**: Automatic cleanup of old cached content

## Configuration

### Environment Variables
The offline downloads use existing Navidrome configuration:
- `NEXT_PUBLIC_NAVIDROME_URL`
- `NEXT_PUBLIC_NAVIDROME_USERNAME` 
- `NEXT_PUBLIC_NAVIDROME_PASSWORD`

### Cache Limits
- Default audio cache: No explicit limit (browser manages)
- Image cache: Optimized sizes based on display requirements
- Metadata: Stored in localStorage with cleanup

## Development Notes

### File Structure
```
hooks/
  use-offline-downloads.ts     # Main download hook
app/components/
  CacheManagement.tsx          # Enhanced cache UI
  OfflineIndicator.tsx         # Download status components
  album-artwork.tsx            # Updated with indicators
album/[id]/
  page.tsx                     # Enhanced with download buttons
public/
  sw.js                        # Service Worker implementation
```

### API Integration
- Uses existing Navidrome API endpoints
- Leverages Subsonic streaming URLs
- Integrates with current authentication system
- Compatible with existing cache infrastructure

## Future Enhancements

### Planned Features
- **Playlist Downloads**: Download entire playlists
- **Smart Sync**: Automatic download of favorites
- **Storage Limits**: User-configurable storage limits
- **Download Scheduling**: Queue downloads for later
- **Offline Mode Detection**: Automatic offline behavior

### Performance Optimizations
- **Compression**: Audio compression options
- **Quality Selection**: Choose download quality
- **Selective Sync**: Download only specific tracks
- **Background Sync**: Download during idle time

## Troubleshooting

### Common Issues
- **Service Worker not registering**: Check browser console
- **Downloads failing**: Verify Navidrome server connection
- **Storage full**: Clear cache or check browser storage limits
- **Slow downloads**: Check network connection and server performance

### Debug Information
- Browser Developer Tools → Application → Service Workers
- Cache storage inspection in DevTools
- Console logs for download progress and errors
- Network tab for failed requests
