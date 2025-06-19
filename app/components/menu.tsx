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
      
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [router, toggleSidebar, handleFullScreen]);

    return (
      <>
      <Menubar className="rounded-none border-b border-none px-2 lg:px-4">
        <MenubarMenu>
          <MenubarTrigger className="font-bold">offbrand spotify</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setOpen(true)}>About Music</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => router.push('/settings')}>
              Preferences <MenubarShortcut>⌘,</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Hide Music <MenubarShortcut>⌘H</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Hide Others <MenubarShortcut>⇧⌘H</MenubarShortcut>
            </MenubarItem>
            <MenubarShortcut />
            <MenubarItem>
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
        <MenubarMenu>
          <MenubarTrigger className="hidden md:block">Account</MenubarTrigger>
          <MenubarContent forceMount>
            <MenubarLabel>Server Status</MenubarLabel>
            <MenubarItem>{connectionStatus}</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => router.push('/settings')}>
              Settings
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Image
                  src="/splash.png"
                  alt="music"
                  width={400}
                  height={400}
                  />
              </div>
              <Separator />
              <p>
                a music player that doesn&apos;t (yet) play music
              </p>
                <div className="flex space-x-4">
                <a href="https://github.com/sillyangel/project-still" target="_blank" rel="noreferrer">
                  <Github />
                </a>
                <a href="mailto:angel@sillyangel.xyz">
                  <Mail />
                </a>
                </div>
            </div>
          </DialogContent>
        </Dialog>
        </>
    )
  }
