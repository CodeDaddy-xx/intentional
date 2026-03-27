// src/components/PulseOverlay.jsx
// Full-screen in-app overlay that fires on schedule.
// Asks "Wasting time?" — Yes → breathing → alternatives. No → dismiss.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { buildNotificationPayload } from '../lib/notifications'
import { playPulseSound, playDismissSound } from '../lib/sound'

export default function PulseOverlay({ mode, onDismiss }) {
  const navigate = useNavigate()
  const { config, driftCount, dailyPlan } = useStore()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Animate in
  useEffect(() => {
    playPulseSound()
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const dismiss = (withSound = true) => {
    if (withSound) playDismissSound()
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 300)
  }

  const handleYes = () => {
    setExiting(true)
    setTimeout(() => {
      onDismiss()
      navigate(`/breathing?mode=${mode}`)
    }, 200)
  }

  const handleNo = () => dismiss(true)

  // Build the sarcastic/motivational line
  const payload = buildNotificationPayload({
    tone: config.notification_tone,
    driftCount,
    mode,
    downtimeMenu: dailyPlan.downtime_menu || [],
    quotes: []  // quotes shown in alternatives screen, not here
  })

  // Split title and body — body has the sarcastic line
  const message = payload.body

  return (
    <div className={`pulse-overlay ${visible ? 'visible' : ''} ${exiting ? 'exiting' : ''}`}>
      <div className="pulse-inner">

        {/* Mode label */}
        <p className="pulse-eyebrow">
          {mode === 'evening' ? '🌙 Evening pulse' : '⚡ Focus check'}
        </p>

        {/* The question — always prominent */}
        <h1 className="pulse-question">
          Wasting time<br />right now?
        </h1>

        {/* Sarcastic/motivational line */}
        <p className="pulse-message">{message}</p>

        {/* Big Yes / No buttons */}
        <div className="pulse-actions">
          <button className="pulse-yes" onClick={handleYes}>
            <span className="pulse-btn-icon">😬</span>
            <span className="pulse-btn-label">Yes, I am</span>
            <span className="pulse-btn-sub">redirect me</span>
          </button>

          <button className="pulse-no" onClick={handleNo}>
            <span className="pulse-btn-icon">✓</span>
            <span className="pulse-btn-label">No, I'm good</span>
            <span className="pulse-btn-sub">carry on</span>
          </button>
        </div>

        {/* Drift count context */}
        {driftCount > 0 && (
          <p className="pulse-drift-hint">
            {driftCount} redirect{driftCount > 1 ? 's' : ''} today
          </p>
        )}
      </div>
    </div>
  )
}
