/*
	Service Worker for Mice (Navidrome client)
	- App shell caching for faster loading
	- Static asset caching
*/

/* global self, caches */
const VERSION = 'v3';
const APP_SHELL_CACHE = `mice-app-shell-${VERSION}`;
const IMAGE_CACHE = `mice-images-${VERSION}`;

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
					.filter((k) => ![APP_SHELL_CACHE, IMAGE_CACHE].includes(k))
					.map((k) => caches.delete(k))
			);
			await self.clients.claim();
		})()
	);
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
	const req = event.request;

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

	// Images: cache-first for better performance
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
					return cached || Response.error();
				}
			})()
		);
		return;
	}

	// Scripts, styles, fonts, and Next.js assets: cache-first for faster loading
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

	// Default: network-only (no caching for API calls, audio streams, etc.)
	event.respondWith(fetch(req));
});

