// Service worker for push notifications (Firebase Cloud Messaging).
//
// The server sends data-only pushes: { notification_id, title, body, url }.
// This worker has no Firebase code in it, only the standard push handlers, so
// it never goes out of date with the Firebase SDK and needs no configuration.
//
// - PMT open and visible: the page is handed the push (chime, refresh the bell,
//   and it shows the system popup itself).
// - Otherwise: this worker shows the popup, and tells any open page to refresh
//   (without a title, so the page does not show a second popup).

const ICON = '/pmt-notification-icon.png'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    const raw = event.data ? event.data.json() : {}
    payload = raw.data || raw || {}
  } catch (_) {
    return
  }
  const title = payload.title || 'PMT'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const visible = windows.filter((c) => c.visibilityState === 'visible')
      if (visible.length) {
        visible.forEach((c) => c.postMessage({ type: 'pmt-push', push: payload }))
        return
      }
      const { title: _omit, ...withoutTitle } = payload
      windows.forEach((c) => c.postMessage({ type: 'pmt-push', push: withoutTitle }))
      await self.registration.showNotification(title, {
        body: payload.body || '',
        icon: ICON,
        badge: ICON,
        tag: payload.notification_id || undefined,
        data: { url: payload.url || '/' },
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target).catch(() => {})
          return
        }
      }
      await self.clients.openWindow(target)
    })()
  )
})
