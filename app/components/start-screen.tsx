'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useNavidromeConfig } from '@/app/components/NavidromeConfigContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { FaServer, FaUser, FaLock, FaCheck, FaTimes, FaPalette, FaLastfm, FaBars } from 'react-icons/fa';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [step, setStep] = useState<'login' | 'settings'>('login');
  const [canSkipNavidrome, setCanSkipNavidrome] = useState(false);
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

  // New settings
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const [standaloneLastfmEnabled, setStandaloneLastfmEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('standalone-lastfm-enabled') === 'true';
    }
    return false;
  });

  // Check if Navidrome is configured via environment variables
  const hasEnvConfig = React.useMemo(() => {
    return !!(process.env.NEXT_PUBLIC_NAVIDROME_URL && 
              process.env.NEXT_PUBLIC_NAVIDROME_USERNAME && 
              process.env.NEXT_PUBLIC_NAVIDROME_PASSWORD);
  }, []);

  // Check if Navidrome is already working on component mount
  const checkNavidromeConnection = useCallback(async () => {
    try {
      // First check if there's a working API instance
      const { getNavidromeAPI } = await import('@/lib/navidrome');
      const api = getNavidromeAPI();
      
      if (api) {
        // Test the existing API
        const success = await api.ping();
        if (success) {
          setCanSkipNavidrome(true);
          
          // Get the current config to populate form
          if (config.serverUrl && config.username && config.password) {
            setFormData({
              serverUrl: config.serverUrl,
              username: config.username,
              password: config.password
            });
          }
          
          // If this is first-time setup and Navidrome is working, skip to settings
          const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
          if (!hasCompletedOnboarding) {
            setStep('settings');
          }
          return;
        }
      }
      
      // If no working API, check if we have config that just needs testing
      if (config.serverUrl && config.username && config.password) {
        const success = await testConnection(config);
        if (success) {
          setCanSkipNavidrome(true);
          setFormData({
            serverUrl: config.serverUrl,
            username: config.username,
            password: config.password
          });
          
          const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
          if (!hasCompletedOnboarding) {
            setStep('settings');
          }
        }
      }
    } catch (error) {
      console.log('Navidrome connection check failed, will show config step');
    }
  }, [config, setStep, setFormData, setCanSkipNavidrome, testConnection]);

  useEffect(() => {
    checkNavidromeConnection();
  }, [checkNavidromeConnection]);

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
    // Save all settings
    localStorage.setItem('lastfm-scrobbling-enabled', scrobblingEnabled.toString());
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
    localStorage.setItem('standalone-lastfm-enabled', standaloneLastfmEnabled.toString());
    
    // Mark onboarding as complete
    localStorage.setItem('onboarding-completed', '1.1.0');
    
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
              {canSkipNavidrome && <Badge variant="outline">Step 1 of 1</Badge>}
            </CardTitle>
            <CardDescription>
              Configure your preferences to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Theme Selection */}
              <div className="grid gap-3">
                <span>
                  <Label htmlFor="theme">Theme</Label>
                </span>
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

              {/* Sidebar Settings */}
              <div className="grid gap-3">
                <Label className="flex items-center gap-2">
                  <FaBars className="w-4 h-4" />
                  Sidebar Layout
                </Label>
                <Select 
                  value={sidebarCollapsed ? "collapsed" : "expanded"} 
                  onValueChange={(value) => setSidebarCollapsed(value === "collapsed")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Expanded (with labels)</SelectItem>
                    <SelectItem value="collapsed">Collapsed (icons only)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  You can always toggle this later using the button in the sidebar
                </p>
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

              {/* Standalone Last.fm */}
              <div className="grid gap-3">
                <Label className="flex items-center gap-2">
                  <FaLastfm className="w-4 h-4" />
                  Standalone Last.fm (Advanced)
                </Label>
                <Select 
                  value={standaloneLastfmEnabled ? "enabled" : "disabled"} 
                  onValueChange={(value) => setStandaloneLastfmEnabled(value === "enabled")}
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
                  {standaloneLastfmEnabled 
                    ? "Direct Last.fm API integration (configure in Settings later)" 
                    : "Use only Navidrome's Last.fm integration"}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleFinishSetup} className="w-full">
                  <FaCheck className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
                {!hasEnvConfig && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setStep('login')}
                  >
                    {canSkipNavidrome ? "Review Connection Settings" : "Back to Connection Settings"}
                  </Button>
                )}
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
            {canSkipNavidrome && <Badge variant="outline">{hasEnvConfig ? "Configured via .env" : "Already Connected"}</Badge>}
          </CardTitle>
          <CardDescription>
            {canSkipNavidrome 
              ? hasEnvConfig 
                ? "Your Navidrome connection is configured via environment variables."
                : "Your Navidrome connection is working. You can proceed to customize your settings."
              : "Enter your Navidrome server details to get started"
            }
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

              {/* Demo Server Tip */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                    💡
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Don't have a Navidrome server?
                    </p>
                    <p className="text-blue-700 dark:text-blue-200 mb-2">
                      Try the demo server to explore mice:
                    </p>
                    <div className="bg-blue-100 dark:bg-blue-900/50 rounded p-2 font-mono text-xs">
                      <div><strong>URL:</strong> https://demo.navidrome.org</div>
                      <div><strong>Username:</strong> demo</div>
                      <div><strong>Password:</strong> demo</div>
                    </div>
                  </div>
                </div>
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
                
                {canSkipNavidrome && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setStep('settings')}
                  >
                    Skip to Settings
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
