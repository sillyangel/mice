'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { getGravatarUrl } from '@/lib/gravatar';
import { User as NavidromeUser } from '@/lib/navidrome';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface UserProfileProps {
  variant?: 'desktop' | 'mobile';
}

export function UserProfile({ variant = 'desktop' }: UserProfileProps) {
  const { api, isConnected } = useNavidrome();
  const [userInfo, setUserInfo] = useState<NavidromeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!api || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        const user = await api.getUserInfo();
        setUserInfo(user);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [api, isConnected]);

  const handleLogout = () => {
    // Clear Navidrome config and reload
    localStorage.removeItem('navidrome-config');
    window.location.reload();
  };

  if (!userInfo) {
    if (variant === 'desktop') {
      return (
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="w-4 h-4" />
          </Button>
        </Link>
      );
    } else {
      return (
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="w-4 h-4" />
          </Button>
        </Link>
      );
    }
  }

  const gravatarUrl = userInfo.email 
    ? getGravatarUrl(userInfo.email, variant === 'desktop' ? 32 : 48, 'identicon')
    : null;

  if (variant === 'desktop') {
    // Desktop: Only show profile icon
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 h-auto p-2">
            {gravatarUrl ? (
              <Image
                src={gravatarUrl}
                alt={`${userInfo.username}'s avatar`}
                width={16}
                height={16}
                className="rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            {gravatarUrl ? (
              <Image
                src={gravatarUrl}
                alt={`${userInfo.username}'s avatar`}
                width={16}
                height={16}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{userInfo.username}</p>
              {userInfo.email && (
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } else {
    // Mobile: Show only icon with dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 h-auto p-2">
            {gravatarUrl ? (
              <Image
                src={gravatarUrl}
                alt={`${userInfo.username}'s avatar`}
                width={16}
                height={16}
                className="rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            {gravatarUrl ? (
              <Image
                src={gravatarUrl}
                alt={`${userInfo.username}'s avatar`}
                width={16}
                height={16}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{userInfo.username}</p>
              {userInfo.email && (
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
