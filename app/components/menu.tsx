import { useCallback } from "react";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { useState, useEffect } from "react"
import { Separator } from '@/components/ui/separator';
import { useNavidrome } from "./NavidromeContext";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"

interface MenuProps {
  toggleSidebar: () => void;
  isSidebarVisible: boolean;
  toggleStatusBar: () => void;
  isStatusBarVisible: boolean;
}

export function Menu({ toggleSidebar, isSidebarVisible, toggleStatusBar, isStatusBarVisible }: MenuProps) {
    const [isFullScreen, setIsFullScreen] = useState(false)
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { isConnected } = useNavidrome();
    const [isClient, setIsClient] = useState(false);
    const [navidromeUrl, setNavidromeUrl] = useState<string | null>(null);

    // Navigation items for mobile menu
    const handleFullScreen = useCallback(() => {
      if (!isFullScreen) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      setIsFullScreen(!isFullScreen)
    }, [isFullScreen])

    useEffect(() => {
        setIsClient(true);
        
        // Get Navidrome URL from localStorage
        const config = localStorage.getItem("navidrome-config");
        if (config) {
            try {
                const { serverUrl } = JSON.parse(config);
                if (serverUrl) {
                    // Remove protocol (http:// or https://) and trailing slash
                    const prettyUrl = serverUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
                    setNavidromeUrl(prettyUrl);
                } else {
                    setNavidromeUrl(null);
                }
            } catch {
                setNavidromeUrl(null);
            }
        } else {
            setNavidromeUrl(null);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === ',') {
                event.preventDefault();
                router.push('/settings');
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                toggleSidebar();
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
              event.preventDefault();
              handleFullScreen();
            }
        };
      
        if (isClient) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (isClient) {
                window.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [router, toggleSidebar, handleFullScreen, isClient]);

    return (
      <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-100 p-0 overflow-hidden">
          <div className=" px-6 pt-8 pb-6 flex flex-col items-center">
        <Image
          src="/icon-512.png"
          alt="music"
          width={80}
          height={80}
          className="rounded-2xl shadow-md mb-4"
        />
        <h1 className="text-3xl font-semibold mb-1 tracking-tight">mice</h1>
        {/* <span className="text-xs text-muted-foreground mb-2">Version 1.0.0</span> */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          A Navidrome client built with Next.js and Shadcn/UI.
        </p>
        <Separator className="my-2" />
        <div className="w-full flex flex-col gap-2 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Server Status</span>
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-400"} `} style={{ marginTop: "-2px" }} />
              <p className={isConnected ? "text-green-600" : "text-red-500"}>{isConnected ? "Connected" : "Not connected"}</p>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Navidrome URL</span>
            <span className="text-xs truncate max-w-40 text-right">
              {!isClient ? (
                <span className="italic text-gray-400">Loading...</span>
              ) : navidromeUrl ? (
                navidromeUrl
              ) : (
                <span className="italic text-gray-400">Auto-configured</span>
              )}
            </span>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="flex flex-col items-center gap-1 mt-2">
          <span className="text-xs text-muted-foreground">
            Commit: {process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown'}
          </span>
          <span className="text-xs text-muted-foreground">Copyright © {new Date().getFullYear()} <a
            href="https://github.com/sillyangel"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
           sillyangel
          </a></span>
          
        </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
    )
  }
