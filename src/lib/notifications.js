// src/lib/notifications.js
// ─── NOTIFICATION CONTENT ENGINE ─────────────────────────────────────────────
// Generates smart, personality-driven notification content.
// Tone: sarcastic | motivational | blunt | gentle
// Gets progressively sassier based on driftCount (how many times today already)

// VAPID public key — generate your own at: https://web-push-codelab.glitch.me/
// Then set VITE_VAPID_PUBLIC_KEY in your .env
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// ─── COPY BANKS ──────────────────────────────────────────────────────────────

const copy = {
  sarcastic: {
    base: [
      "Still scrolling? Bold life choice.",
      "Ah, YouTube again. A classic.",
      "Reddit isn't going to miss you, but your goals might.",
      "The algorithm loves you. Your future self, less so.",
      "Another banger of a video, I'm sure.",
    ],
    elevated: [ // driftCount >= 2
      "Second time today. We're building a pattern.",
      "Cool, you're on track to set a personal drift record.",
      "This is the {n}th check-in where you're... not where you want to be.",
      "Impressive commitment to not committing.",
    ],
    high: [ // driftCount >= 4
      "At this point you're basically speedrunning regret.",
      "Your future self just flinched.",
      "Okay, genuinely — you okay? This isn't like you.",
      "Even the algorithm is tired of you now.",
    ]
  },
  motivational: {
    base: [
      "You've got something better to give your time to.",
      "Small redirects compound into big lives.",
      "The best version of you is one choice away.",
      "This moment is yours to reclaim.",
      "You planned something better for yourself. Go do it.",
    ],
    elevated: [
      "You've drifted before and come back. Do it again.",
      "Every redirect is a win. Here's another chance.",
      "The day isn't over. Your intentions aren't either.",
    ],
    high: [
      "This is the hardest part — and you're capable of it.",
      "Keep coming back. That's literally the whole game.",
      "Persistence over perfection. Every single time.",
    ]
  },
  blunt: {
    base: [
      "You're wasting time.",
      "This isn't what you planned.",
      "Stop. Pick something from your list.",
      "Drift detected. Redirect now.",
      "Not this. You know it.",
    ],
    elevated: [
      "Still. Redirect.",
      "This is the {n}th time. You know what to do.",
      "Less scrolling. More living.",
    ],
    high: [
      "Come on.",
      "You set these intentions. Honour them.",
      "Stop here. Right now.",
    ]
  },
  gentle: {
    base: [
      "Hey — how are you doing right now?",
      "Just a soft check-in. Is this what you want to be doing?",
      "No pressure, but you had something nicer planned for this time.",
      "You're allowed to rest. Is this the rest you actually wanted?",
      "Gentle nudge: your downtime menu has better options.",
    ],
    elevated: [
      "You've checked in a few times today. That's okay. Want to try something different?",
      "Still here with you. Want to try one of your downtime picks?",
    ],
    high: [
      "Rough day? That's okay. Even a tiny redirect counts.",
      "You don't have to be perfect. Just a small shift.",
    ]
  }
}

// ─── NOTIFICATION BUILDER ─────────────────────────────────────────────────────

/**
 * Build the full notification payload
 * @param {object} opts
 * @param {string} opts.tone - sarcastic | motivational | blunt | gentle
 * @param {number} opts.driftCount - how many times user has drifted today
 * @param {string} opts.mode - 'focus' | 'evening'
 * @param {Array}  opts.downtimeMenu - [{id, label, firstStep}] — today's menu
 * @param {Array}  opts.quotes - string[] — personal quote bank
 */
export function buildNotificationPayload({ tone, driftCount, mode, downtimeMenu, quotes }) {
  const bank = copy[tone] || copy.sarcastic

  // Pick copy tier based on drift count
  let pool
  if (driftCount >= 4) pool = bank.high
  else if (driftCount >= 2) pool = bank.elevated
  else pool = bank.base

  // Pick a random line, inject drift count if placeholder exists
  const line = pool[Math.floor(Math.random() * pool.length)]
    .replace('{n}', driftCount + 1)

  // Pick a random personal quote
  const quote = quotes.length > 0
    ? quotes[Math.floor(Math.random() * quotes.length)]
    : null

  // Build body
  const body = quote ? `${line}\n\n"${quote}"` : line

  // Build notification actions (up to 5 downtime options as quick-taps)
  // Note: browsers typically show max 2 action buttons in the notification itself
  // The full 5 are shown inside the app after tapping "Yes"
  const topActivities = downtimeMenu.slice(0, 2)
  const actions = [
    ...topActivities.map(a => ({ action: `activity_${a.id}`, title: a.label })),
    { action: 'no_fine', title: "I'm good" }
  ]

  return {
    title: mode === 'focus' ? '⚡ Focus check' : '🌙 Evening pulse',
    body,
    tag: `intentional-${mode}`,
    actions,
    data: { driftCount, mode }
  }
}

// ─── SCHEDULING LOGIC ─────────────────────────────────────────────────────────

/**
 * Determine if a notification should fire right now.
 * Called by the client on a setInterval.
 *
 * @param {object} config - from Supabase config table
 * @returns {{ shouldFire: boolean, mode: 'focus'|'evening'|null }}
 */
export function shouldFireNow(config) {
  const now = new Date()
  const hour = now.getHours()
  const eveningStart = config.evening_mode_start_hour ?? 17

  const isEvening = hour >= eveningStart
  const isFocus = !isEvening

  if (isEvening) {
    return { shouldFire: true, mode: 'evening' }
  }

  if (isFocus && config.focus_notifications_enabled) {
    return { shouldFire: true, mode: 'focus' }
  }

  return { shouldFire: false, mode: null }
}

// ─── WEB PUSH SUBSCRIPTION ────────────────────────────────────────────────────

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(registration) {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })
  return subscription
}
