import { useCallback } from "react";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { Github, Mail } from "lucide-react"
import {
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarLabel,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
  } from "@/components/ui/menubar"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from '@/components/ui/separator';
import { useNavidrome } from "./NavidromeContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

    // For this demo, we'll show connection status instead of user auth
    const connectionStatus = isConnected ? "Connected to Navidrome" : "Not connected";

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
      <div className="flex items-center justify-between w-full">
        <Menubar
          className="rounded-none border-b border-none px-0 lg:px-0 flex-1"
          style={{
            minWidth: 0,
            WebkitAppRegion: "drag"
          } as React.CSSProperties}
        >
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} className="flex items-center gap-2">
        <MenubarMenu>
        <MenubarTrigger className="font-bold">mice</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => setOpen(true)}>About Music</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => router.push('/settings')}>
            Preferences <MenubarShortcut>⌘,</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => isClient && window.close()}>
            Quit Music <MenubarShortcut>⌘Q</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
          </MenubarMenu>
          <div className="border-r-4 w-0"><p className="invisible">j</p></div>
          <MenubarMenu>
        <MenubarTrigger className="relative">File</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>New</MenubarSubTrigger>
            <MenubarSubContent className="w-[230px]">
          <MenubarItem>
            Playlist <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Playlist from Selection <MenubarShortcut>⇧⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Smart Playlist <MenubarShortcut>⌥⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>Playlist Folder</MenubarItem>
          <MenubarItem disabled>Genius Playlist</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem>
            Open Stream URL <MenubarShortcut>⌘U</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Close Window <MenubarShortcut>⌘W</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Library</MenubarSubTrigger>
            <MenubarSubContent>
          <MenubarItem>Update Cloud Library</MenubarItem>
          <MenubarItem>Update Genius</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Organize Library</MenubarItem>
          <MenubarItem>Export Library</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Import Playlist</MenubarItem>
          <MenubarItem disabled>Export Playlist</MenubarItem>
          <MenubarItem>Show Duplicate Items</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Get Album Artwork</MenubarItem>
          <MenubarItem disabled>Get Track Names</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem>
            Import <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>Burn Playlist to Disc</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Show in Finder <MenubarShortcut>⇧⌘R</MenubarShortcut>{" "}
          </MenubarItem>
          <MenubarItem>Convert</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Page Setup</MenubarItem>
          <MenubarItem disabled>
            Print <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>
            Undo <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem disabled>
            Cut <MenubarShortcut>⌘X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Copy <MenubarShortcut>⌘C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Paste <MenubarShortcut>⌘V</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Select All <MenubarShortcut>⌘A</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Deselect All <MenubarShortcut>⇧⌘A</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Smart Dictation{" "}
            <MenubarShortcut>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4"
            viewBox="0 0 24 24"
          >
            <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
            <circle cx="17" cy="7" r="5" />
          </svg>
            </MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Emoji & Symbols{" "}
            <MenubarShortcut>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
          </svg>
            </MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem disabled>Show Playing Next</MenubarCheckboxItem>
          <MenubarCheckboxItem disabled>Show Lyrics</MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem inset onClick={toggleStatusBar}>
            {isStatusBarVisible ? "Hide Status Bar" : "Show Status Bar"}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset onClick={toggleSidebar}>
            {isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem inset onClick={handleFullScreen}>
            {isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
          </MenubarItem>
        </MenubarContent>
          </MenubarMenu>
          </div>
        </Menubar>
        
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
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
            <span className="text-xs truncate max-w-[160px] text-right">
              {!isClient ? (
                <span className="italic text-gray-400">Loading...</span>
              ) : navidromeUrl ? (
                navidromeUrl
              ) : (
                <span className="italic text-gray-400">Not set</span>
              )}
            </span>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="flex flex-col items-center gap-1 mt-2">
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
