# Spotlight Search Feature

## Overview

The Spotlight Search feature provides a macOS Spotlight-style search interface for your music library, enhanced with Last.fm metadata for rich music information.

## Features

### 🔍 **Instant Search**

- **Global Search**: Press `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) from anywhere in the app
- **Real-time Results**: Search as you type with 300ms debouncing
- **Multiple Types**: Search across tracks, albums, and artists simultaneously

### ⌨️ **Keyboard Navigation**
- `↑`/`↓` arrows to navigate results
- `Enter` to select and play/view
- `Tab` to show detailed information
- `Esc` to close (or close details panel)

### 🎵 **Quick Actions**
- **Play Now**: Click on any result to play immediately
- **Play Next**: Add track to the beginning of queue
- **Add to Queue**: Add track to the end of queue
- **Show Details**: Get rich information from Last.fm

### 🌍 **Last.fm Integration**
When viewing details, you'll see:
- **Artist Biography**: Rich biographical information
- **Statistics**: Play counts and listener numbers
- **Tags**: Genre and style tags
- **Similar Artists**: Discover new music based on your selections
- **Album Art**: High-quality images

## Usage

### Opening Search

- **Keyboard**: Press `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)
- **Mouse**: Click the search button in the top menu bar (desktop)
- **Mobile**: Tap the search icon in the bottom navigation

### Search Tips
- Type partial song names, artist names, or album titles
- Results appear in real-time as you type
- Use keyboard navigation for fastest access
- Press Tab to see detailed Last.fm information

### Quick Actions
- **Tracks**: Play, Play Next, Add to Queue
- **Albums**: View album page, Add entire album to queue
- **Artists**: View artist page, Play all songs

## Last.fm Data

The search integrates with Last.fm to provide:

### Artist Information
- **Bio**: Artist biography and background
- **Stats**: Total plays and listeners globally
- **Similar**: Artists with similar style
- **Tags**: Genre classification and style tags

### Enhanced Discovery
- Click on similar artists to search for them
- Explore tags to discover new genres
- View play statistics to understand popularity

## Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open Spotlight Search |
| `↑` / `↓` | Navigate results |
| `Enter` | Select result |
| `Tab` | Show details |
| `Esc` | Close search/details |
| `Space` | Play/Pause (when not in search) |
| `←` / `→` | Previous/Next track |
| `↑` / `↓` | Volume up/down (when not in search) |
| `M` | Toggle mute |

## Implementation Details

### Architecture
- **Global Context**: `GlobalSearchProvider` manages search state
- **Component**: `SpotlightSearch` handles UI and interactions
- **Hooks**: `useKeyboardShortcuts` for global hotkeys
- **Integration**: Uses existing Navidrome search API + Last.fm API

### Performance
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Keyboard Optimized**: All interactions available via keyboard
- **Lazy Loading**: Last.fm data loaded only when details are viewed
- **Caching**: Search results cached during session

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and descriptions
- **Focus Management**: Automatic focus on search input
- **Visual Feedback**: Clear hover and selection states

## Future Enhancements

### Planned Features
- **Search History**: Remember recent searches
- **Smart Suggestions**: AI-powered search suggestions
- **Scoped Search**: Filter by type (tracks only, albums only, etc.)
- **Advanced Filters**: Date ranges, genres, etc.
- **Playlist Integration**: Search within specific playlists

### Last.fm Enhancements
- **Track Information**: Individual track details from Last.fm
- **Album Reviews**: User reviews and ratings
- **Concert Information**: Upcoming shows and tour dates
- **Scrobbling Integration**: Enhanced scrobbling with search data

## Troubleshooting

### Search Not Working
1. Check Navidrome connection in settings
2. Verify network connectivity
3. Try refreshing the page

### Last.fm Data Missing
1. Last.fm API may be unavailable
2. Artist/album may not exist in Last.fm database
3. Network connectivity issues

### Keyboard Shortcuts Not Working
1. Ensure you're not in an input field
2. Check if fullscreen mode is interfering
3. Try clicking outside any input fields first

The Spotlight Search feature transforms how you discover and interact with your music library, making it faster and more intuitive than ever before!
