'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNavidromeConfig } from '@/app/components/NavidromeConfigContext';
import { useToast } from '@/hooks/use-toast';
import { useStandaloneLastFm } from '@/hooks/use-standalone-lastfm';
import { useSidebarShortcuts, SidebarShortcutType } from '@/hooks/use-sidebar-shortcuts';
import { SidebarCustomization } from '@/app/components/SidebarCustomization';
import { SettingsManagement } from '@/app/components/SettingsManagement';
import { CacheManagement } from '@/app/components/CacheManagement';
import { FaServer, FaUser, FaLock, FaCheck, FaTimes, FaLastfm, FaCog } from 'react-icons/fa';
import { Settings, ExternalLink } from 'lucide-react';

const SettingsPage = () => {
    const { theme, setTheme, mode, setMode } = useTheme();
    const { config, updateConfig, isConnected, testConnection, clearConfig } = useNavidromeConfig();
    const { toast } = useToast();
    const { isEnabled: isStandaloneLastFmEnabled, getCredentials, getAuthUrl, getSessionKey } = useStandaloneLastFm();
    const { shortcutType, updateShortcutType } = useSidebarShortcuts();
    
    const [formData, setFormData] = useState({
        serverUrl: '',
        username: '',
        password: ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Last.fm scrobbling settings (Navidrome integration)
    const [scrobblingEnabled, setScrobblingEnabled] = useState(true);

    // Standalone Last.fm settings
    const [standaloneLastFmEnabled, setStandaloneLastFmEnabled] = useState(false);
    
    const [lastFmCredentials, setLastFmCredentials] = useState({
        apiKey: '',
        apiSecret: '',
        sessionKey: '',
        username: ''
    });

    // Client-side hydration state
    const [isClient, setIsClient] = useState(false);

    // Check if Navidrome is configured via environment variables
    const hasEnvConfig = React.useMemo(() => {
        return !!(process.env.NEXT_PUBLIC_NAVIDROME_URL && 
                 process.env.NEXT_PUBLIC_NAVIDROME_USERNAME && 
                 process.env.NEXT_PUBLIC_NAVIDROME_PASSWORD);
    }, []);

    // Sidebar settings
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(true);

    // Initialize client-side state after hydration
    useEffect(() => {
        setIsClient(true);
        
        // Initialize form data with config values
        setFormData({
            serverUrl: config.serverUrl || '',
            username: config.username || '',
            password: config.password || ''
        });
        
        // Load saved preferences from localStorage
        const savedScrobbling = localStorage.getItem('lastfm-scrobbling-enabled');
        if (savedScrobbling !== null) {
            setScrobblingEnabled(savedScrobbling === 'true');
        }

        const savedStandaloneLastFm = localStorage.getItem('standalone-lastfm-enabled');
        if (savedStandaloneLastFm !== null) {
            setStandaloneLastFmEnabled(savedStandaloneLastFm === 'true');
        }

        const savedSidebarCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedSidebarCollapsed !== null) {
            setSidebarCollapsed(savedSidebarCollapsed === 'true');
        }

        const savedSidebarVisible = localStorage.getItem('sidebar-visible');
        if (savedSidebarVisible !== null) {
            setSidebarVisible(savedSidebarVisible === 'true');
        } else {
            setSidebarVisible(true); // Default to visible
        }

        // Load Last.fm credentials
        const storedCredentials = localStorage.getItem('lastfm-credentials');
        if (storedCredentials) {
            try {
                const credentials = JSON.parse(storedCredentials);
                setLastFmCredentials({
                    apiKey: credentials.apiKey || '',
                    apiSecret: credentials.apiSecret || '',
                    sessionKey: credentials.sessionKey || '',
                    username: credentials.username || ''
                });
            } catch (error) {
                console.error('Failed to parse stored Last.fm credentials:', error);
            }
        }
    }, [config.serverUrl, config.username, config.password]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleTestConnection = async () => {
        if (!formData.serverUrl || !formData.username || !formData.password) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields before testing the connection.",
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
                toast({
                    title: "Connection Successful",
                    description: "Successfully connected to Navidrome server.",
                });
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

    const handleSaveConfig = async () => {
        if (!formData.serverUrl || !formData.username || !formData.password) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields.",
                variant: "destructive"
            });
            return;
        }

        // Strip trailing slash from server URL to ensure consistency
        const cleanServerUrl = formData.serverUrl.replace(/\/+$/, '');

        updateConfig({
            serverUrl: cleanServerUrl,
            username: formData.username,
            password: formData.password
        });
        
        // Update form data to reflect the cleaned URL
        setFormData(prev => ({ ...prev, serverUrl: cleanServerUrl }));
        setHasUnsavedChanges(false);
        toast({
            title: "Settings Saved",
            description: "Navidrome configuration has been saved.",
        });
    };

    const handleClearConfig = () => {
        clearConfig();
        setFormData({
            serverUrl: '',
            username: '',
            password: ''
        });
        setHasUnsavedChanges(false);
        toast({
            title: "Configuration Cleared",
            description: "Navidrome configuration has been cleared.",
        });
    };

    const handleScrobblingToggle = (enabled: boolean) => {
        setScrobblingEnabled(enabled);
        if (isClient) {
            localStorage.setItem('lastfm-scrobbling-enabled', enabled.toString());
        }
        toast({
            title: enabled ? "Scrobbling Enabled" : "Scrobbling Disabled",
            description: enabled 
                ? "Tracks will now be scrobbled to Last.fm via Navidrome" 
                : "Last.fm scrobbling has been disabled",
        });
    };

    const handleStandaloneLastFmToggle = (enabled: boolean) => {
        setStandaloneLastFmEnabled(enabled);
        if (isClient) {
            localStorage.setItem('standalone-lastfm-enabled', enabled.toString());
        }
        toast({
            title: enabled ? "Standalone Last.fm Enabled" : "Standalone Last.fm Disabled",
            description: enabled 
                ? "Direct Last.fm integration enabled" 
                : "Standalone Last.fm integration disabled",
        });
    };

    const handleSidebarToggle = (collapsed: boolean) => {
        setSidebarCollapsed(collapsed);
        if (isClient) {
            localStorage.setItem('sidebar-collapsed', collapsed.toString());
        }
        toast({
            title: collapsed ? "Sidebar Collapsed" : "Sidebar Expanded",
            description: collapsed 
                ? "Sidebar will show only icons" 
                : "Sidebar will show full labels",
        });
        
        // Trigger a custom event to notify the sidebar component
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed } }));
        }
    };

    const handleSidebarVisibilityToggle = (visible: boolean) => {
        setSidebarVisible(visible);
        if (isClient) {
            localStorage.setItem('sidebar-visible', visible.toString());
        }
        toast({
            title: visible ? "Sidebar Shown" : "Sidebar Hidden",
            description: visible 
                ? "Sidebar is now visible" 
                : "Sidebar is now hidden",
        });
        
        // Trigger a custom event to notify the sidebar component
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sidebar-visibility-toggle', { detail: { visible } }));
        }
    };

    const handleLastFmAuth = () => {
        if (!lastFmCredentials.apiKey) {
            toast({
                title: "API Key Required",
                description: "Please enter your Last.fm API key first.",
                variant: "destructive"
            });
            return;
        }
        
        const authUrl = getAuthUrl(lastFmCredentials.apiKey);
        window.open(authUrl, '_blank');
        
        toast({
            title: "Last.fm Authorization",
            description: "Please authorize the application in the opened window and return here.",
        });
    };

    const handleLastFmCredentialsSave = () => {
        if (!lastFmCredentials.apiKey || !lastFmCredentials.apiSecret) {
            toast({
                title: "Missing Credentials",
                description: "Please enter both API key and secret.",
                variant: "destructive"
            });
            return;
        }

        if (isClient) {
            localStorage.setItem('lastfm-credentials', JSON.stringify(lastFmCredentials));
        }
        toast({
            title: "Credentials Saved",
            description: "Last.fm credentials have been saved locally.",
        });
    };

    const handleLastFmSessionComplete = async (token: string) => {
        try {
            const { sessionKey, username } = await getSessionKey(
                token, 
                lastFmCredentials.apiKey, 
                lastFmCredentials.apiSecret
            );
            
            const updatedCredentials = {
                ...lastFmCredentials,
                sessionKey,
                username
            };
            
            setLastFmCredentials(updatedCredentials);
            if (isClient) {
                localStorage.setItem('lastfm-credentials', JSON.stringify(updatedCredentials));
            }
            
            toast({
                title: "Last.fm Authentication Complete",
                description: `Successfully authenticated as ${username}`,
            });
        } catch (error) {
            toast({
                title: "Authentication Failed",
                description: error instanceof Error ? error.message : "Failed to complete Last.fm authentication",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="p-6 pb-24 w-full">
            {!isClient ? (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-left">
                        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">Customize your music experience</p>
                    </div>

                <div className="columns-1 lg:columns-2 xl:columns-3 gap-6 space-y-6"
                     style={{ columnFill: 'balance' }}>

                {!hasEnvConfig && (
                    <Card className="mb-6 break-inside-avoid py-5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FaServer className="w-5 h-5" />
                                Navidrome Server
                            </CardTitle>
                            <CardDescription>
                                Configure connection to your Navidrome music server
                            </CardDescription>
                        </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="server-url">Server URL</Label>
                            <Input
                                id="server-url"
                                type="url"
                                placeholder="https://your-navidrome-server.com"
                                value={formData.serverUrl}
                                onChange={(e) => handleInputChange('serverUrl', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Your username"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Your password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                            {isConnected ? (
                                <>
                                    <FaCheck className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">Connected to server</span>
                                </>
                            ) : (
                                <>
                                    <FaTimes className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600">Not connected</span>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                onClick={handleTestConnection} 
                                disabled={isTesting}
                                variant="outline"
                            >
                                {isTesting ? 'Testing...' : 'Test Connection'}
                            </Button>
                            <Button 
                                onClick={handleSaveConfig}
                                disabled={!hasUnsavedChanges}
                            >
                                Save Configuration
                            </Button>
                            <Button 
                                onClick={handleClearConfig}
                                variant="destructive"
                            >
                                Clear
                            </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            <p><strong>Note:</strong> Your credentials are stored locally in your browser</p>
                            <p><strong>Security:</strong> Always use HTTPS for your Navidrome server</p>
                        </div>
                    </CardContent>
                </Card>
                )}

                {hasEnvConfig && (
                    <Card className="mb-6 break-inside-avoid py-5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FaServer className="w-5 h-5" />
                                Navidrome Server
                            </CardTitle>
                            <CardDescription>
                                Using environment variables configuration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <FaCheck className="w-4 h-4 text-green-600" />
                                <div className="text-sm">
                                    <p className="text-green-600 font-medium">Configured via Environment Variables</p>
                                    <p className="text-green-600">Server: {process.env.NEXT_PUBLIC_NAVIDROME_URL}</p>
                                    <p className="text-green-600">Username: {process.env.NEXT_PUBLIC_NAVIDROME_USERNAME}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your Navidrome connection is configured through environment variables. 
                                Contact your administrator to change these settings.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card className="mb-6 break-inside-avoid py-5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FaLastfm className="w-5 h-5" />
                            Last.fm Integration
                        </CardTitle>
                        <CardDescription>
                            Configure Last.fm scrobbling through your Navidrome server
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="scrobbling-enabled">Enable Scrobbling</Label>
                            <Select 
                                value={scrobblingEnabled ? "enabled" : "disabled"} 
                                onValueChange={(value) => handleScrobblingToggle(value === "enabled")}
                            >
                                <SelectTrigger id="scrobbling-enabled">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="enabled">Enabled</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>How it works:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Tracks are scrobbled to Last.fm through your Navidrome server</li>
                                <li>Configure Last.fm credentials in your Navidrome admin panel</li>
                                <li>Scrobbling occurs when you listen to at least 30 seconds or half the track</li>
                                <li>&quot;Now Playing&quot; updates are sent when tracks start</li>
                            </ul>
                            <p className="mt-3"><strong>Note:</strong> Last.fm credentials must be configured in Navidrome, not here.</p>
                        </div>

                        {!isConnected && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                <FaTimes className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm text-yellow-600">Connect to Navidrome first to enable scrobbling</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FaCog className="w-5 h-5" />
                            Application Settings
                        </CardTitle>
                        <CardDescription>
                            General application preferences and setup
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>First-Time Setup</Label>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    localStorage.removeItem('onboarding-completed');
                                    window.location.reload();
                                }}
                                className="w-full sm:w-auto"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Run Setup Wizard Again
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                Re-run the initial setup wizard to configure your preferences from scratch
                            </p>
                        </div>
                    </CardContent>
                </Card> */}

                <Card className="mb-6 break-inside-avoid py-5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Sidebar Settings
                        </CardTitle>
                        <CardDescription>
                            Customize sidebar appearance and behavior
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="sidebar-visibility">Sidebar Visibility</Label>
                            <Select 
                                value={sidebarVisible ? "visible" : "hidden"} 
                                onValueChange={(value) => handleSidebarVisibilityToggle(value === "visible")}
                            >
                                <SelectTrigger id="sidebar-visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visible">Visible</SelectItem>
                                    <SelectItem value="hidden">Hidden</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sidebar-shortcuts">Sidebar Shortcuts</Label>
                            <Select 
                                value={shortcutType} 
                                onValueChange={(value: SidebarShortcutType) => updateShortcutType(value)}
                            >
                                <SelectTrigger id="sidebar-shortcuts">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="both">Albums & Playlists</SelectItem>
                                    <SelectItem value="albums">Albums Only</SelectItem>
                                    <SelectItem value="playlists">Playlists Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>Visible:</strong> Sidebar is always shown with icon navigation</p>
                            <p><strong>Hidden:</strong> Sidebar is completely hidden for maximum space</p>
                            <p><strong>Albums & Playlists:</strong> Show both favorite albums, recently played albums, and playlists as shortcuts</p>
                            <p><strong>Albums Only:</strong> Show only favorite and recently played albums as shortcuts</p>
                            <p><strong>Playlists Only:</strong> Show only playlists as shortcuts</p>
                            <p className="mt-3"><strong>Note:</strong> The sidebar now shows only icons with tooltips on hover for a cleaner interface.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* <Card className="mb-6 break-inside-avoid py-5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FaLastfm className="w-5 h-5" />
                            Standalone Last.fm Integration
                        </CardTitle>
                        <CardDescription>
                            Direct Last.fm scrobbling without Navidrome configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="standalone-lastfm-enabled">Enable Standalone Last.fm</Label>
                            <Select 
                                value={standaloneLastFmEnabled ? "enabled" : "disabled"} 
                                onValueChange={(value) => handleStandaloneLastFmToggle(value === "enabled")}
                            >
                                <SelectTrigger id="standalone-lastfm-enabled">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="enabled">Enabled</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {standaloneLastFmEnabled && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="lastfm-api-key">Last.fm API Key</Label>
                                    <Input
                                        id="lastfm-api-key"
                                        type="text"
                                        placeholder="Your Last.fm API key"
                                        value={lastFmCredentials.apiKey}
                                        onChange={(e) => setLastFmCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lastfm-api-secret">Last.fm API Secret</Label>
                                    <Input
                                        id="lastfm-api-secret"
                                        type="password"
                                        placeholder="Your Last.fm API secret"
                                        value={lastFmCredentials.apiSecret}
                                        onChange={(e) => setLastFmCredentials(prev => ({ ...prev, apiSecret: e.target.value }))}
                                    />
                                </div>

                                {lastFmCredentials.sessionKey ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                        <FaCheck className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-green-600">
                                            Authenticated as {lastFmCredentials.username}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                        <FaTimes className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm text-yellow-600">Not authenticated</span>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button onClick={handleLastFmCredentialsSave} variant="outline">
                                        Save Credentials
                                    </Button>
                                    <Button onClick={handleLastFmAuth} disabled={!lastFmCredentials.apiKey || !lastFmCredentials.apiSecret}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Authorize with Last.fm
                                    </Button>
                                </div>

                                <div className="text-sm text-muted-foreground space-y-2">
                                    <p><strong>Setup Instructions:</strong></p>
                                    <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>Create a Last.fm API account at <a href="https://www.last.fm/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">last.fm/api</a></li>
                                        <li>Enter your API key and secret above</li>
                                        <li>Save credentials and click &quot;Authorize with Last.fm&quot;</li>
                                        <li>Complete the authorization process</li>
                                    </ol>
                                    <p className="mt-3"><strong>Features:</strong></p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>Direct scrobbling to Last.fm (independent of Navidrome)</li>
                                        <li>&quot;Now Playing&quot; updates</li>
                                        <li>Follows Last.fm scrobbling rules (30s minimum or 50% played)</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card> */}

                {/* Sidebar Customization */}
                <div className="break-inside-avoid mb-6">
                  <SidebarCustomization />
                </div>

                {/* Settings Management */}
                <div className="break-inside-avoid mb-6">
                  <SettingsManagement />
                </div>

                {/* Cache Management */}
                <div className="break-inside-avoid mb-6">
                  <CacheManagement />
                </div>

                <Card className="mb-6 break-inside-avoid py-5">
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize how the application looks and feels
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="theme-select">Color Theme</Label>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger id="theme-select">
                                    <SelectValue />
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

                        <div className="space-y-2">
                            <Label htmlFor="mode-select">Display Mode</Label>
                            <Select value={mode} onValueChange={setMode}>
                                <SelectTrigger id="mode-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            <p><strong>Theme:</strong> Choose from multiple color schemes including default (white)</p>
                            <p><strong>Display Mode:</strong> Choose light, dark, or system (follows your device preferences)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Theme Preview */}
                <Card className="mb-6 break-inside-avoid py-5">
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>
                            See how your theme looks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4 p-4 border rounded-lg">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-primary-foreground font-semibold">♪</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">Sample Song Title</p>
                                    <p className="text-sm text-muted-foreground">Sample Artist</p>
                                </div>
                                <div className="text-sm text-muted-foreground">3:42</div>
                            </div>
                            
                            <div className="flex space-x-2">
                                <div className="h-8 w-16 bg-secondary rounded"></div>
                                <div className="h-8 w-16 bg-accent rounded"></div>
                                <div className="h-8 w-16 bg-muted rounded"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Debug Section - Development Only */}
                {process.env.NODE_ENV === 'development' && (
                    <Card className="mb-6 break-inside-avoid py-5 border-orange-200 bg-orange-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                                <Settings className="w-5 h-5" />
                                Debug Tools
                            </CardTitle>
                            <CardDescription className="text-orange-600">
                                Development-only debugging utilities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={() => {
                                    // Save Navidrome config before clearing
                                    const navidromeConfig = localStorage.getItem('navidrome-config');
                                    
                                    // Clear all localStorage
                                    localStorage.clear();
                                    
                                    // Restore Navidrome config
                                    if (navidromeConfig) {
                                        localStorage.setItem('navidrome-config', navidromeConfig);
                                    }
                                    
                                    // Reload page to reset state
                                    window.location.reload();
                                }}
                                variant="outline"
                                className="w-full bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                            >
                                Clear All Data (Keep Navidrome Config)
                            </Button>
                            <p className="text-xs text-orange-600 mt-2">
                                This will clear all localStorage data except your Navidrome server configuration, then reload the page.
                            </p>
                        </CardContent>
                    </Card>
                )}
                </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;