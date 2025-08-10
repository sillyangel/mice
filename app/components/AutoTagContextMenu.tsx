'use client';

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MusicIcon, TagIcon, InfoIcon } from 'lucide-react';
import { AutoTaggingDialog } from './AutoTaggingDialog';

interface AutoTagContextMenuProps {
  children: React.ReactNode;
  mode: 'track' | 'album' | 'artist';
  itemId: string;
  itemName: string;
  artistName?: string;
}

export function AutoTagContextMenu({
  children,
  mode,
  itemId,
  itemName,
  artistName
}: AutoTagContextMenuProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem
            onClick={() => setIsDialogOpen(true)}
            className="cursor-pointer"
          >
            <TagIcon className="mr-2 h-4 w-4" />
            Auto-Tag {mode === 'track' ? 'Track' : mode === 'album' ? 'Album' : 'Artist'}
          </ContextMenuItem>
          {mode === 'track' && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem className="cursor-pointer">
                <InfoIcon className="mr-2 h-4 w-4" />
                View Track Details
              </ContextMenuItem>
              <ContextMenuItem className="cursor-pointer">
                <MusicIcon className="mr-2 h-4 w-4" />
                Edit Track Metadata
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <AutoTaggingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        mode={mode}
        itemId={itemId}
        itemName={itemName}
        artistName={artistName}
      />
    </>
  );
}

export default AutoTagContextMenu;
