// Cache the application shell and bootstrap settings, never operational API data.
const shellCache = 'ipi-shared-shell-v1';
const bootstrapCache = 'ipi-shared-bootstrap-v1';
const staticFile = url => url.origin === self.location.origin &&
  (url.pathname.startsWith('/assets/') || ['/theme-init.js', '/favicon.svg'].includes(url.pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(shellCache).then(cache => cache.add('/index.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-shared-shell') return;
  event.waitUntil((async () => {
    const cache = await caches.open(shellCache);
    await Promise.all((event.data.urls || []).filter(value => staticFile(new URL(value))).map(async value => {
      if (!(await cache.match(value))) await cache.add(value).catch(() => {});
    }));
    const bootstrap = await caches.open(bootstrapCache);
    for (const path of ['/api/me', '/api/configuration']) {
      if (!(await bootstrap.match(path))) {
        const response = await fetch(path, { credentials: 'same-origin' }).catch(() => null);
        if (response?.ok) await bootstrap.put(path, response);
      }
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api/auth/logout') {
    event.respondWith(caches.delete(bootstrapCache).then(() => fetch(request)));
    return;
  }
  if (request.method !== 'GET') return;
  if (staticFile(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(shellCache);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  } else if (request.mode === 'navigate' && url.pathname.startsWith('/shared')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(shellCache)).put('/index.html', response.clone());
        return response;
      } catch { return (await caches.match('/index.html')) || Response.error(); }
    })());
  } else if (['/api/me', '/api/configuration'].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(bootstrapCache);
      try {
        const response = await fetch(request);
        if (response.ok) {
          if (url.pathname === '/api/me') {
            const previous = await cache.match(request);
            if (previous && (await previous.json()).user?.email !== (await response.clone().json()).user?.email)
              await cache.delete('/api/configuration');
          }
          await cache.put(request, response.clone());
        }
        else if ([401, 403].includes(response.status)) await caches.delete(bootstrapCache);
        return response;
      } catch (error) {
        const client = await self.clients.get(event.clientId);
        if (!client || !new URL(client.url).pathname.startsWith('/shared')) throw error;
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
