![splash](https://github.com/sillyangel/mice/blob/main/4xnored.png?raw=true)
# mice (project still reworked)
> project still, now with navidrome

> project based on [shadcn/ui](https://github.com/shadcn-ui/ui)'s music template

This is a modern music streaming web application built with [Next.js](https://nextjs.org/) and [shadcn/ui](https://ui.shadcn.com/), now powered by **Navidrome** for a complete self-hosted music streaming experience.

**✨ New**: Migrated from Firebase + static data to **Navidrome/Subsonic** integration for real music streaming!

### Features

- 🎵 **Real Music Streaming** via Navidrome/Subsonic API
- 📱 **Modern UI** with shadcn/ui components
- 🎨 **Dynamic Album Artwork** from your music library
- ⭐ **Favorites** - Star albums, artists, and songs
- 📋 **Playlist Management** - Create and manage playlists
- 🔍 **Search** - Find music across your entire library
- 🎧 **Audio Player** with queue management
- 📊 **Scrobbling** - Track your listening history

### Preview
![preview](https://github.com/sillyangel/mice/blob/main/public/screen.png?raw=true)

## Quick Start

### Prerequisites
- [Navidrome](https://www.navidrome.org/) server running
- Node.js 18+ and pnpm

### Setup

1. **Clone and install**

```bash
git clone https://github.com/sillyangel/project-still.git
cd project-still/
pnpm install
```

2. **Configure Navidrome connection**

```bash
cp .env.example .env
```

Edit `.env.local` with your Navidrome server details:

```env
NEXT_PUBLIC_NAVIDROME_URL=http://localhost:4533
NEXT_PUBLIC_NAVIDROME_USERNAME=your_username
NEXT_PUBLIC_NAVIDROME_PASSWORD=your_password
```

3. **Run the development server**

```bash
pnpm dev
```

Open [http://localhost:40625](http://localhost:40625) in your browser.

## Migration from Firebase

This project was migrated from Firebase to Navidrome. See [NAVIDROME_MIGRATION.md](./NAVIDROME_MIGRATION.md) for detailed migration notes and troubleshooting.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Navidrome (Subsonic API compatible)
- **Audio**: Web Audio API with streaming
- **State**: React Context for global state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your Navidrome server
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Navidrome](https://www.navidrome.org/) for the amazing music server
- [Subsonic API](http://www.subsonic.org/pages/api.jsp) for the API specification
