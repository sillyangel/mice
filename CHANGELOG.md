# Changelog

All notable changes to this project will be documented in this file.
## [unreleased]

### Bug Fixes

- Use git commit SHA for versioning, fix audio playback resume, remove all streak localStorage code
- Docker startup issue, add GitHub release workflow and changelog config

### Documentation

- Add CHANGELOG and commit rewriting script

### Features

- Implement offline library management with IndexedDB support
- Implement offline library synchronization with IndexedDB
- Add page transition animations and notification settings for audio playback
- Enhance UI with Framer Motion animations for album artwork and artist icons
- Update cover art retrieval to use higher resolution images and enhance download manager with new features
- Enhance audio settings with ReplayGain, crossfade, and equalizer presets; add AudioSettingsDialog component
- Implement Auto-Tagging Settings and MusicBrainz integration
- Enhance OfflineManagement component with improved card styling and layout
- Refactor service worker registration and enhance offline download manager with client-side checks
- Move service worker registration to a dedicated component for improved client-side handling
- Add ListeningStreakCard component for tracking listening streaks
- Add keyboard shortcuts and queue management features
- Improve SortableQueueItem component with enhanced click handling and styling
- Add pagination to library/songs and remove listening streaks
- Fix menubar, add lazy loading, improve image quality, limit search results, filter browse artists

### Miscellaneous

- C
- Merge pull request #39 from sillyangel/dependabot/npm_and_yarn/dev-99ea30e4b7
- Remove PostHog analytics and update dependencies to latest minor versions
- Update pnpm-lock.yaml to match new overrides configuration
- Update version to 2026.01.24 and add changelog for January 2026 release
- Organize documentation - move markdown files to docs/ folder

### Refactoring

- Remove all offline download and caching functionality
- Simplify service worker by removing offline download functionality

### Styling

- Update README formatting and improve content clarity

