# Navidrome Integration Migration

This project has been migrated from a Firebase-based system with static data to use **Navidrome/Subsonic** as the backend music server.

## What Changed

### Removed:
- Firebase authentication and database
- Static album/artist data files
- Custom database URLs and tracklist JSON files

### Added:
- Navidrome/Subsonic API integration
- Real-time music streaming
- Dynamic music library loading
- Album cover art from Navidrome
- Playlist management through Navidrome
- Star/favorite functionality
- Scrobbling support

## Setup Instructions

### 1. Install Navidrome

First, you need to set up a Navidrome server. You can:

- **Self-host**: Follow the [Navidrome installation guide](https://www.navidrome.org/docs/installation/)
- **Docker**: Use the official Docker image
- **Pre-built binaries**: Download from GitHub releases

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and configure your Navidrome server:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_NAVIDROME_URL=http://localhost:4533
NEXT_PUBLIC_NAVIDROME_USERNAME=your_username
NEXT_PUBLIC_NAVIDROME_PASSWORD=your_password
```

For production, use your actual Navidrome server URL:
```env
NEXT_PUBLIC_NAVIDROME_URL=https://your-navidrome-server.com
NEXT_PUBLIC_NAVIDROME_USERNAME=your_username
NEXT_PUBLIC_NAVIDROME_PASSWORD=your_password
```

### 3. Install Dependencies

Remove Firebase dependencies and install:

```bash
pnpm install
```

### 4. Run the Application

```bash
pnpm dev
```

## Features

### Music Library
- **Albums**: Browse all albums in your Navidrome library
- **Artists**: Browse all artists with album counts
- **Songs**: Play individual tracks with streaming
- **Search**: Search across artists, albums, and songs
- **Playlists**: Create and manage playlists

### Audio Player
- **Streaming**: Direct streaming from Navidrome server
- **Queue Management**: Add albums/artists to queue
- **Scrobbling**: Track listening history
- **Controls**: Play, pause, skip, volume control

### User Features
- **Favorites**: Star/unstar albums, artists, and songs
- **Playlists**: Create, edit, and delete playlists
- **Recently Added**: See newest additions to your library
- **Album Artwork**: High quality cover art from Navidrome

## API Integration

The app uses the Subsonic API (compatible with Navidrome) with these endpoints:

- `ping` - Test server connection
- `getArtists` - Get all artists
- `getAlbums` - Get albums (newest, recent, etc.)
- `getAlbum` - Get album details and tracks
- `search3` - Search music library
- `getPlaylists` - Get user playlists
- `stream` - Stream audio files
- `getCoverArt` - Get album/artist artwork
- `star/unstar` - Favorite items
- `scrobble` - Track listening

## File Structure

```
lib/
  navidrome.ts          # Navidrome API client
app/
  components/
    NavidromeContext.tsx    # React context for Navidrome data
    AudioPlayerContext.tsx  # Updated for Navidrome streaming
    album-artwork.tsx       # Updated for Navidrome albums
    artist-icon.tsx         # Updated for Navidrome artists
    AudioPlayer.tsx         # Updated for streaming
```

## Migration Notes

- **Authentication**: Removed Firebase auth (Navidrome handles users)
- **Data Source**: Now uses live music library instead of static JSON
- **Streaming**: Direct audio streaming instead of static file URLs
- **Cover Art**: Dynamic cover art from Navidrome instead of static images
- **Playlists**: Managed through Navidrome instead of static data

## Troubleshooting

### Connection Issues
1. Verify Navidrome server is running
2. Check URL, username, and password in `.env.local`
3. Ensure CORS is properly configured in Navidrome
4. Check network connectivity

### Audio Issues
1. Verify audio files are properly imported in Navidrome
2. Check browser audio permissions
3. Ensure audio codecs are supported

### Performance
1. Navidrome server performance affects loading times
2. Consider server location for streaming quality
3. Check network bandwidth for audio streaming

## Development

The app now uses TypeScript interfaces that match the Subsonic API responses. All components have been updated to work with the new data structure and real-time streaming.

Key changes:
- Album interface now includes Navidrome-specific fields
- Artist interface includes album counts and cover art
- Song interface includes streaming URLs and metadata
- Playlist interface matches Navidrome playlist structure
