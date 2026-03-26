// public/sw.js — Service Worker for Push Notifications
// Injected by vite-plugin-pwa (injectManifest strategy)

import { precacheAndRoute } from 'workbox-precaching'

// Precache all assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// ─── PUSH NOTIFICATION HANDLER ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, tag, actions, data: notifData } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || 'intentional-pulse',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,        // stays until user acts
      actions: actions || [],          // quick-tap action buttons
      data: notifData || {}
    })
  )
})

// ─── NOTIFICATION CLICK HANDLER ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { action } = event
  const notifData = event.notification.data || {}

  let url = '/'

  if (action === 'yes_wasting') {
    // User admitted drift → go to breathing screen
    url = '/breathing'
  } else if (action === 'no_fine') {
    // User is fine → just close
    return
  } else if (action && action.startsWith('activity_')) {
    // User picked a specific activity directly from notification
    const activityId = action.replace('activity_', '')
    url = `/alternatives?picked=${activityId}`
  } else {
    // Tapped the notification body itself → go to breathing
    url = '/breathing'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// ─── BACKGROUND SYNC (future: sync drift logs when offline) ─────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-drift-log') {
    // Future: sync any queued drift logs
  }
})
