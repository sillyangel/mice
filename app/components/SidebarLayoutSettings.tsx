'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSidebarLayout, SidebarItem } from '@/hooks/use-sidebar-layout';
import { GripVertical, Eye, EyeOff, Download, Upload, RotateCcw } from 'lucide-react';

interface DraggableSidebarItemProps {
  item: SidebarItem;
  index: number;
  onToggleVisibility: (itemId: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
}

function DraggableSidebarItem({
  item,
  index,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDrop,
}: DraggableSidebarItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-move"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <span className={`${item.visible ? '' : 'text-muted-foreground line-through'}`}>
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

export function SidebarLayoutSettings() {
  const {
    settings,
    updateItemOrder,
    toggleItemVisibility,
    updateShortcuts,
    updateShowIcons,
    exportSettings,
    importSettings,
    resetToDefaults,
  } = useSidebarLayout();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newItems = [...settings.items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove the dragged item
    newItems.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newItems.splice(dropIndex, 0, draggedItem);
    
    updateItemOrder(newItems);
    setDraggedIndex(null);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await importSettings(file);
      // Reset the file input
      e.target.value = '';
    } catch (error) {
      console.error('Failed to import settings:', error);
      alert('Failed to import settings. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-icons">Show Icons</Label>
            <Switch
              id="show-icons"
              checked={settings.showIcons}
              onCheckedChange={updateShowIcons}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Sidebar Shortcuts</Label>
            <div className="flex gap-2">
              <Button
                variant={settings.shortcuts === 'albums' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('albums')}
              >
                Albums Only
              </Button>
              <Button
                variant={settings.shortcuts === 'playlists' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('playlists')}
              >
                Playlists Only
              </Button>
              <Button
                variant={settings.shortcuts === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateShortcuts('both')}
              >
                Both
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Order and Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag items to reorder them, click the eye icon to show/hide items
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.items.map((item, index) => (
              <DraggableSidebarItem
                key={item.id}
                item={item}
                index={index}
                onToggleVisibility={toggleItemVisibility}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={exportSettings} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            
            <div className="flex-1">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                disabled={importing}
                className="hidden"
                id="import-settings"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={importing}
                onClick={() => document.getElementById('import-settings')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import Settings'}
              </Button>
            </div>
          </div>
          
          <Button
            onClick={resetToDefaults}
            variant="destructive"
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
