// src/components/BreathingExercise.jsx
// Full-screen breathing: 4s inhale / 6s exhale, 5 rounds
// After completion (or skip) → AlternativesScreen

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'

const INHALE_SECS = 4
const EXHALE_SECS = 6
const TOTAL_ROUNDS = 5
const CYCLE_SECS = INHALE_SECS + EXHALE_SECS  // 10s per round

export default function BreathingExercise() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'evening'

  const { logDrift } = useStore()

  const [round, setRound] = useState(1)          // 1–5
  const [phase, setPhase] = useState('inhale')   // 'inhale' | 'exhale'
  const [tick, setTick] = useState(0)            // seconds into current phase
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  const phaseTotal = phase === 'inhale' ? INHALE_SECS : EXHALE_SECS
  const progress = tick / phaseTotal             // 0 → 1
  const circleScale = phase === 'inhale'
    ? 0.6 + (0.4 * progress)                    // 0.6 → 1.0
    : 1.0 - (0.4 * progress)                    // 1.0 → 0.6

  useEffect(() => {
    if (done) return

    intervalRef.current = setInterval(() => {
      setTick(prev => {
        const next = prev + 1
        if (next >= phaseTotal) {
          // Switch phase
          setTick(0)
          if (phase === 'inhale') {
            setPhase('exhale')
          } else {
            // End of exhale = end of round
            if (round >= TOTAL_ROUNDS) {
              setDone(true)
              clearInterval(intervalRef.current)
            } else {
              setRound(r => r + 1)
              setPhase('inhale')
            }
          }
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [phase, round, done, phaseTotal])

  const proceed = (completed) => {
    logDrift(mode, null, completed)
    navigate(`/alternatives?mode=${mode}`)
  }

  return (
    <div className="breathing-screen">
      {!done ? (
        <>
          <div className="breathing-header">
            <p className="breathing-round">Round {round} of {TOTAL_ROUNDS}</p>
            <h1 className="breathing-phase">
              {phase === 'inhale' ? 'Inhale' : 'Exhale'}
            </h1>
            <p className="breathing-count">
              {phaseTotal - tick}
            </p>
          </div>

          {/* Animated circle */}
          <div className="breathing-circle-wrap">
            <div
              className={`breathing-circle ${phase}`}
              style={{ transform: `scale(${circleScale})` }}
            />
            <div className="breathing-circle-outer" />
          </div>

          {/* Phase bar */}
          <div className="phase-bar-wrap">
            <div
              className="phase-bar"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <button
            className="skip-btn"
            onClick={() => proceed(false)}
          >
            skip
          </button>
        </>
      ) : (
        <div className="breathing-done">
          <div className="done-circle">✓</div>
          <h2>Good.</h2>
          <p>Now let's pick something better.</p>
          <button className="btn-primary" onClick={() => proceed(true)}>
            Show me options →
          </button>
        </div>
      )}
    </div>
  )
}
