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
import { FaServer, FaUser, FaLock, FaCheck, FaTimes, FaPalette, FaLastfm } from 'react-icons/fa';
import type { SidebarItem, SidebarLayoutSettings } from '@/hooks/use-sidebar-layout';

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
  const [errors, setErrors] = useState<{
    serverUrl?: string;
    username?: string;
    password?: string;
  }>({});
  const [connectionError, setConnectionError] = useState('');
  
  // Settings for step 2
  const [scrobblingEnabled, setScrobblingEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastfm-scrobbling-enabled') === 'true';
    }
    return true;
  });

  // Sidebar settings with new defaults
  const [sidebarShortcuts, setSidebarShortcuts] = useState<'albums' | 'playlists' | 'both'>('playlists');

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
      console.error('Navidrome connection check failed, will show config step');
    }
  }, [config, setStep, setFormData, setCanSkipNavidrome, testConnection]);

  useEffect(() => {
    checkNavidromeConnection();
  }, [checkNavidromeConnection]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setConnectionError('');
  };

  const validateForm = () => {
    const nextErrors: { serverUrl?: string; username?: string; password?: string } = {};
    const serverUrl = formData.serverUrl.trim();
    if (!serverUrl) {
      nextErrors.serverUrl = 'Server URL is required.';
    } else if (!/^https?:\/\/.+/.test(serverUrl)) {
      nextErrors.serverUrl = 'Enter a valid URL, e.g. https://your-server.com';
    }
    if (!formData.username.trim()) {
      nextErrors.username = 'Username is required.';
    }
    if (!formData.password) {
      nextErrors.password = 'Password is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTestAndNext = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please review the highlighted fields.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    setConnectionError('');
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
        setConnectionError('Could not connect to the server. Please check your settings.');
        toast({
          title: "Connection Failed",
          description: "Could not connect to the server. Please check your settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionError('An error occurred while testing the connection.');
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
    
    // Save sidebar settings with new defaults
    const defaultSidebarItems: SidebarItem[] = [
      { id: 'home', label: 'Home', visible: true, icon: 'home', href: '/' },
      { id: 'queue', label: 'Queue', visible: true, icon: 'queue', href: '/queue' },
      { id: 'artists', label: 'Artists', visible: true, icon: 'artists', href: '/library/artists' },
      { id: 'albums', label: 'Albums', visible: true, icon: 'albums', href: '/library/albums' },
      { id: 'playlists', label: 'Playlists', visible: true, icon: 'playlists', href: '/library/playlists' },
      { id: 'favorites', label: 'Favorites', visible: true, icon: 'favorites', href: '/favorites' },
      { id: 'settings', label: 'Settings', visible: true, icon: 'settings', href: '/settings' },
      // Hidden by default
      { id: 'search', label: 'Search', visible: false, icon: 'search', href: '/search' },
      { id: 'radio', label: 'Radio', visible: false, icon: 'radio', href: '/radio' },
      { id: 'browse', label: 'Browse', visible: false, icon: 'browse', href: '/browse' },
      { id: 'songs', label: 'Songs', visible: false, icon: 'songs', href: '/library/songs' },
      { id: 'history', label: 'History', visible: false, icon: 'history', href: '/history' },
    ];

    const sidebarSettings: SidebarLayoutSettings = {
      items: defaultSidebarItems,
      shortcuts: sidebarShortcuts,
      showIcons: true,
    };
    localStorage.setItem('sidebar-layout-settings', JSON.stringify(sidebarSettings));
    
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

  const handleDemoSetup = async () => {
    const demoCredentials = {
      serverUrl: 'https://demo.navidrome.org',
      username: 'demo',
      password: 'demo'
    };

    // Set form data
    setFormData(demoCredentials);

    setIsTesting(true);
    try {
      const success = await testConnection(demoCredentials);

      if (success) {
        // Save the config
        updateConfig(demoCredentials);
        
        toast({
          title: "Demo Server Connected",
          description: "Successfully connected to the Navidrome demo server! Let's configure your preferences.",
        });
        
        // Move to settings step
        setStep('settings');
      } else {
        toast({
          title: "Demo Server Unavailable",
          description: "The demo server is currently unavailable. Please try again later or enter your own server details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Could not connect to the demo server. Please check your internet connection.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (step === 'settings') {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className='py-5'>
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
                    <SelectItem value="default">Default</SelectItem>
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

              {/* Sidebar Shortcuts */}
              <div className="grid gap-3">
                <Label>Sidebar Shortcuts</Label>
                <Select value={sidebarShortcuts} onValueChange={(value: 'albums' | 'playlists' | 'both') => setSidebarShortcuts(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playlists">Playlists Only</SelectItem>
                    <SelectItem value="albums">Albums Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose what shortcuts appear in your sidebar
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
      <Card className="py-5">
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
                  className={errors.serverUrl ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.serverUrl}
                  required
                />
                {errors.serverUrl && (
                  <p className="text-sm text-destructive" role="alert">{errors.serverUrl}</p>
                )}
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
                  className={errors.username ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.username}
                  required
                />
                {errors.username && (
                  <p className="text-sm text-destructive" role="alert">{errors.username}</p>
                )}
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
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.password}
                  required 
                />
                {errors.password && (
                  <p className="text-sm text-destructive" role="alert">{errors.password}</p>
                )}
              </div>

              {/* Demo Server Setup */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                    💡
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Don&apos;t have a Navidrome server?
                    </p>
                    <p className="text-blue-700 dark:text-blue-200 mb-3">
                      Try the demo server to explore mice with one click:
                    </p>
                    <Button 
                      type="button"
                      variant="secondary" 
                      size="sm"
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:hover:bg-blue-800/50 dark:text-blue-100"
                      onClick={handleDemoSetup}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
                          Connecting to Demo...
                        </>
                      ) : (
                        <>
                          <FaServer className="w-4 h-4 mr-2" />
                          Connect to Demo Server
                        </>
                      )}
                    </Button>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                      This will automatically connect to: demo.navidrome.org
                    </div>
                    <details className="mt-3">
                      <summary className="text-xs text-blue-600 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-100">
                        Or enter demo credentials manually
                      </summary>
                      <div className="mt-2 bg-blue-100 dark:bg-blue-900/50 rounded p-2 font-mono text-xs">
                        <div><strong>URL:</strong> https://demo.navidrome.org</div>
                        <div><strong>Username:</strong> demo</div>
                        <div><strong>Password:</strong> demo</div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
              
              {connectionError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3" role="alert">
                  <FaTimes className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{connectionError}</p>
                </div>
              )}

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
