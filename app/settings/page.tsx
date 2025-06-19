import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const SettingsPage = () => {
    return (
        <div className="container mx-auto p-4">
                    <Label>Theme</Label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue>Light</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                    </Select>
        </div>
    );
};

export default SettingsPage;