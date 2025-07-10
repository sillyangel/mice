'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Search,
  Home,
  List,
  Radio,
  Users,
  Disc,
  Music,
  Heart,
  Grid3X3,
  Clock,
  Settings
} from 'lucide-react';
import { useSidebarLayout, SidebarItem, SidebarItemType } from '@/hooks/use-sidebar-layout';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  queue: <List className="h-4 w-4" />,
  radio: <Radio className="h-4 w-4" />,
  artists: <Users className="h-4 w-4" />,
  albums: <Disc className="h-4 w-4" />,
  playlists: <Music className="h-4 w-4" />,
  favorites: <Heart className="h-4 w-4" />,
  browse: <Grid3X3 className="h-4 w-4" />,
  songs: <Music className="h-4 w-4" />,
  history: <Clock className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

interface SortableItemProps {
  item: SidebarItem;
  onToggleVisibility: (id: SidebarItemType) => void;
  showIcons: boolean;
}

function SortableItem({ item, onToggleVisibility, showIcons }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border"
    >
      <div className="flex items-center gap-3">
        <div
          className="cursor-grab hover:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        {showIcons && (
          <div className="text-muted-foreground">
            {iconMap[item.icon] || <div className="h-4 w-4" />}
          </div>
        )}
        
        <span className={`font-medium ${!item.visible ? 'text-muted-foreground line-through' : ''}`}>
          {item.label}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleVisibility(item.id)}
        className="h-8 w-8 p-0"
      >
        {item.visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function SidebarCustomization() {
  const {
    settings,
    hasUnsavedChanges,
    reorderItems,
    toggleItemVisibility,
    updateShortcuts,
    updateShowIcons,
    applyChanges,
    discardChanges,
  } = useSidebarLayout();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderItems(active.id as string, over.id as string);
    }
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle>Sidebar Customization</CardTitle>
        <CardDescription>
          Customize the sidebar layout, reorder items, and manage visibility settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show Icons Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Icons</Label>
            <div className="text-sm text-muted-foreground">
              Display icons next to navigation items
            </div>
          </div>
          <Switch
            checked={settings.showIcons}
            onCheckedChange={updateShowIcons}
          />
        </div>

        {/* Shortcut Type */}
        <div className="space-y-3">
          <Label>Sidebar Shortcuts</Label>
          <RadioGroup
            value={settings.shortcuts}
            onValueChange={(value: 'albums' | 'playlists' | 'both') => updateShortcuts(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="albums" id="shortcuts-albums" />
              <Label htmlFor="shortcuts-albums">Albums only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="playlists" id="shortcuts-playlists" />
              <Label htmlFor="shortcuts-playlists">Playlists only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="shortcuts-both" />
              <Label htmlFor="shortcuts-both">Both albums and playlists</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Navigation Items Order */}
        <div className="space-y-3">
          <Label>Navigation Items</Label>
          <div className="text-sm text-muted-foreground mb-3">
            Drag to reorder, click the eye icon to show/hide items
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={settings.items.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {settings.items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onToggleVisibility={toggleItemVisibility}
                    showIcons={settings.showIcons}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Apply/Discard Changes */}
        {hasUnsavedChanges() && (
          <div className="space-y-3 pt-4 border-t">
            <Label>Unsaved Changes</Label>
            <div className="flex gap-2">
              <Button onClick={applyChanges} variant="default">
                Apply Changes
              </Button>
              <Button onClick={discardChanges} variant="outline">
                Discard Changes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
