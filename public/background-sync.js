// Background sync service worker for StillNavidrome
// This enhances the main service worker to support automatic background sync

// Cache version identifier - update when cache structure changes
const BACKGROUND_SYNC_CACHE = 'stillnavidrome-background-sync-v1';

// Interval for background sync (in minutes)
const SYNC_INTERVAL_MINUTES = 60;

// List of APIs to keep fresh in cache
const BACKGROUND_SYNC_APIS = [
  '/api/getAlbums',
  '/api/getArtists',
  '/api/getPlaylists',
  '/rest/getStarred',
  '/rest/getPlayQueue',
  '/rest/getRecentlyPlayed'
];

// Listen for the install event
self.addEventListener('install', (event) => {
  console.log('[Background Sync] Service worker installing...');
  event.waitUntil(
    // Create cache for background sync
    caches.open(BACKGROUND_SYNC_CACHE).then(cache => {
      console.log('[Background Sync] Cache opened');
      // Initial cache population would happen in the activate event
      // to avoid any conflicts with the main service worker
    })
  );
});

// Listen for the activate event
self.addEventListener('activate', (event) => {
  console.log('[Background Sync] Service worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any old caches that don't match our current version
          if (cacheName.startsWith('stillnavidrome-background-sync-') && cacheName !== BACKGROUND_SYNC_CACHE) {
            console.log('[Background Sync] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Start background sync scheduler
  initBackgroundSync();
});

// Initialize background sync scheduler
function initBackgroundSync() {
  console.log('[Background Sync] Initializing background sync scheduler');
  
  // Set up periodic sync if available (modern browsers)
  if ('periodicSync' in self.registration) {
    self.registration.periodicSync.register('background-library-sync', {
      minInterval: SYNC_INTERVAL_MINUTES * 60 * 1000 // Convert to milliseconds
    }).then(() => {
      console.log('[Background Sync] Registered periodic sync');
    }).catch(error => {
      console.error('[Background Sync] Failed to register periodic sync:', error);
      // Fall back to manual interval as backup
      setupManualSyncInterval();
    });
  } else {
    // Fall back to manual interval for browsers without periodicSync
    console.log('[Background Sync] PeriodicSync not available, using manual interval');
    setupManualSyncInterval();
  }
}

// Set up manual sync interval as fallback
function setupManualSyncInterval() {
  // Use service worker's setInterval (be careful with this in production)
  setInterval(() => {
    if (navigator.onLine) {
      console.log('[Background Sync] Running manual background sync');
      performBackgroundSync();
    }
  }, SYNC_INTERVAL_MINUTES * 60 * 1000); // Convert to milliseconds
}

// Listen for periodic sync events
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'background-library-sync') {
    console.log('[Background Sync] Periodic sync event triggered');
    event.waitUntil(performBackgroundSync());
  }
});

// Listen for message events (for manual sync triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
    console.log('[Background Sync] Manual sync triggered from client');
    event.waitUntil(performBackgroundSync().then(() => {
      // Notify the client that sync is complete
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'BACKGROUND_SYNC_COMPLETE' });
      }
    }));
  }
});

// Perform the actual background sync
async function performBackgroundSync() {
  console.log('[Background Sync] Starting background sync');
  
  // Check if we're online before attempting sync
  if (!navigator.onLine) {
    console.log('[Background Sync] Device is offline, skipping sync');
    return;
  }
  
  try {
    // Get server config from IndexedDB
    const config = await getNavidromeConfig();
    
    if (!config || !config.serverUrl) {
      console.log('[Background Sync] No server configuration found, skipping sync');
      return;
    }
    
    // Get authentication token
    const authToken = await getAuthToken(config);
    
    if (!authToken) {
      console.log('[Background Sync] Failed to get auth token, skipping sync');
      return;
    }
    
    // Perform API requests to refresh cache
    const apiResponses = await Promise.all(BACKGROUND_SYNC_APIS.map(apiPath => {
      return refreshApiCache(config.serverUrl, apiPath, authToken);
    }));
    
    // Process recently played data to update listening streak
    await updateListeningStreakData(apiResponses);
    
    // Update last sync timestamp
    await updateLastSyncTimestamp();
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('[Background Sync] Background sync completed successfully');
  } catch (error) {
    console.error('[Background Sync] Error during background sync:', error);
  }
}

// Get Navidrome config from IndexedDB
async function getNavidromeConfig() {
  return new Promise((resolve) => {
    // Try to get from localStorage first (simplest approach)
    if (typeof self.localStorage !== 'undefined') {
      try {
        const configJson = self.localStorage.getItem('navidrome-config');
        if (configJson) {
          resolve(JSON.parse(configJson));
          return;
        }
      } catch (e) {
        console.error('[Background Sync] Error reading from localStorage:', e);
      }
    }
    
    // Fallback to IndexedDB
    const request = indexedDB.open('stillnavidrome-offline', 1);
    
    request.onerror = () => {
      console.error('[Background Sync] Failed to open IndexedDB');
      resolve(null);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const getRequest = store.get('navidrome-config');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result ? getRequest.result.value : null);
      };
      
      getRequest.onerror = () => {
        console.error('[Background Sync] Error getting config from IndexedDB');
        resolve(null);
      };
    };
    
    request.onupgradeneeded = () => {
      // This shouldn't happen here - the DB should already be set up
      console.error('[Background Sync] IndexedDB needs upgrade, skipping config retrieval');
      resolve(null);
    };
  });
}

// Get authentication token for API requests
async function getAuthToken(config) {
  try {
    const response = await fetch(`${config.serverUrl}/rest/ping`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${config.username}:${config.password}`)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Auth failed with status: ${response.status}`);
    }
    
    // Extract token from response
    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('[Background Sync] Authentication error:', error);
    return null;
  }
}

// Refresh specific API cache
async function refreshApiCache(serverUrl, apiPath, authToken) {
  try {
    // Construct API URL
    const apiUrl = `${serverUrl}${apiPath}`;
    
    // Make the request with authentication
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    // Clone the response to store in cache
    const responseToCache = response.clone();
    
    // Open the cache and store the response
    const cache = await caches.open(BACKGROUND_SYNC_CACHE);
    await cache.put(apiUrl, responseToCache);
    
    console.log(`[Background Sync] Successfully updated cache for: ${apiPath}`);
    return response.json(); // Return parsed data for potential use
  } catch (error) {
    console.error(`[Background Sync] Failed to refresh cache for ${apiPath}:`, error);
    throw error;
  }
}

// Process recently played data to update listening streak
async function updateListeningStreakData(apiResponses) {
  try {
    // Find the recently played response
    const recentlyPlayedResponse = apiResponses.find(response => 
      response && response.data && Array.isArray(response.data.song)
    );
    
    if (!recentlyPlayedResponse) {
      console.log('[Background Sync] No recently played data found');
      return;
    }
    
    const recentlyPlayed = recentlyPlayedResponse.data.song;
    if (!recentlyPlayed || recentlyPlayed.length === 0) {
      return;
    }
    
    // Get existing streak data
    let streakData;
    try {
      const streakDataRaw = localStorage.getItem('navidrome-streak-data');
      const streakStats = localStorage.getItem('navidrome-streak-stats');
      
      if (streakDataRaw && streakStats) {
        const dataMap = new Map();
        const parsedData = JSON.parse(streakDataRaw);
        
        // Reconstruct the streak data
        Object.entries(parsedData).forEach(([key, value]) => {
          dataMap.set(key, {
            ...value,
            uniqueArtists: new Set(value.uniqueArtists),
            uniqueAlbums: new Set(value.uniqueAlbums)
          });
        });
        
        streakData = {
          data: dataMap,
          stats: JSON.parse(streakStats)
        };
      }
    } catch (e) {
      console.error('[Background Sync] Failed to parse existing streak data:', e);
      return;
    }
    
    if (!streakData) {
      console.log('[Background Sync] No existing streak data found');
      return;
    }
    
    // Process recently played tracks
    let updated = false;
    recentlyPlayed.forEach(track => {
      if (!track.played) return;
      
      // Parse play date (format: 2023-10-15T14:32:45Z)
      const playDate = new Date(track.played);
      const dateKey = playDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // If we already have data for this date, update it
      let dayData = streakData.data.get(dateKey);
      if (!dayData) {
        // Create new day data
        dayData = {
          date: dateKey,
          tracks: 0,
          uniqueArtists: new Set(),
          uniqueAlbums: new Set(),
          totalListeningTime: 0
        };
      }
      
      // Update day data with this track
      dayData.tracks += 1;
      dayData.uniqueArtists.add(track.artistId);
      dayData.uniqueAlbums.add(track.albumId);
      dayData.totalListeningTime += track.duration || 0;
      
      // Update the map
      streakData.data.set(dateKey, dayData);
      updated = true;
    });
    
    // If we updated streak data, save it back
    if (updated) {
      // Convert Map to a plain object for serialization
      const dataObject = {};
      
      streakData.data.forEach((value, key) => {
        dataObject[key] = {
          ...value,
          uniqueArtists: Array.from(value.uniqueArtists),
          uniqueAlbums: Array.from(value.uniqueAlbums)
        };
      });
      
      // Update stats based on new data
      const updatedStats = calculateStreakStats(streakData.data);
      
      // Save back to localStorage
      localStorage.setItem('navidrome-streak-data', JSON.stringify(dataObject));
      localStorage.setItem('navidrome-streak-stats', JSON.stringify(updatedStats));
      
      console.log('[Background Sync] Updated listening streak data');
    }
  } catch (error) {
    console.error('[Background Sync] Failed to update listening streak data:', error);
  }
}

// Calculate streak statistics based on data
function calculateStreakStats(streakData) {
  const STREAK_THRESHOLD_TRACKS = 3;
  const STREAK_THRESHOLD_TIME = 5 * 60; // 5 minutes
  
  // Get active days (that meet threshold)
  const activeDays = [];
  streakData.forEach((dayData, dateKey) => {
    if (dayData.tracks >= STREAK_THRESHOLD_TRACKS || 
        dayData.totalListeningTime >= STREAK_THRESHOLD_TIME) {
      activeDays.push(dateKey);
    }
  });
  
  // Sort dates newest first
  activeDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();
  
  // Keep checking consecutive days backward until streak breaks
  while (true) {
    const dateString = checkDate.toISOString().split('T')[0];
    if (activeDays.includes(dateString)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1); // Go back one day
    } else {
      break; // Streak broken
    }
  }
  
  // Get total active days
  const totalDaysListened = activeDays.length;
  
  // Get longest streak (requires analyzing all streaks)
  let longestStreak = currentStreak;
  let tempStreak = 0;
  
  // Sort dates in ascending order for streak calculation
  const ascDates = [...activeDays].sort();
  
  for (let i = 0; i < ascDates.length; i++) {
    const currentDate = new Date(ascDates[i]);
    
    if (i > 0) {
      const prevDate = new Date(ascDates[i-1]);
      prevDate.setDate(prevDate.getDate() + 1);
      
      // If dates are consecutive
      if (currentDate.getTime() === prevDate.getTime()) {
        tempStreak++;
      } else {
        // Streak broken
        tempStreak = 1;
      }
    } else {
      tempStreak = 1; // First active day
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
  }
  
  // Get last listened date
  const lastListenedDate = activeDays.length > 0 ? activeDays[0] : null;
  
  return {
    currentStreak,
    longestStreak,
    totalDaysListened,
    lastListenedDate
  };
}

// Update the last sync timestamp in IndexedDB
async function updateLastSyncTimestamp() {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    
    const request = indexedDB.open('stillnavidrome-offline', 1);
    
    request.onerror = () => {
      console.error('[Background Sync] Failed to open IndexedDB for timestamp update');
      reject(new Error('Failed to open IndexedDB'));
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const lastSyncData = {
        key: 'background-sync-last-timestamp',
        value: timestamp,
        lastUpdated: timestamp
      };
      
      const putRequest = store.put(lastSyncData);
      
      putRequest.onsuccess = () => {
        console.log('[Background Sync] Updated last sync timestamp:', new Date(timestamp).toISOString());
        resolve(timestamp);
      };
      
      putRequest.onerror = () => {
        console.error('[Background Sync] Failed to update last sync timestamp');
        reject(new Error('Failed to update timestamp'));
      };
    };
  });
}

// Listen for fetch events to serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle API requests that we're syncing in the background
  const url = new URL(event.request.url);
  const isBackgroundSyncApi = BACKGROUND_SYNC_APIS.some(api => url.pathname.includes(api));
  
  if (isBackgroundSyncApi) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached response if available
        if (cachedResponse) {
          // Always try to refresh cache in the background if online
          if (navigator.onLine) {
            event.waitUntil(
              fetch(event.request).then(response => {
                return caches.open(BACKGROUND_SYNC_CACHE).then(cache => {
                  cache.put(event.request, response.clone());
                  return response;
                });
              }).catch(error => {
                console.log('[Background Sync] Background refresh failed, using cache:', error);
              })
            );
          }
          return cachedResponse;
        }
        
        // If no cache, try network and cache the result
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response to store in cache
          const responseToCache = response.clone();
          
          caches.open(BACKGROUND_SYNC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(error => {
          console.error('[Background Sync] Fetch failed and no cache available:', error);
          // Could return a custom offline response here
          throw error;
        });
      })
    );
  }
});
