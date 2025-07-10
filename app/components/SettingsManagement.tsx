'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  Upload, 
  RotateCcw,
  Settings
} from 'lucide-react';
import { useSidebarLayout } from '@/hooks/use-sidebar-layout';

export function SettingsManagement() {
  const { exportSettings, importSettings, resetToDefaults } = useSidebarLayout();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFile = async () => {
    if (!importFile) return;
    
    setImporting(true);
    setImportError(null);
    
    try {
      await importSettings(importFile);
      setImportFile(null);
      // Reset file input
      const fileInput = document.getElementById('settings-import') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import settings');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings Management
        </CardTitle>
        <CardDescription>
          Export, import, or reset your application settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportSettings} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              id="settings-import"
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('settings-import')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            
            {importFile && (
              <Button
                onClick={handleImportFile}
                disabled={importing}
                variant="default"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            )}
          </div>
          
          <Button onClick={resetToDefaults} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
        
        {importFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {importFile.name}
          </div>
        )}
        
        {importError && (
          <div className="text-sm text-destructive">
            Error: {importError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
