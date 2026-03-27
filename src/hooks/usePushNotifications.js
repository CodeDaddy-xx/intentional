// src/hooks/usePushNotifications.js
// In-app overlay scheduler + background push notification fallback

import { useEffect, useRef } from 'react'
import { useStore } from './useStore'
import { buildNotificationPayload, shouldFireNow, subscribeToPush } from '../lib/notifications'
import { supabase } from '../lib/supabase'

export function usePushNotifications() {
  const { config, driftCount, dailyPlan, activeProfile, showPulse } = useStore()
  const intervalRef = useRef(null)
  const lastFiredRef = useRef(null)

  // ─── Register service worker & subscribe to push ──────────────────────────
  const setupPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      try {
        subscription = await subscribeToPush(registration)
        await supabase.from('push_subscriptions').upsert({
          user_id: activeProfile,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      } catch (err) {
        console.error('Push subscription failed:', err)
      }
    }

    return subscription
  }

  // ─── Scheduler ───────────────────────────────────────────────────────────
  // Every 60s: check if it's time to fire.
  // If app is FOREGROUNDED → show in-app overlay (bigger, custom sound, Yes/No).
  // If app is BACKGROUNDED → fire system push notification as fallback.
  const startScheduler = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      const { shouldFire, mode } = shouldFireNow(config)
      if (!shouldFire || !mode) return

      const intervalMins = mode === 'evening'
        ? config.evening_notification_interval_mins
        : config.focus_notification_interval_mins

      const now = Date.now()
      const elapsed = lastFiredRef.current
        ? (now - lastFiredRef.current) / 60000
        : Infinity

      if (elapsed < intervalMins) return

      lastFiredRef.current = now

      const appIsForegrounded = document.visibilityState === 'visible'

      if (appIsForegrounded) {
        // ── In-app overlay — the good experience ──
        showPulse(mode)
      } else {
        // ── Background push — fallback ──
        const payload = buildNotificationPayload({
          tone: config.notification_tone,
          driftCount,
          mode,
          downtimeMenu: dailyPlan.downtime_menu || [],
          quotes: config.quotes || []
        })

        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(payload.title, {
            body: payload.body,
            tag: payload.tag,
            icon: '/icon-192.png',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            actions: payload.actions,
            data: payload.data
          })
        })
      }
    }, 60 * 1000)
  }

  useEffect(() => {
    setupPush()
    startScheduler()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [config, driftCount, dailyPlan, activeProfile])

  const requestPermission = async () => {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') await setupPush()
    return permission
  }

  return { requestPermission }
}
