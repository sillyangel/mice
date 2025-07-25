'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { title } from 'process';

// Current app version from package.json
const APP_VERSION = '2025.07.31';

// Changelog data - add new versions at the top
const CHANGELOG = [
  {
    version: '2025.07.31',
    title: 'July End of Month Update',
    changes: [
      'Native support for moblie devices (using pwa)', 
    ],
    fixes: [
      'Fixed issue with mobile navigation bar not displaying correctly',
      'Improved performance on mobile devices',
      'Resolved layout issues on smaller screens',
      'Fixed audio player controls not responding on mobile',
      'Improved touch interactions for better usability',
      'Fixed issue with album artwork not loading on mobile',
      'Resolved bug with search functionality on mobile devices',
      'Improved caching for faster load times on mobile',
    ],
    breaking: [
    ]
  },
  {
    version: '2025.07.10',
    title: 'July Major Update',
    changes: [
      // New Features
      'Support for Rich PWA Installs',
      'Added right-click shortcuts to the PWA icon',
      'Onboarding now suggests Navidrome\'s Demo Server',
      'User can export settings as a downloadable JSON',
      'New sidebar layout (compact design)',
      'New masonry-style grid in the settings page',
      'New options in settings to customize appearance',
      'Added 5 recently played albums and playlists created',
      'New loading screen',
      'New recommended songs section',
      'Enhanced playlist page',
      'Enhanced Home page layout and content',
      'Themes updated to use OKLCH (from HSL)',
      'All themes updated (light themes look similar)',
      'Caching system added (incomplete)',
      'Skeleton loading added across all pages'
    ],
    fixes: [
      'Fixed skeleton loader on the Home screen',
      'Fixed album page not showing correct album art',
      'Fixed album page not showing correct artist',
      'Fixed album page not showing correct song count',
      'Fixed flash of onboarding when already onboarded',
      'Fixed issue with audio player not resuming playback after pause',
      'Resolved bug with search results not displaying correctly'
    ],
    breaking: [
      // Technically not breaking, but notable:
      'Removed extended sidebar layout for a cleaner look'
    ]
  },
  {
    version: '2025.07.02',
    title: 'July Mini Update',
    changes: [
      'New Favorites inside of the Home Page',
      'Server Status Indicator removed for better performance',
      'New Album Artwork component for consistency (along with the artists)'
    ],
    breaking: [],
    fixes: []
  },
  {
    version: '2025.07.01',
    title: 'July New Month Update',
    changes: [
      'Integrated standalone Last.fm scrobbling support',
      'Added collapsible sidebar with icon-only mode',
      'Improved search and browsing experience',
      'Added history tracking for played songs',
      'New Library Artist Page',
      'Enhanced audio player with better controls',
      'Added settings page for customization options',
      'Introduced Whats New popup for version updates',
      'Improved UI consistency with new Badge component',
      'New Favorites page with album, song, and artist sections',
      'New Favortites inside of the Home Page',
      'Server Status Indicator removed for better performance',
    ],
    breaking: [],
    fixes: [
      'Fixed issue with audio player not resuming playback after pause',
      'Resolved bug with search results not displaying correctly',
      'Improved performance for large libraries',
      'Fixed layout issues on smaller screens',
      'Resolved scrobbling issues with Last.fm integration'
    ]
  },
  // Example previous version
  {
    version: '2025.06.15',
    title: 'June Final Update',
    changes: [
      'Added dark mode toggle',
      'Improved playlist management',
    ],
    breaking: [],
    fixes: [
      'Fixed login bug',
    ]
  }
];

type TabType = 'latest' | 'archive';

export function WhatsNewPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabType>('latest');
  const [selectedArchive, setSelectedArchive] = useState(CHANGELOG[1]?.version || '');

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding) return;
    const lastShownVersion = localStorage.getItem('whats-new-last-shown');
    if (lastShownVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('whats-new-last-shown', APP_VERSION);
    setIsOpen(false);
  };

  const currentVersionChangelog = CHANGELOG.find(entry => entry.version === APP_VERSION);
  const archiveChangelogs = CHANGELOG.filter(entry => entry.version !== APP_VERSION);

  // For archive, show selected version
  const archiveChangelog = archiveChangelogs.find(entry => entry.version === selectedArchive) || archiveChangelogs[0];

  if (!currentVersionChangelog) {
    return null;
  }

  const renderChangelog = (changelog: typeof CHANGELOG[0]) => (
    <div className="space-y-6">
      {changelog.title && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{changelog.title}</h3>
        </div>
      )}

      {changelog.changes.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            ✨ New Features & Improvements
          </h4>
          <ul className="space-y-2">
            {changelog.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span className="text-sm">{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {changelog.fixes.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            🐛 Bug Fixes
          </h4>
          <ul className="space-y-2">
            {changelog.fixes.map((fix, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="text-sm">{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {changelog.breaking.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            ⚠️ Breaking Changes
          </h4>
          <ul className="space-y-2">
            {changelog.breaking.map((breaking, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-sm">{breaking}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              What&apos;s New in Mice
              <Badge variant="outline">
                {tab === 'latest' ? currentVersionChangelog.version : archiveChangelog?.version}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <>
        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === 'latest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('latest')}
          >
            Latest
          </Button>
          <Button
            variant={tab === 'archive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('archive')}
            disabled={archiveChangelogs.length === 0}
          >
            Archive
          </Button>
          {tab === 'archive' && archiveChangelogs.length > 0 && (
            <select
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={selectedArchive}
              onChange={e => setSelectedArchive(e.target.value)}
            >
              {archiveChangelogs.map(entry => (
                <option key={entry.version} value={entry.version}>
                  {entry.version}
                </option>
              ))}
            </select>
          )}
        </div>
        <ScrollArea className="max-h-[60vh] pr-4">
          {tab === 'latest'
            ? renderChangelog(currentVersionChangelog)
            : archiveChangelog && renderChangelog(archiveChangelog)}
        </ScrollArea>

        <div className="flex justify-center pt-4">
          <Button onClick={handleClose}>
            Got it!
          </Button>
        </div>
        </>
      </DialogContent>
    </Dialog>
  );
}

