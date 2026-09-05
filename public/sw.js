/*
	Service Worker for Mice (Navidrome client)

	Caching policy:
	- The website itself (HTML, JS, CSS, next assets) is NEVER cached. Every load
	  fetches from the network, so new deployments take effect immediately.
	- Images (album covers, avatars, getCoverArt): cached, revalidated hourly.
	- Library data (/rest/* read endpoints): cached per-endpoint TTL (default 1h,
	  search/nowplaying shorter), revalidated when stale. Mutation endpoints
	  (star, scrobble, playlists, ...) bypass the cache and purge it.
	- Audio streams, downloads, and everything else: network only.
*/

/* global self, caches */

const VERSION = '1';
const CACHE_NAME = `mice-cache-${VERSION}`;
const HOUR = 60 * 60 * 1000;

// Upper bound on cached entries so heavy browsing (many covers) can never
// exhaust the browser's storage quota. Oldest entries are evicted first.
const MAX_CACHE_ENTRIES = 500;

// Read-only library endpoints that are safe to cache. Everything else under
// /rest/ (stream, download, star, scrobble, playlist edits, ...) hits network.
const LIBRARY_ENDPOINTS = new Set([
	'getAlbumList2', 'getAlbum', 'getAlbumInfo', 'getAlbumInfo2',
	'getArtist', 'getArtists', 'getArtistInfo', 'getArtistInfo2',
	'getPlaylists', 'getPlaylist',
	'search3', 'search2',
	'getUser',
	'getStarred', 'getStarred2', 'getRandomSongs', 'getSongsByGenre', 'getGenres',
	'getNowPlaying', 'getSong', 'getSongLyrics', 'getLyrics', 'getLyricsBySongId',
	'getRadioStations', 'getInternetRadioStations', 'getRadioStation',
	'getRecordArtists', 'getRecordAlbums', 'getSimilarSongs', 'getSimilarSongs2',
	'getSongSimilarity', 'getDiscList',
]);

const TTL_OVERRIDES = new Map([
	['getNowPlaying', 60 * 1000],
	['search3', 10 * 60 * 1000],
	['search2', 10 * 60 * 1000],
	['getLyrics', 6 * HOUR],
	['getLyricsBySongId', 6 * HOUR],
	['getSongLyrics', 6 * HOUR],
	['getUser', 6 * HOUR],
]);

// Endpoints that change state. They are never cached and clear cached library
// data so reads don't return stale favorites/playlists.
const MUTATING_ENDPOINTS = new Set([
	'star', 'unstar', 'setRating', 'scrobble', 'unscrobble',
	'createPlaylist', 'updatePlaylist', 'deletePlaylist',
	'savePlayQueue', 'createBookmark', 'deleteBookmark',
	'createInternetRadioStation', 'updateInternetRadioStation', 'deleteInternetRadioStation',
	'reportPlayback', 'playbackReport', 'setFavorite', 'addToFavorites', 'removeFavorites',
	'addToPlaylist', 'removeFromPlaylist', 'startScan',
]);

// Auth (and response-format) params that identify a session, not data. They are
// dropped from cache keys so per-request salts don't defeat reuse, and their
// values never leak into cache entries.
const AUTH_PARAMS = new Set(['u', 't', 's', 'v', 'c', 'f', '_']);

const now = () => Date.now();

self.addEventListener('install', (event) => {
	// Take over as soon as this SW is finished installing.
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
			await self.clients.claim();
		})()
	);
});

// Persist a response plus its fetch-time metadata under `key` + `key:meta`.
async function putTimed(cache, key, response, ttlMs) {
	if (!response || response.status >= 400) return;
	await cache.put(key, response.clone());
	await cache.put(key + ':meta', new Response(JSON.stringify({ ts: now(), ttl: ttlMs })));
	enforceLimit(cache).catch(() => {});
}

// Keep the cache bounded: evict the oldest entries (data + their meta) once
// the entry count exceeds MAX_CACHE_ENTRIES.
async function enforceLimit(cache) {
	const keys = (await cache.keys()).filter((k) => !k.url.endsWith(':meta'));
	if (keys.length <= MAX_CACHE_ENTRIES) return;
	const stamp = await Promise.all(keys.map(async (k) => {
		let ts = 0;
		try {
			const meta = await cache.match(k.url + ':meta');
			if (meta) ts = (await meta.json()).ts;
		} catch {}
		return { k, ts };
	}));
	stamp.sort((a, b) => a.ts - b.ts);
	const victims = stamp.slice(0, keys.length - MAX_CACHE_ENTRIES);
	await Promise.all(victims.map(({ k }) => Promise.all([cache.delete(k), cache.delete(k.url + ':meta')])));
}

// Read a cached entry. Returns { res, fresh } or null.
async function readTimed(cache, key) {
	const res = await cache.match(key);
	const meta = await cache.match(key + ':meta');
	if (!res || !meta) return null;
	try {
		const { ts, ttl } = await meta.json();
		return { res, fresh: now() - ts < ttl };
	} catch {
		return null;
	}
}

function libraryKey(req) {
	const url = new URL(req.url);
	const kept = [];
	for (const [k, v] of new URLSearchParams(url.search)) {
		if (AUTH_PARAMS.has(k) || v === '' || v === undefined) continue;
		kept.push(`${k}=${v}`);
	}
	kept.sort();
	return `${url.origin}${url.pathname}${kept.length ? '?' + kept.join('&') : ''}`;
}

function restEndpoint(req) {
	const m = new URL(req.url).pathname.match(/\/rest\/([A-Za-z0-9_.-]+)/);
	return m ? m[1] : null;
}

function isCoverRequest(req) {
	const endpoint = restEndpoint(req);
	return endpoint === 'getCoverArt' || req.destination === 'image';
}

async function purgeLibraryData(cache) {
	const keys = await cache.keys();
	await Promise.all(keys.filter((k) => k.url.includes('/rest/')).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);

	// Images: cache-first, revalidate when older than an hour.
	if (isCoverRequest(req)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_NAME);
				const hit = await readTimed(cache, url.href);
				if (hit) {
					if (hit.fresh) return hit.res;
					// Stale: refresh in the background, still serve the cached copy.
					fetch(req)
						.then((res) => putTimed(cache, url.href, res, HOUR))
						.catch(() => {});
					return hit.res;
				}
				try {
					const res = await fetch(req);
					if (res.status < 400) {
						await putTimed(cache, url.href, res, HOUR);
						return res;
					}
					return res;
				} catch {
					// Offline: fall back to whatever we have cached.
					const fallback = await cache.match(url.href);
					return fallback || Response.error();
				}
			})()
		);
		return;
	}

	// Library data: GET /rest/<read endpoint>. Serve from cache while fresh,
	// refetch when stale, fall back to cached when offline.
	if (req.method === 'GET' && url.pathname.includes('/rest/')) {
		const endpoint = restEndpoint(req);
		if (endpoint && MUTATING_ENDPOINTS.has(endpoint)) {
			// Mutations: never cache; purge stale cached reads in the background.
			event.respondWith(fetch(req));
			caches.open(CACHE_NAME).then(purgeLibraryData).catch(() => {});
			return;
		}
		if (endpoint && LIBRARY_ENDPOINTS.has(endpoint)) {
			event.respondWith(
				(async () => {
					const cache = await caches.open(CACHE_NAME);
					const key = libraryKey(req);
					const ttl = TTL_OVERRIDES.get(endpoint) ?? HOUR;
					const hit = await readTimed(cache, key);
					if (hit) {
						if (hit.fresh) return hit.res;
						// Stale: revalidate in the background, serve cached copy now.
						fetch(req).then((res) => putTimed(cache, key, res, ttl)).catch(() => {});
						return hit.res;
					}
					try {
						const res = await fetch(req);
						await putTimed(cache, key, res, ttl);
						return res;
					} catch {
						const fallback = await cache.match(key);
						return fallback || Response.error();
					}
				})()
			);
			return;
		}
	}

	// HTML, JS, CSS, fonts, next assets, streams, downloads, POSTs: network only.
	event.respondWith(fetch(req));
});