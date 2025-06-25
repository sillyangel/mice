'use client';

import React, { useState } from 'react';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useNavidromeConfig } from '@/app/components/NavidromeConfigContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { FaServer, FaUser, FaLock, FaCheck, FaTimes, FaPalette, FaLastfm } from 'react-icons/fa';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [step, setStep] = useState<'login' | 'settings'>('login');
  const { config, updateConfig, testConnection } = useNavidromeConfig();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    serverUrl: config.serverUrl || '',
    username: config.username || '',
    password: config.password || ''
  });

  const [isTesting, setIsTesting] = useState(false);
  
  // Settings for step 2
  const [scrobblingEnabled, setScrobblingEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastfm-scrobbling-enabled') === 'true';
    }
    return true;
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serverUrl || !formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      // Strip trailing slash from server URL before testing
      const cleanServerUrl = formData.serverUrl.replace(/\/+$/, '');
      
      const success = await testConnection({
        serverUrl: cleanServerUrl,
        username: formData.username,
        password: formData.password
      });

      if (success) {
        // Save the config
        updateConfig({
          serverUrl: cleanServerUrl,
          username: formData.username,
          password: formData.password
        });
        
        toast({
          title: "Connection Successful",
          description: "Connected to Navidrome! Let's configure your preferences.",
        });
        
        // Move to settings step
        setStep('settings');
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to the server. Please check your settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "An error occurred while testing the connection.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFinishSetup = () => {
    // Save scrobbling preference
    localStorage.setItem('lastfm-scrobbling-enabled', scrobblingEnabled.toString());
    
    toast({
      title: "Setup Complete",
      description: "Welcome to mice! Your music streaming experience is ready.",
    });
    
    // Reload the page to start the main app
    window.location.reload();
  };

  const handleScrobblingToggle = (enabled: boolean) => {
    setScrobblingEnabled(enabled);
  };

  if (step === 'settings') {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaPalette className="w-5 h-5" />
              Customize Your Experience
            </CardTitle>
            <CardDescription>
              Configure your preferences to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Theme Selection */}
              <div className="grid gap-3">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="rose">Rose</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Last.fm Scrobbling */}
              <div className="grid gap-3">
                <Label className="flex items-center gap-2">
                  <FaLastfm className="w-4 h-4" />
                  Last.fm Scrobbling
                </Label>
                <Select 
                  value={scrobblingEnabled ? "enabled" : "disabled"} 
                  onValueChange={(value) => handleScrobblingToggle(value === "enabled")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {scrobblingEnabled 
                    ? "Tracks will be scrobbled to Last.fm via Navidrome" 
                    : "Last.fm scrobbling will be disabled"}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleFinishSetup} className="w-full">
                  <FaCheck className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setStep('login')}
                >
                  Back to Connection Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaServer className="w-5 h-5" />
            Connect to Navidrome
          </CardTitle>
          <CardDescription>
            Enter your Navidrome server details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestAndNext}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="serverUrl" className="flex items-center gap-2">
                  Server URL
                </Label>
                <Input
                  id="serverUrl"
                  type="url"
                  placeholder="https://your-navidrome-server.com"
                  value={formData.serverUrl}
                  onChange={(e) => handleInputChange('serverUrl', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="username" className="flex items-center gap-2">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="your-username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="password" className="flex items-center gap-2">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required 
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <FaCheck className="w-4 h-4 mr-2" />
                      Test Connection & Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
