// src/components/AlternativesScreen.jsx
// Shown after breathing exercise: 5 downtime options with first tiny steps
// + rotating personal quote

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'

export default function AlternativesScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'evening'
  const preSelected = params.get('picked') // if user tapped directly from notification

  const { dailyPlan, config, logDrift, driftCount } = useStore()
  const options = (dailyPlan.downtime_menu || []).slice(0, 5)

  // Pick a random quote
  const quotes = config.quotes || []
  const [quote] = useState(
    quotes.length > 0 ? quotes[Math.floor(Math.random() * quotes.length)] : null
  )

  const [chosen, setChosen] = useState(preSelected || null)
  const [confirmed, setConfirmed] = useState(false)

  const selectedOption = options.find(o => o.id === chosen)

  const confirm = async () => {
    if (!chosen) return
    await logDrift(mode, selectedOption?.label, true)
    setConfirmed(true)
  }

  if (confirmed && selectedOption) {
    return (
      <div className="alternatives-screen confirmed">
        <div className="confirmed-inner">
          <h1 className="confirmed-title">{selectedOption.label}</h1>
          {selectedOption.firstStep && (
            <div className="first-step-card">
              <p className="first-step-label">First step</p>
              <p className="first-step-text">{selectedOption.firstStep}</p>
            </div>
          )}
          {quote && (
            <blockquote className="quote">{quote}</blockquote>
          )}
          <button className="btn-ghost" onClick={() => navigate('/')}>
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="alternatives-screen">
      <div className="alternatives-inner">
        {/* Sarcastic header — gets worse with drift count */}
        <p className="alts-eyebrow">Better options</p>
        <h1 className="alts-title">
          {driftCount >= 3
            ? "Still here. Let's try again."
            : "You've got better things to do."}
        </h1>

        {/* 5 activity options */}
        {options.length === 0 ? (
          <div className="empty-options">
            <p>You haven't set a downtime menu yet.</p>
            <button className="btn-primary" onClick={() => navigate('/morning')}>
              Set it up →
            </button>
          </div>
        ) : (
          <ul className="options-list">
            {options.map((opt, i) => (
              <li
                key={opt.id}
                className={`option-item ${chosen === opt.id ? 'selected' : ''}`}
                onClick={() => setChosen(opt.id)}
              >
                <span className="option-num">{i + 1}</span>
                <div className="option-text">
                  <span className="option-label">{opt.label}</span>
                  {opt.firstStep && (
                    <span className="option-step">→ {opt.firstStep}</span>
                  )}
                </div>
                {chosen === opt.id && <span className="option-check">✓</span>}
              </li>
            ))}
          </ul>
        )}

        {/* Quote */}
        {quote && <blockquote className="quote">{quote}</blockquote>}

        {/* Confirm */}
        {chosen && (
          <button className="btn-primary confirm-btn" onClick={confirm}>
            Let's do this →
          </button>
        )}

        <button className="btn-ghost dismiss-btn" onClick={() => navigate('/')}>
          Back to dashboard
        </button>
      </div>
    </div>
  )
}
