'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNavidromeConfig } from '@/app/components/NavidromeConfigContext';
import { useToast } from '@/hooks/use-toast';
import { FaServer, FaUser, FaLock, FaCheck, FaTimes, FaLastfm } from 'react-icons/fa';

const SettingsPage = () => {
    const { theme, setTheme } = useTheme();
    const { config, updateConfig, isConnected, testConnection, clearConfig } = useNavidromeConfig();
    const { toast } = useToast();
    
    const [formData, setFormData] = useState({
        serverUrl: config.serverUrl,
        username: config.username,
        password: config.password
    });
    const [isTesting, setIsTesting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Last.fm scrobbling settings
    const [scrobblingEnabled, setScrobblingEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('lastfm-scrobbling-enabled') === 'true';
        }
        return true;
    });

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
        localStorage.setItem('lastfm-scrobbling-enabled', enabled.toString());
        toast({
            title: enabled ? "Scrobbling Enabled" : "Scrobbling Disabled",
            description: enabled 
                ? "Tracks will now be scrobbled to Last.fm via Navidrome" 
                : "Last.fm scrobbling has been disabled",
        });
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Customize your music experience</p>
                </div>

                <Card>
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

                <Card>
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

                <Card>
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

                        <div className="text-sm text-muted-foreground">
                            <p><strong>Theme:</strong> Choose between blue and violet color schemes</p>
                            <p><strong>Dark Mode:</strong> Automatically follows your system preferences</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Theme Preview */}
                <Card>
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
            </div>
        </div>
    );
};

export default SettingsPage;