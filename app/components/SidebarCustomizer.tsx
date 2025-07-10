'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Eye, EyeOff, Download, Upload, RotateCcw } from 'lucide-react';
import { useSidebarLayout, SidebarItem } from '@/hooks/use-sidebar-layout';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function SidebarCustomizer() {
  const { 
    settings, 
    updateItemOrder, 
    toggleItemVisibility, 
    updateShortcuts, 
    updateShowIcons,
    exportSettings,
    importSettings,
    resetToDefaults 
  } = useSidebarLayout();
  const { toast } = useToast();
  const [dragEnabled, setDragEnabled] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(settings.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateItemOrder(items);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importSettings(file);
      toast({
        title: "Settings imported",
        description: "Your sidebar settings have been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import settings. Please check the file format.",
        variant: "destructive",
      });
    }
    
    // Reset the input
    event.target.value = '';
  };

  const handleExport = () => {
    exportSettings();
    toast({
      title: "Settings exported",
      description: "Your settings have been downloaded as a JSON file.",
    });
  };

  const handleReset = () => {
    resetToDefaults();
    toast({
      title: "Settings reset",
      description: "Sidebar settings have been reset to defaults.",
    });
  };

  const getSidebarIcon = (iconId: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      search: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      home: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
      queue: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
      radio: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      artists: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
          <circle cx="17" cy="7" r="5" />
        </svg>
      ),
      albums: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m16 6 4 14" />
          <path d="M12 6v14" />
          <path d="M8 8v12" />
          <path d="M4 4v16" />
        </svg>
      ),
      playlists: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15V6" />
          <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M12 12H3" />
        </svg>
      ),
      favorites: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      browse: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
        </svg>
      ),
      songs: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="18" r="4" />
          <path d="M12 18V2l7 4" />
        </svg>
      ),
      history: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 5.52 0 10-4.48 10-10 0-5.52-4.48-10-10-10Z" />
          <path d="M12 8v4l4 2" />
        </svg>
      ),
      settings: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    };
    
    return iconMap[iconId] || iconMap.home;
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Settings</CardTitle>
          <CardDescription>
            Customize your sidebar appearance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-icons"
              checked={settings.showIcons}
              onCheckedChange={updateShowIcons}
            />
            <Label htmlFor="show-icons">Show icons</Label>
          </div>
          
          <div className="space-y-2">
            <Label>Sidebar shortcuts</Label>
            <div className="flex gap-2">
              <Button
                variant={settings.shortcuts === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('both')}
              >
                Both
              </Button>
              <Button
                variant={settings.shortcuts === 'albums' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('albums')}
              >
                Albums only
              </Button>
              <Button
                variant={settings.shortcuts === 'playlists' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('playlists')}
              >
                Playlists only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Management */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Items</CardTitle>
          <CardDescription>
            Drag to reorder items and toggle visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="drag-enabled"
              checked={dragEnabled}
              onCheckedChange={setDragEnabled}
            />
            <Label htmlFor="drag-enabled">Enable drag to reorder</Label>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sidebar-items" isDropDisabled={!dragEnabled}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {settings.items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                      isDragDisabled={!dragEnabled}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            snapshot.isDragging ? 'bg-accent' : 'bg-background'
                          } ${!item.visible ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              {...provided.dragHandleProps}
                              className={`${dragEnabled ? 'cursor-grab' : 'cursor-default'}`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {settings.showIcons && getSidebarIcon(item.icon)}
                            <span className="font-medium">{item.label}</span>
                            {!item.visible && <Badge variant="secondary">Hidden</Badge>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemVisibility(item.id)}
                          >
                            {item.visible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Management</CardTitle>
          <CardDescription>
            Export, import, or reset your settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <div>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                id="import-settings"
              />
              <Label htmlFor="import-settings">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Settings
                  </span>
                </Button>
              </Label>
            </div>
            <Button onClick={handleReset} variant="destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
