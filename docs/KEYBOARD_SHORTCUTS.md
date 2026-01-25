# Keyboard Shortcuts & Queue Management Features

This document outlines the new keyboard shortcuts, queue management, and context menu features added to the music player.

## Keyboard Shortcuts

The following keyboard shortcuts work globally throughout the application:

### Playback Controls
- **Space** - Play/Pause current track
- **→ (Right Arrow)** - Skip to next track
- **← (Left Arrow)** - Skip to previous track

### Volume Controls
- **↑ (Up Arrow)** - Increase volume by 10%
- **↓ (Down Arrow)** - Decrease volume by 10%
- **M** - Toggle mute/unmute

### Navigation
- **/** - Quick search (navigates to search page and focuses input)

### Notes
- Keyboard shortcuts are disabled when typing in input fields
- When in fullscreen player mode, shortcuts are handled by the fullscreen player
- Volume changes are saved to localStorage

## Queue Management

### Drag and Drop Queue Reordering
- **Drag Handle**: Hover over queue items to reveal the grip handle (⋮⋮)
- **Reorder**: Click and drag the handle to reorder tracks in the queue
- **Visual Feedback**: Dragged items become semi-transparent during drag
- **Keyboard Support**: Use Tab to focus items, then Space + Arrow keys to reorder

### Queue Features
- Real-time visual feedback during drag operations
- Maintains playback order after reordering
- Works with both mouse and keyboard navigation
- Accessible drag and drop implementation

## Context Menus (Right-Click)

Right-click on tracks, albums, and artists to access quick actions:

### Track Context Menu
- **Play Now** - Immediately play the selected track
- **Play Next** - Add track to the beginning of the queue
- **Add to Queue** - Add track to the end of the queue
- **Add/Remove from Favorites** - Toggle favorite status
- **Go to Album** - Navigate to the track's album
- **Go to Artist** - Navigate to the track's artist
- **Track Info** - View detailed track information
- **Share** - Share the track

### Album Context Menu
- **Play Album** - Play the entire album from the beginning
- **Add Album to Queue** - Add all album tracks to queue
- **Play Album Next** - Add album tracks to beginning of queue
- **Add to Favorites** - Add album to favorites
- **Go to Artist** - Navigate to the album's artist
- **Album Info** - View detailed album information
- **Share Album** - Share the album

### Artist Context Menu
- **Play All Songs** - Play all songs by the artist
- **Add All to Queue** - Add all artist songs to queue
- **Play All Next** - Add all artist songs to beginning of queue
- **Add to Favorites** - Add artist to favorites
- **Artist Info** - View detailed artist information
- **Share Artist** - Share the artist

## Where to Find These Features

### Keyboard Shortcuts
- Available globally throughout the application
- Work in main player, fullscreen player, and all pages
- Search shortcut (/) works from any page

### Queue Management
- **Queue Page**: `/queue` - Full drag and drop interface
- **Mini Player**: Shows current track and basic controls
- **Fullscreen Player**: Queue management button available

### Context Menus
- **Search Results**: Right-click on any track, album, or artist
- **Album Pages**: Right-click on individual tracks
- **Artist Pages**: Right-click on tracks and albums
- **Queue Page**: Right-click on queued tracks
- **Library Browse**: Right-click on any item

## Technical Implementation

### Components Used
- `useKeyboardShortcuts` hook for global keyboard shortcuts
- `@dnd-kit` for drag and drop functionality
- `@radix-ui/react-context-menu` for context menus
- Custom context menu components for different content types

### Accessibility
- Full keyboard navigation support
- Screen reader compatible
- Focus management
- ARIA labels and descriptions
- High contrast support

## Tips for Users

1. **Keyboard Shortcuts**: Most shortcuts work anywhere in the app, just start typing
2. **Queue Reordering**: Hover over queue items to see the drag handle
3. **Context Menus**: Right-click almost anything to see available actions
4. **Quick Search**: Press `/` from anywhere to jump to search
5. **Volume Control**: Use arrow keys for precise volume adjustment

## Future Enhancements

Potential future additions:
- Custom keyboard shortcut configuration
- More queue management options (clear queue, save as playlist)
- Additional context menu actions (edit metadata, download)
- Gesture support for mobile devices
- Queue templates and smart playlists
