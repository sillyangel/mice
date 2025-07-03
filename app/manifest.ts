import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mice',
    short_name: 'Mice',
    description: 'a very awesome navidrome client',
    start_url: '/',
    categories: ["music", "entertainment"],
    display_override: ['window-controls-overlay'],
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    icons: [
      { 
         src: '/favicon.ico', 
         type: 'image/x-icon', 
         sizes: '48x48'
      },
      { 
         src: '/icon-192.png', 
         type: 'image/png', 
         sizes: '192x192' 
      },
      { 
         src: '/icon-512.png', 
         type: 'image/png', 
         sizes: '512x512' 
      },
      { 
         src: '/icon-192-maskable.png', 
         type: 'image/png', 
         sizes: '192x192', 
         purpose: 'maskable' 
      },
      { 
         src: './icon-512-maskable.png', 
         type: 'image/png', 
         sizes: '512x512', 
         purpose: 'maskable'
      }
   ],
      screenshots: [
         {
         src: '/home-preview.png',
         sizes: '1920x1020',
         type: 'image/png',
         label: 'Home Preview',
         form_factor: 'wide'
         },
         {
         src: '/browse-preview.png',
         sizes: '1920x1020',
         type: 'image/png',
         label: 'Browse Preview',
         form_factor: 'wide'
         },
         {
         src: '/album-preview.png',
         sizes: '1920x1020',
         type: 'image/png',
         label: 'Album Preview',
         form_factor: 'wide'
         },
         {
         src: '/fullscreen-preview.png',
         sizes: '1920x1020',
         type: 'image/png',
         label: 'Fullscreen Preview',
         form_factor: 'wide'
         }
      ],
      shortcuts: [
         {
            name: 'Resume Song',
            short_name: 'Resume',
            description: 'Resume the last played song',
            url: '/?action=resume',
            icons: [
               {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png'
               }
            ]
         },
         {
            name: 'Play Recent Albums',
            short_name: 'Recent',
            description: 'Play from recently added albums',
            url: '/?action=recent',
            icons: [
               {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png'
               }
            ]
         },
         {
            name: 'Shuffle Favorites',
            short_name: 'Shuffle',
            description: 'Shuffle songs from favorite artists',
            url: '/?action=shuffle-favorites',
            icons: [
               {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png'
               }
            ]
         }
      ]
  }
}