'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

// Current app version from package.json
const APP_VERSION = '2025.07.01';

// Changelog data - add new versions at the top

// title can be like this
// "month New Month Update"
// "month Mid-Month Update"
// "month Final Update"
const CHANGELOG = [
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
    ],
    breaking: [],
    fixes: [
      'Fixed issue with audio player not resuming playback after pause',
      'Resolved bug with search results not displaying correctly',
      'Improved performance for large libraries',
      'Fixed layout issues on smaller screens',
      'Resolved scrobbling issues with Last.fm integration'
    ]
  }
];

export function WhatsNewPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show for users who have completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding) return;
    
    // Check if we've shown the popup for this version
    const lastShownVersion = localStorage.getItem('whats-new-last-shown');
    
    if (lastShownVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    // Mark this version as shown
    localStorage.setItem('whats-new-last-shown', APP_VERSION);
    setIsOpen(false);
  };

  const currentVersionChangelog = CHANGELOG.find(entry => entry.version === APP_VERSION);

  if (!currentVersionChangelog) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              What&apos;s New in mice
              <Badge variant="outline">{currentVersionChangelog.version}</Badge>
            </DialogTitle>
            {/* <p className="text-sm text-muted-foreground mt-1">
              Released on {currentVersionChangelog.date}
            </p> */}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {currentVersionChangelog.title && (
              <div>
                <h3 className="text-lg font-semibold mb-2">{currentVersionChangelog.title}</h3>
              </div>
            )}

            {currentVersionChangelog.changes.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                  ✨ New Features & Improvements
                </h4>
                <ul className="space-y-2">
                  {currentVersionChangelog.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentVersionChangelog.fixes.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                  🐛 Bug Fixes
                </h4>
                <ul className="space-y-2">
                  {currentVersionChangelog.fixes.map((fix, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm">{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentVersionChangelog.breaking.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                  ⚠️ Breaking Changes
                </h4>
                <ul className="space-y-2">
                  {currentVersionChangelog.breaking.map((breaking, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span className="text-sm">{breaking}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={handleClose}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
