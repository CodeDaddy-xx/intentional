// src/components/HabitTracker.jsx
// Daily habit logging + manage habits
// Metric types: boolean | time | units | combo (boolean + time)

import { useState } from 'react'
import { useStore } from '../hooks/useStore'

const newId = () => Math.random().toString(36).slice(2, 9)

const METRIC_TYPES = [
  { value: 'boolean', label: 'Yes / No', hint: 'Did you do it?' },
  { value: 'time', label: 'Time', hint: 'How long?' },
  { value: 'units', label: 'Units', hint: 'Count / amount (e.g. pages, km)' },
  { value: 'combo', label: 'Yes + Time', hint: 'Did you do it & how long?' }
]

export default function HabitTracker() {
  const { habits, habitLogs, logHabit, loadHabits } = useStore()
  const [managing, setManaging] = useState(false)

  return (
    <div className="page habit-tracker">
      <div className="page-header">
        <h1 className="page-title">Habits</h1>
        <button className="btn-ghost small" onClick={() => setManaging(m => !m)}>
          {managing ? 'Done' : 'Manage'}
        </button>
      </div>

      {managing
        ? <ManageHabits onDone={() => { setManaging(false); loadHabits() }} />
        : <LogHabits habits={habits} habitLogs={habitLogs} logHabit={logHabit} />
      }
    </div>
  )
}

// ─── LOG VIEW ────────────────────────────────────────────────────────────────
function LogHabits({ habits, habitLogs, logHabit }) {
  if (habits.length === 0) {
    return (
      <div className="empty-state">
        <p>No habits yet.</p>
        <p>Tap Manage to add some.</p>
      </div>
    )
  }

  return (
    <ul className="habit-log-list">
      {habits.map(habit => (
        <HabitLogItem
          key={habit.id}
          habit={habit}
          log={habitLogs[habit.id] || {}}
          onLog={(values) => logHabit(habit.id, values)}
        />
      ))}
    </ul>
  )
}

function HabitLogItem({ habit, log, onLog }) {
  const { metric_type, label, unit_label, time_label } = habit

  const isDone = log.done === true
  const hasDuration = (log.duration_mins || 0) > 0
  const hasUnits = (log.units || 0) > 0

  return (
    <li className={`habit-item ${isLogged(metric_type, log) ? 'logged' : ''}`}>
      <div className="habit-header">
        <span className="habit-label">{label}</span>
        <span className="metric-type-tag">{METRIC_TYPES.find(m => m.value === metric_type)?.label}</span>
      </div>

      <div className="habit-inputs">
        {/* Boolean or Combo: Yes/No toggle */}
        {(metric_type === 'boolean' || metric_type === 'combo') && (
          <div className="bool-toggle">
            <button
              className={`toggle-btn ${isDone ? 'active' : ''}`}
              onClick={() => onLog({ done: !isDone })}
            >
              {isDone ? '✓ Done' : 'Mark done'}
            </button>
          </div>
        )}

        {/* Time: duration input */}
        {(metric_type === 'time' || metric_type === 'combo') && (
          <div className="time-input">
            <input
              type="number"
              min="0"
              className="num-input"
              placeholder="0"
              value={log.duration_mins || ''}
              onChange={e => onLog({ duration_mins: Number(e.target.value) })}
            />
            <span className="input-unit">{time_label || 'min'}</span>
          </div>
        )}

        {/* Units: numeric with custom unit */}
        {metric_type === 'units' && (
          <div className="units-input">
            <input
              type="number"
              min="0"
              step="any"
              className="num-input"
              placeholder="0"
              value={log.units || ''}
              onChange={e => onLog({ units: Number(e.target.value) })}
            />
            <span className="input-unit">{unit_label || 'units'}</span>
          </div>
        )}

        {/* Streak placeholder — calculated in ProgressViews */}
        <span className="streak-hint">
          {isLogged(metric_type, log) ? '✓ logged today' : ''}
        </span>
      </div>
    </li>
  )
}

function isLogged(metric_type, log) {
  if (metric_type === 'boolean') return log.done === true
  if (metric_type === 'time') return (log.duration_mins || 0) > 0
  if (metric_type === 'units') return (log.units || 0) > 0
  if (metric_type === 'combo') return log.done === true || (log.duration_mins || 0) > 0
  return false
}

// ─── MANAGE VIEW ─────────────────────────────────────────────────────────────
function ManageHabits({ onDone }) {
  const { habits, activeProfile } = useStore()
  const [drafts, setDrafts] = useState(
    habits.map(h => ({ ...h }))
  )
  const [saving, setSaving] = useState(false)

  const addDraft = () => setDrafts(d => [...d, {
    id: newId(),
    label: '',
    metric_type: 'boolean',
    unit_label: '',
    time_label: 'min',
    is_active: true,
    sort_order: d.length,
    _new: true
  }])

  const updateDraft = (id, field, val) =>
    setDrafts(d => d.map(x => x.id === id ? { ...x, [field]: val } : x))

  const removeDraft = (id) =>
    setDrafts(d => d.filter(x => x.id !== id))

  const save = async () => {
    setSaving(true)
    const { supabase } = await import('../lib/supabase')
    for (const draft of drafts) {
      if (!draft.label.trim()) continue
      const payload = {
        user_id: activeProfile,
        label: draft.label,
        metric_type: draft.metric_type,
        unit_label: draft.unit_label || null,
        time_label: draft.time_label || 'min',
        sort_order: draft.sort_order,
        is_active: draft.is_active !== false
      }
      if (draft._new) {
        await supabase.from('habits').insert(payload)
      } else {
        await supabase.from('habits').update(payload).eq('id', draft.id)
      }
    }
    setSaving(false)
    onDone()
  }

  return (
    <div className="manage-habits">
      <ul className="manage-list">
        {drafts.map((draft, i) => (
          <li key={draft.id} className="manage-item">
            <input
              className="setup-input"
              placeholder="Habit name"
              value={draft.label}
              onChange={e => updateDraft(draft.id, 'label', e.target.value)}
            />

            <select
              className="metric-select"
              value={draft.metric_type}
              onChange={e => updateDraft(draft.id, 'metric_type', e.target.value)}
            >
              {METRIC_TYPES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {(draft.metric_type === 'units' || draft.metric_type === 'combo') && (
              <input
                className="setup-input small"
                placeholder="Unit (e.g. pages)"
                value={draft.unit_label || ''}
                onChange={e => updateDraft(draft.id, 'unit_label', e.target.value)}
              />
            )}

            {(draft.metric_type === 'time' || draft.metric_type === 'combo') && (
              <input
                className="setup-input small"
                placeholder="Time unit (e.g. min)"
                value={draft.time_label || 'min'}
                onChange={e => updateDraft(draft.id, 'time_label', e.target.value)}
              />
            )}

            <button className="remove-btn" onClick={() => removeDraft(draft.id)}>×</button>
          </li>
        ))}
      </ul>

      <button className="add-btn" onClick={addDraft}>+ Add habit</button>

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save habits'}
      </button>
    </div>
  )
}


