// src/hooks/usePushNotifications.js
// Handles service worker registration, push subscription, and notification scheduling

import { useEffect, useRef } from 'react'
import { useStore } from './useStore'
import { buildNotificationPayload, shouldFireNow, subscribeToPush } from '../lib/notifications'
import { supabase, USER_ID } from '../lib/supabase'

export function usePushNotifications() {
  const { config, driftCount, dailyPlan } = useStore()
  const intervalRef = useRef(null)
  const lastFiredRef = useRef(null)

  // ─── Register service worker & subscribe to push ──────────────────────────
  const setupPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser.')
      return
    }

    const registration = await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      try {
        subscription = await subscribeToPush(registration)
        // Save to Supabase so your server-side scheduler can push to it
        await supabase.from('push_subscriptions').upsert({
          user_id: USER_ID,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      } catch (err) {
        console.error('Push subscription failed:', err)
        return
      }
    }

    return subscription
  }

  // ─── Client-side scheduler ────────────────────────────────────────────────
  // Checks every 60 seconds if a notification should fire.
  // Real-time push from a server is ideal; this is the fallback for personal use.
  const startScheduler = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      const { shouldFire, mode } = shouldFireNow(config)
      if (!shouldFire || !mode) return

      // Work out the relevant interval
      const intervalMins = mode === 'evening'
        ? config.evening_notification_interval_mins
        : config.focus_notification_interval_mins

      const now = Date.now()
      const lastFired = lastFiredRef.current
      const elapsed = lastFired ? (now - lastFired) / 60000 : Infinity

      if (elapsed < intervalMins) return

      lastFiredRef.current = now

      const payload = buildNotificationPayload({
        tone: config.notification_tone,
        driftCount,
        mode,
        downtimeMenu: dailyPlan.downtime_menu || [],
        quotes: config.quotes || []
      })

      // Show notification via service worker
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(payload.title, {
          body: payload.body,
          tag: payload.tag,
          icon: '/icon-192.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          actions: payload.actions,
          data: payload.data
        })
      })
    }, 60 * 1000) // check every minute
  }

  useEffect(() => {
    setupPush()
    startScheduler()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [config, driftCount, dailyPlan])

  // ─── Request permission ───────────────────────────────────────────────────
  const requestPermission = async () => {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await setupPush()
    }
    return permission
  }

  return { requestPermission }
}
