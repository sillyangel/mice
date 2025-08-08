/*
	Service Worker for Mice (Navidrome client)
	- App shell caching for offline load
	- Audio download/cache for offline playback
	- Image/runtime caching
	- Message-based controls used by use-offline-downloads hook
*/

/* global self, caches, clients */
const VERSION = 'v2';
const APP_SHELL_CACHE = `mice-app-shell-${VERSION}`;
const AUDIO_CACHE = `mice-audio-${VERSION}`;
const IMAGE_CACHE = `mice-images-${VERSION}`;
const META_CACHE = `mice-meta-${VERSION}`; // stores small JSON manifests and indices

// Core assets to precache (safe, static public files)
const APP_SHELL = [
	'/',
	'/favicon.ico',
	'/manifest.json',
	'/icon-192.png',
	'/icon-192-maskable.png',
	'/icon-512.png',
	'/icon-512-maskable.png',
	'/apple-touch-icon.png',
	'/apple-touch-icon-precomposed.png',
];

// Utility: post message back to a MessageChannel port safely
function replyPort(event, type, data) {
	try {
		if (event && event.ports && event.ports[0]) {
			event.ports[0].postMessage({ type, data });
		} else if (self.clients && event.source && event.source.postMessage) {
			// Fallback to client postMessage (won't carry response to specific channel)
			event.source.postMessage({ type, data });
		}
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('SW reply failed:', e);
	}
}

// Utility: fetch and put into a cache with basic error handling
async function fetchAndCache(request, cacheName) {
	const cache = await caches.open(cacheName);
	const req = typeof request === 'string' ? new Request(request) : request;
	// Try normal fetch first to preserve CORS and headers; fall back to no-cors if it fails
	let res = await fetch(req).catch(() => null);
	if (!res) {
		const reqNoCors = new Request(req, { mode: 'no-cors' });
		res = await fetch(reqNoCors).catch(() => null);
		if (!res) throw new Error('Network failed');
		await cache.put(reqNoCors, res.clone());
		return res;
	}
	await cache.put(req, res.clone());
	return res;
}

// Utility: put small JSON under META_CACHE at a logical URL key
async function putJSONMeta(keyUrl, obj) {
	const cache = await caches.open(META_CACHE);
	const res = new Response(JSON.stringify(obj), {
		headers: { 'content-type': 'application/json', 'x-sw-meta': '1' },
	});
	await cache.put(new Request(keyUrl), res);
}

async function getJSONMeta(keyUrl) {
	const cache = await caches.open(META_CACHE);
	const res = await cache.match(new Request(keyUrl));
	if (!res) return null;
	try {
		return await res.json();
	} catch {
		return null;
	}
}

async function deleteMeta(keyUrl) {
	const cache = await caches.open(META_CACHE);
	await cache.delete(new Request(keyUrl));
}

// Manifest helpers
function albumManifestKey(albumId) {
	return `/offline/albums/${encodeURIComponent(albumId)}`;
}
function songManifestKey(songId) {
	return `/offline/songs/${encodeURIComponent(songId)}`;
}

// Build cover art URL using the same auth tokens from media URL (stream or download)
function buildCoverArtUrlFromStream(streamUrl, coverArtId) {
	try {
		const u = new URL(streamUrl);
		// copy params needed
		const searchParams = new URLSearchParams(u.search);
		const needed = new URLSearchParams({
			u: searchParams.get('u') || '',
			t: searchParams.get('t') || '',
			s: searchParams.get('s') || '',
			v: searchParams.get('v') || '',
			c: searchParams.get('c') || 'miceclient',
			id: coverArtId || '',
		});
		return `${u.origin}/rest/getCoverArt?${needed.toString()}`;
	} catch {
		return null;
	}
}

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(APP_SHELL_CACHE);
			await cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' })));
			// Force activate new SW immediately
			await self.skipWaiting();
		})()
	);
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((k) => ![APP_SHELL_CACHE, AUDIO_CACHE, IMAGE_CACHE, META_CACHE].includes(k))
					.map((k) => caches.delete(k))
			);
			await self.clients.claim();
		})()
	);
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);

	// Custom offline song mapping: /offline-song-<songId>
	// Handle this EARLY, including Range requests, by mapping to the cached streamUrl
	const offlineSongMatch = url.pathname.match(/^\/offline-song-([\w-]+)/);
	if (offlineSongMatch) {
		const songId = offlineSongMatch[1];
		event.respondWith(
			(async () => {
				const meta = await getJSONMeta(songManifestKey(songId));
				if (meta && meta.streamUrl) {
					const cache = await caches.open(AUDIO_CACHE);
					const match = await cache.match(new Request(meta.streamUrl));
					if (match) return match;
					// Not cached yet: try to fetch now and cache, then return
					try {
						const res = await fetchAndCache(meta.streamUrl, AUDIO_CACHE);
						return res;
					} catch (e) {
						return new Response('Offline song not available', { status: 404 });
					}
				}
				return new Response('Offline song not available', { status: 404 });
			})()
		);
		return;
	}

	// Handle HTTP Range requests for audio cached blobs (map offline-song to cached stream)
	if (req.headers.get('range')) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(AUDIO_CACHE);
				// Try direct match first
				let cached = await cache.match(req);
				if (cached) return cached;
				// If this is an offline-song path, map to the original streamUrl
				const offMatch = url.pathname.match(/^\/offline-song-([\w-]+)/);
				if (offMatch) {
					const meta = await getJSONMeta(songManifestKey(offMatch[1]));
					if (meta && meta.streamUrl) {
						cached = await cache.match(new Request(meta.streamUrl));
						if (cached) return cached;
					}
				}
				// If not cached yet, fetch and cache normally; range will likely be handled by server
				const res = await fetch(req);
				cache.put(req, res.clone()).catch(() => {});
				return res;
			})()
		);
		return;
	}

	// Navigation requests: network-first, fallback to cache
	if (req.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const fresh = await fetch(req);
					const cache = await caches.open(APP_SHELL_CACHE);
					cache.put(req, fresh.clone()).catch(() => {});
					return fresh;
				} catch {
					const cache = await caches.open(APP_SHELL_CACHE);
					const cached = await cache.match(req);
					if (cached) return cached;
					// final fallback to index
					return (await cache.match('/')) || Response.error();
				}
			})()
		);
		return;
	}

	// Images: cache-first
	if (req.destination === 'image') {
		event.respondWith(
			(async () => {
				const cache = await caches.open(IMAGE_CACHE);
				const cached = await cache.match(req);
				if (cached) return cached;
				try {
					const res = await fetch(req);
					cache.put(req, res.clone()).catch(() => {});
					return res;
				} catch {
					// fall back
					return cached || Response.error();
				}
			})()
		);
		return;
	}

	// Scripts, styles, fonts, and Next.js assets: cache-first for offline boot
	if (
		req.destination === 'script' ||
		req.destination === 'style' ||
		req.destination === 'font' ||
		req.url.includes('/_next/')
	) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(APP_SHELL_CACHE);
				const cached = await cache.match(req);
				if (cached) return cached;
				try {
					const res = await fetch(req);
					cache.put(req, res.clone()).catch(() => {});
					return res;
				} catch {
					return cached || Response.error();
				}
			})()
		);
		return;
	}

	// Audio and media: cache-first (to support offline playback)
		if (req.destination === 'audio' || /\/rest\/(stream|download)/.test(req.url)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(AUDIO_CACHE);
						const cached = await cache.match(req);
				if (cached) return cached;
				try {
						// Try normal fetch; if CORS blocks, fall back to no-cors and still cache opaque
						let res = await fetch(req);
						if (!res || !res.ok) {
							res = await fetch(new Request(req, { mode: 'no-cors' }));
						}
					cache.put(req, res.clone()).catch(() => {});
					return res;
					} catch {
						// Fallback: if this is /rest/stream with an id, try to serve cached by stored meta
						try {
							const u = new URL(req.url);
							if (/\/rest\/(stream|download)/.test(u.pathname)) {
								const id = u.searchParams.get('id');
								if (id) {
									const meta = await getJSONMeta(songManifestKey(id));
									if (meta && meta.streamUrl) {
										const alt = await cache.match(new Request(meta.streamUrl));
										if (alt) return alt;
									}
								}
							}
						} catch {}
						return cached || Response.error();
				}
			})()
		);
		return;
	}

	// Default: try network, fallback to cache
	event.respondWith(
		(async () => {
			try {
				return await fetch(req);
			} catch {
				const cache = await caches.open(APP_SHELL_CACHE);
				const cached = await cache.match(req);
				if (cached) return cached;
				return Response.error();
			}
		})()
	);
});

// Message handlers for offline downloads and controls
self.addEventListener('message', (event) => {
	const { type, data } = event.data || {};
	switch (type) {
		case 'DOWNLOAD_ALBUM':
			handleDownloadAlbum(event, data);
			break;
		case 'DOWNLOAD_SONG':
			handleDownloadSong(event, data);
			break;
		case 'DOWNLOAD_QUEUE':
			handleDownloadQueue(event, data);
			break;
		case 'ENABLE_OFFLINE_MODE':
			// Store a simple flag in META_CACHE
			(async () => {
				await putJSONMeta('/offline/settings', { ...data, updatedAt: Date.now() });
				replyPort(event, 'ENABLE_OFFLINE_MODE_OK', { ok: true });
			})();
			break;
		case 'CHECK_OFFLINE_STATUS':
			(async () => {
				const { id, type: entityType } = data || {};
				let isAvailable = false;
				if (entityType === 'album') {
					const manifest = await getJSONMeta(albumManifestKey(id));
					isAvailable = !!manifest && Array.isArray(manifest.songIds) && manifest.songIds.length > 0;
				} else if (entityType === 'song') {
					const songMeta = await getJSONMeta(songManifestKey(id));
					if (songMeta && songMeta.streamUrl) {
						const cache = await caches.open(AUDIO_CACHE);
						const match = await cache.match(new Request(songMeta.streamUrl));
						isAvailable = !!match;
					}
				}
				replyPort(event, 'CHECK_OFFLINE_STATUS_OK', { isAvailable });
			})();
			break;
		case 'DELETE_OFFLINE_CONTENT':
			(async () => {
				try {
					const { id, type: entityType } = data || {};
					if (entityType === 'album') {
						const manifest = await getJSONMeta(albumManifestKey(id));
						if (manifest && Array.isArray(manifest.songIds)) {
							const cache = await caches.open(AUDIO_CACHE);
							for (const s of manifest.songIds) {
								const songMeta = await getJSONMeta(songManifestKey(s));
								if (songMeta && songMeta.streamUrl) {
									await cache.delete(new Request(songMeta.streamUrl));
									await deleteMeta(songManifestKey(s));
								}
							}
						}
						await deleteMeta(albumManifestKey(id));
					} else if (entityType === 'song') {
						const songMeta = await getJSONMeta(songManifestKey(id));
						if (songMeta && songMeta.streamUrl) {
							const cache = await caches.open(AUDIO_CACHE);
							await cache.delete(new Request(songMeta.streamUrl));
						}
						await deleteMeta(songManifestKey(id));
					}
					replyPort(event, 'DELETE_OFFLINE_CONTENT_OK', { ok: true });
				} catch (e) {
					replyPort(event, 'DELETE_OFFLINE_CONTENT_ERROR', { error: String(e) });
				}
			})();
			break;
		case 'GET_OFFLINE_STATS':
			(async () => {
				try {
					const audioCache = await caches.open(AUDIO_CACHE);
					const imageCache = await caches.open(IMAGE_CACHE);
					const audioReqs = await audioCache.keys();
					const imageReqs = await imageCache.keys();
					const totalItems = audioReqs.length + imageReqs.length;
					// Size estimation is limited (opaque responses). We'll count items and attempt content-length.
					let totalSize = 0;
					let audioSize = 0;
					let imageSize = 0;
					async function sumCache(cache, reqs) {
						let sum = 0;
						for (const r of reqs) {
							const res = await cache.match(r);
							if (!res) continue;
							const lenHeader = res.headers.get('content-length');
							const len = Number(lenHeader || '0');
							if (!isNaN(len) && len > 0) {
								sum += len;
							} else {
								// Try estimate using song manifest bitrate and duration if available
								try {
									const u = new URL(r.url);
									if (/\/rest\/stream/.test(u.pathname)) {
										const id = u.searchParams.get('id');
										if (id) {
											const meta = await getJSONMeta(songManifestKey(id));
											if (meta) {
												if (meta.size && Number.isFinite(meta.size)) {
													sum += Number(meta.size);
												} else if (meta.duration) {
													// If bitrate known, use it, else assume 192 kbps
													const kbps = meta.bitRate || 192;
													const bytes = Math.floor((kbps * 1000 / 8) * meta.duration);
													sum += bytes;
												}
											}
										}
									}
								} catch {}
							}
						}
						return sum;
					}
					audioSize = await sumCache(audioCache, audioReqs);
					imageSize = await sumCache(imageCache, imageReqs);
					totalSize = audioSize + imageSize;
					// Derive counts of albums/songs from manifests
					const metaCache = await caches.open(META_CACHE);
					const metaKeys = await metaCache.keys();
					const downloadedAlbums = metaKeys.filter((k) => /\/offline\/albums\//.test(k.url)).length;
					const downloadedSongs = metaKeys.filter((k) => /\/offline\/songs\//.test(k.url)).length;
					replyPort(event, 'GET_OFFLINE_STATS_OK', {
						totalSize,
						audioSize,
						imageSize,
						metaSize: 0,
						downloadedAlbums,
						downloadedSongs,
						totalItems,
					});
				} catch (e) {
					replyPort(event, 'GET_OFFLINE_STATS_ERROR', { error: String(e) });
				}
			})();
			break;
				case 'GET_OFFLINE_ITEMS':
					(async () => {
						try {
							const metaCache = await caches.open(META_CACHE);
							const keys = await metaCache.keys();
							const albums = [];
							const songs = [];
							for (const req of keys) {
								if (/\/offline\/albums\//.test(req.url)) {
									const res = await metaCache.match(req);
									if (res) {
										const json = await res.json().catch(() => null);
										if (json) {
											albums.push({
												id: json.id,
												type: 'album',
												name: json.name,
												artist: json.artist,
												downloadedAt: json.downloadedAt || Date.now(),
											});
										}
									}
								} else if (/\/offline\/songs\//.test(req.url)) {
									const res = await metaCache.match(req);
									if (res) {
										const json = await res.json().catch(() => null);
										if (json) {
											songs.push({
												id: json.id,
												type: 'song',
												name: json.title,
												artist: json.artist,
												downloadedAt: json.downloadedAt || Date.now(),
											});
										}
									}
								}
							}
							replyPort(event, 'GET_OFFLINE_ITEMS_OK', { albums, songs });
						} catch (e) {
							replyPort(event, 'GET_OFFLINE_ITEMS_ERROR', { error: String(e) });
						}
					})();
					break;
		default:
			// no-op
			break;
	}
});

async function handleDownloadAlbum(event, payload) {
	try {
		const { album, songs } = payload || {};
		if (!album || !Array.isArray(songs)) throw new Error('Invalid album payload');

		const songIds = [];
		let completed = 0;
		const total = songs.length;

		for (const song of songs) {
			songIds.push(song.id);
			try {
				if (!song.streamUrl) throw new Error('Missing streamUrl');
				try {
					await fetchAndCache(song.streamUrl, AUDIO_CACHE);
				} catch (err) {
					try {
						const u = new URL(song.streamUrl);
						if (/\/rest\/download/.test(u.pathname)) {
							u.pathname = u.pathname.replace('/rest/download', '/rest/stream');
							await fetchAndCache(u.toString(), AUDIO_CACHE);
							song.streamUrl = u.toString();
						} else {
							throw err;
						}
					} catch (e2) {
						throw e2;
					}
				}
				// Save per-song meta for quick lookup
				await putJSONMeta(songManifestKey(song.id), {
					id: song.id,
					streamUrl: song.streamUrl,
					albumId: song.albumId,
					title: song.title,
					artist: song.artist,
					duration: song.duration,
					bitRate: song.bitRate,
					size: song.size,
					downloadedAt: Date.now(),
				});
				completed += 1;
				replyPort(event, 'DOWNLOAD_PROGRESS', {
					completed,
					total,
					failed: 0,
					status: 'downloading',
					currentSong: song.title,
				});
			} catch (e) {
				replyPort(event, 'DOWNLOAD_PROGRESS', {
					completed,
					total,
					failed: 1,
					status: 'downloading',
					currentSong: song.title,
					error: String(e),
				});
			}
		}

		// Save album manifest
		await putJSONMeta(albumManifestKey(album.id), {
			id: album.id,
			name: album.name,
			artist: album.artist,
			songIds,
			downloadedAt: Date.now(),
		});

		// Optionally cache cover art
		try {
			if (songs[0] && songs[0].streamUrl && (album.coverArt || songs[0].coverArt)) {
				const coverArtUrl = buildCoverArtUrlFromStream(songs[0].streamUrl, album.coverArt || songs[0].coverArt);
				if (coverArtUrl) await fetchAndCache(coverArtUrl, IMAGE_CACHE);
			}
		} catch {
			// ignore cover art failures
		}

		replyPort(event, 'DOWNLOAD_COMPLETE', { ok: true });
	} catch (e) {
		replyPort(event, 'DOWNLOAD_ERROR', { error: String(e) });
	}
}

async function handleDownloadSong(event, song) {
	try {
		if (!song || !song.id || !song.streamUrl) throw new Error('Invalid song payload');
		try {
			await fetchAndCache(song.streamUrl, AUDIO_CACHE);
		} catch (err) {
			try {
				const u = new URL(song.streamUrl);
				if (/\/rest\/download/.test(u.pathname)) {
					u.pathname = u.pathname.replace('/rest/download', '/rest/stream');
					await fetchAndCache(u.toString(), AUDIO_CACHE);
					song.streamUrl = u.toString();
				} else {
					throw err;
				}
			} catch (e2) {
				throw e2;
			}
		}
		await putJSONMeta(songManifestKey(song.id), {
			id: song.id,
			streamUrl: song.streamUrl,
			albumId: song.albumId,
			title: song.title,
			artist: song.artist,
			duration: song.duration,
			bitRate: song.bitRate,
			size: song.size,
			downloadedAt: Date.now(),
		});
		replyPort(event, 'DOWNLOAD_COMPLETE', { ok: true });
	} catch (e) {
		replyPort(event, 'DOWNLOAD_ERROR', { error: String(e) });
	}
}

async function handleDownloadQueue(event, payload) {
	try {
		const { songs } = payload || {};
		if (!Array.isArray(songs)) throw new Error('Invalid queue payload');
		let completed = 0;
		const total = songs.length;
		for (const song of songs) {
			try {
				if (!song.streamUrl) throw new Error('Missing streamUrl');
				try {
					await fetchAndCache(song.streamUrl, AUDIO_CACHE);
				} catch (err) {
					const u = new URL(song.streamUrl);
					if (/\/rest\/download/.test(u.pathname)) {
						u.pathname = u.pathname.replace('/rest/download', '/rest/stream');
						await fetchAndCache(u.toString(), AUDIO_CACHE);
						song.streamUrl = u.toString();
					} else {
						throw err;
					}
				}
				await putJSONMeta(songManifestKey(song.id), {
					id: song.id,
					streamUrl: song.streamUrl,
					albumId: song.albumId,
					title: song.title,
					artist: song.artist,
					duration: song.duration,
					bitRate: song.bitRate,
					size: song.size,
					downloadedAt: Date.now(),
				});
				completed += 1;
				replyPort(event, 'DOWNLOAD_PROGRESS', {
					completed,
					total,
					failed: 0,
					status: 'downloading',
					currentSong: song.title,
				});
			} catch (e) {
				replyPort(event, 'DOWNLOAD_PROGRESS', {
					completed,
					total,
					failed: 1,
					status: 'downloading',
					currentSong: song?.title,
					error: String(e),
				});
			}
		}
		replyPort(event, 'DOWNLOAD_COMPLETE', { ok: true });
	} catch (e) {
		replyPort(event, 'DOWNLOAD_ERROR', { error: String(e) });
	}
}

