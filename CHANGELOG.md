# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Features
- Fix menubar, add lazy loading, improve image quality, limit search results, filter browse artists
- Add pagination to library/songs and remove listening streaks
- Improve SortableQueueItem component with enhanced click handling and styling
- Add keyboard shortcuts and queue management features
- Add ListeningStreakCard component for tracking listening streaks
- Enhance OfflineManagement component with improved card styling and layout
- Implement Auto-Tagging Settings and MusicBrainz integration
- Enhance audio settings with ReplayGain, crossfade, and equalizer presets; add AudioSettingsDialog component
- Update cover art retrieval to use higher resolution images and enhance download manager with new features
- Enhance UI with Framer Motion animations for album artwork and artist icons
- Add page transition animations and notification settings for audio playback
- Implement offline library synchronization with IndexedDB
- Implement offline library management with IndexedDB support

### Bug Fixes
- Use git commit SHA for versioning, fix audio playback resume, remove all streak localStorage code
- Docker startup issue, add GitHub release workflow and changelog config

### Refactoring
- Simplify service worker by removing offline download functionality
- Remove all offline download and caching functionality
- Move service worker registration to a dedicated component for improved client-side handling
- Refactor service worker registration and enhance offline download manager with client-side checks

### Miscellaneous
- Organize documentation: move markdown files to docs/ folder
- Update version to 2026.01.24 and add changelog for January 2026 release
- Update pnpm-lock.yaml to match new overrides configuration
- Remove PostHog analytics and update dependencies to latest minor versions
- Bump the dev group across 1 directory with 2 updates
- Merge pull request #39 from sillyangel/dependabot/npm_and_yarn/dev-99ea30e4b7

### Styling
- Update README formatting and improve content clarity

## [2026.01.24] - 2026-01-24

Previous release before changelog tracking.
