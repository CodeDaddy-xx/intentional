// src/components/Settings.jsx
// Full configuration: tone, schedules, quotes bank, downtime defaults

import { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { usePushNotifications } from '../hooks/usePushNotifications'

const TONES = [
  { value: 'sarcastic', label: '😏 Sarcastic', desc: 'Your future self is watching. Disappointed.' },
  { value: 'motivational', label: '💪 Motivational', desc: 'You planned something better. Go do it.' },
  { value: 'blunt', label: '🎯 Blunt', desc: 'Stop. Pick something from your list.' },
  { value: 'gentle', label: '🌿 Gentle', desc: 'Hey — is this the rest you actually wanted?' }
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
}))

export default function Settings() {
  const { config, saveConfig } = useStore()
  const { requestPermission } = usePushNotifications()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local state mirrors config
  const [local, setLocal] = useState({ ...config })
  const [newQuote, setNewQuote] = useState('')

  const update = (field, val) => setLocal(s => ({ ...s, [field]: val }))

  const save = async () => {
    setSaving(true)
    await saveConfig(local)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Quotes
  const addQuote = () => {
    if (!newQuote.trim()) return
    update('quotes', [...(local.quotes || []), newQuote.trim()])
    setNewQuote('')
  }
  const removeQuote = (i) => {
    update('quotes', local.quotes.filter((_, idx) => idx !== i))
  }

  return (
    <div className="page settings">
      <h1 className="page-title">Settings</h1>

      {/* Notification tone */}
      <section className="settings-section">
        <h2>Notification personality</h2>
        <div className="tone-grid">
          {TONES.map(t => (
            <button
              key={t.value}
              className={`tone-option ${local.notification_tone === t.value ? 'selected' : ''}`}
              onClick={() => update('notification_tone', t.value)}
            >
              <span className="tone-label">{t.label}</span>
              <span className="tone-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Focus mode */}
      <section className="settings-section">
        <h2>Focus mode (before {HOURS[local.evening_mode_start_hour]?.label})</h2>
        <div className="toggle-row">
          <label>Pulse notifications during focus time</label>
          <button
            className={`toggle ${local.focus_notifications_enabled ? 'on' : 'off'}`}
            onClick={() => update('focus_notifications_enabled', !local.focus_notifications_enabled)}
          >
            {local.focus_notifications_enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {local.focus_notifications_enabled && (
          <div className="interval-row">
            <label>Every</label>
            <input
              type="number"
              min="15"
              max="120"
              step="5"
              className="interval-input"
              value={local.focus_notification_interval_mins}
              onChange={e => update('focus_notification_interval_mins', Number(e.target.value))}
            />
            <span>minutes</span>
          </div>
        )}
      </section>

      {/* Evening mode */}
      <section className="settings-section">
        <h2>Evening mode</h2>
        <div className="interval-row">
          <label>Starts at</label>
          <select
            className="hour-select"
            value={local.evening_mode_start_hour}
            onChange={e => update('evening_mode_start_hour', Number(e.target.value))}
          >
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
        <div className="interval-row">
          <label>Pulse every</label>
          <input
            type="number"
            min="10"
            max="120"
            step="5"
            className="interval-input"
            value={local.evening_notification_interval_mins}
            onChange={e => update('evening_notification_interval_mins', Number(e.target.value))}
          />
          <span>minutes</span>
        </div>
      </section>

      {/* Personal quote bank */}
      <section className="settings-section">
        <h2>Personal quote bank</h2>
        <p className="section-hint">These rotate through your notifications. Make them yours.</p>
        <ul className="quote-list">
          {(local.quotes || []).map((q, i) => (
            <li key={i} className="quote-item">
              <span className="quote-text">"{q}"</span>
              <button className="remove-btn" onClick={() => removeQuote(i)}>×</button>
            </li>
          ))}
        </ul>
        <div className="add-quote-row">
          <input
            className="setup-input"
            placeholder="Add a quote..."
            value={newQuote}
            onChange={e => setNewQuote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuote()}
          />
          <button className="add-btn inline" onClick={addQuote}>Add</button>
        </div>
      </section>

      {/* Push permission */}
      <section className="settings-section">
        <h2>Notifications</h2>
        <button className="btn-secondary" onClick={requestPermission}>
          Enable push notifications
        </button>
        <p className="section-hint">
          Must add this app to your home screen for notifications to work on iPhone.
        </p>
      </section>

      {/* iPhone Shortcut tip */}
      <section className="settings-section shortcut-tip">
        <h2>📱 iPhone Shortcut setup</h2>
        <p>To catch yourself opening YouTube/Reddit in real time:</p>
        <ol className="shortcut-steps">
          <li>Open the <strong>Shortcuts</strong> app</li>
          <li>Tap <strong>Automation → New Automation</strong></li>
          <li>Choose <strong>App</strong> → select YouTube (and Reddit separately)</li>
          <li>Set trigger: <strong>Opens</strong></li>
          <li>Action: <strong>Show notification</strong> → "Is this intentional? Open Intentional app."</li>
          <li>Turn off <strong>Ask Before Running</strong></li>
        </ol>
        <p className="section-hint">Repeat for each app you want to intercept.</p>
      </section>

      <button className="btn-primary save-btn" onClick={save} disabled={saving}>
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  )
}
