'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/app/components/ThemeProvider';

const SettingsPage = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Customize your music experience</p>
                </div>

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