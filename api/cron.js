// api/cron.js
// Vercel serverless function — runs on a schedule via vercel.json
// Reads each user's config from Supabase, checks if notification should fire,
// sends Web Push to their stored subscription.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role key — bypasses RLS
)

webpush.setVapidDetails(
  'mailto:intentional@app.com',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// ─── Notification copy (mirrors src/lib/notifications.js) ─────────────────────
const copy = {
  sarcastic: [
    "Still scrolling? Bold life choice.",
    "Ah, YouTube again. A classic.",
    "Reddit isn't going to miss you, but your goals might.",
    "The algorithm loves you. Your future self, less so.",
    "Another banger. I'm sure.",
  ],
  motivational: [
    "You've got something better to give your time to.",
    "Small redirects compound into big lives.",
    "The best version of you is one choice away.",
    "You planned something better for yourself. Go do it.",
  ],
  blunt: [
    "You're wasting time.",
    "This isn't what you planned.",
    "Stop. Pick something from your list.",
    "Not this. You know it.",
  ],
  gentle: [
    "Hey — is this the rest you actually wanted?",
    "No pressure, but you had something nicer planned.",
    "Gentle nudge: your downtime menu has better options.",
  ]
}

function getLine(tone, driftCount) {
  const bank = copy[tone] || copy.sarcastic
  const pool = driftCount >= 3 ? bank.slice(-2) : bank
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Accept POST only to avoid Vercel GET caching
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const hourUTC = now.getUTCHours()

  // Load all push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (error || !subscriptions?.length) {
    return res.status(200).json({ message: 'No subscriptions found' })
  }

  const results = []

  for (const sub of subscriptions) {
    const userId = sub.user_id

    // Load this user's config
    const { data: config } = await supabase
      .from('config')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!config) continue

    // Work out local hour (approximate — using evening_mode_start_hour as timezone proxy)
    // For a personal app, both users are in the same timezone so UTC offset is fixed
    // UK time: UTC+0 in winter, UTC+1 in summer
    const ukOffset = isDST(now) ? 1 : 0
    const localHour = (hourUTC + ukOffset) % 24
    const eveningStart = config.evening_mode_start_hour ?? 17
    const isEvening = localHour >= eveningStart
    const isFocus = !isEvening

    // Check if we should send
    let shouldSend = false
    let mode = null

    if (isEvening) {
      shouldSend = true
      mode = 'evening'
    } else if (isFocus && config.focus_notifications_enabled) {
      shouldSend = true
      mode = 'focus'
    }

    if (!shouldSend) continue

    // Load today's drift count
    const today = now.toISOString().split('T')[0]
    const { data: drifts } = await supabase
      .from('drift_log')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)

    const driftCount = drifts?.length || 0

    // Build notification content
    const tone = config.notification_tone || 'sarcastic'
    const line = getLine(tone, driftCount)
    const quotes = config.quotes || []
    const quote = quotes.length > 0
      ? quotes[Math.floor(Math.random() * quotes.length)]
      : null

    const body = quote ? `${line}\n\n"${quote}"` : line

    // Get downtime options for action buttons (max 2 in notification)
    const { data: plan } = await supabase
      .from('daily_plan')
      .select('downtime_menu')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    const downtimeMenu = plan?.downtime_menu || []
    const topTwo = downtimeMenu.slice(0, 2)

    const payload = JSON.stringify({
      title: mode === 'evening' ? '🌙 Evening pulse' : '⚡ Focus check',
      body,
      tag: `intentional-${mode}`,
      actions: [
        ...topTwo.map(a => ({ action: `activity_${a.id}`, title: a.label })),
        { action: 'no_fine', title: "I'm good" }
      ],
      data: { driftCount, mode, url: '/' }
    })

    // Send push
    try {
      await webpush.sendNotification(sub.subscription, payload)
      results.push({ userId, status: 'sent', mode })
    } catch (err) {
      // Subscription expired — remove it
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId)
        results.push({ userId, status: 'removed_expired' })
      } else {
        results.push({ userId, status: 'error', error: err.message })
      }
    }
  }

  return res.status(200).json({ sent: results.length, results })
}

// ─── UK DST helper ────────────────────────────────────────────────────────────
function isDST(date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return date.getTimezoneOffset() < Math.max(jan, jul)
}
