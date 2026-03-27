// src/components/ProgressViews.jsx
// Daily, Weekly, Monthly views of habits + drift + tasks

import { useState, useEffect } from 'react'
import { useStore } from '../hooks/useStore'
import { supabase } from '../lib/supabase'
import { format, startOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns'

const VIEWS = ['Day', 'Week', 'Month']

export default function ProgressViews() {
  const [view, setView] = useState('Week')
  const { habits } = useStore()

  return (
    <div className="page progress-views">
      <h1 className="page-title">Progress</h1>

      <div className="view-tabs">
        {VIEWS.map(v => (
          <button
            key={v}
            className={`view-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'Day' && <DayView habits={habits} />}
      {view === 'Week' && <WeekView habits={habits} />}
      {view === 'Month' && <MonthView habits={habits} />}
    </div>
  )
}

// ─── DAY VIEW ────────────────────────────────────────────────────────────────
function DayView({ habits }) {
  const [data, setData] = useState(null)
  const { activeProfile } = useStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const uid = activeProfile
      const [logsRes, driftRes, planRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', uid).eq('date', today),
        supabase.from('drift_log').select('*').eq('user_id', uid).eq('date', today),
        supabase.from('daily_plan').select('*').eq('user_id', uid).eq('date', today).single()
      ])
      setData({
        logs: logsRes.data || [],
        drifts: driftRes.data || [],
        plan: planRes.data || null
      })
    }
    load()
  }, [])

  if (!data) return <div className="loading">Loading...</div>

  const tasks = data.plan?.tasks || []
  const doneTasks = tasks.filter(t => t.done).length
  const driftCount = data.drifts.length

  return (
    <div className="day-view">
      <div className="stat-row">
        <StatCard label="Tasks done" value={`${doneTasks}/${tasks.length}`} />
        <StatCard label="Redirects" value={driftCount} />
        <StatCard label="Habits logged" value={`${data.logs.length}/${habits.length}`} />
      </div>

      <h3 className="section-label">Habits today</h3>
      <ul className="progress-habit-list">
        {habits.map(habit => {
          const log = data.logs.find(l => l.habit_id === habit.id)
          return (
            <li key={habit.id} className="progress-habit-item">
              <span>{habit.label}</span>
              <span className="habit-log-value">{formatLogValue(habit, log)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── WEEK VIEW ───────────────────────────────────────────────────────────────
function WeekView({ habits }) {
  const [data, setData] = useState(null)
  const { activeProfile } = useStore()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: new Date() })

  useEffect(() => {
    async function load() {
      const uid = activeProfile
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')
      const [logsRes, driftRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', uid).gte('date', from).lte('date', to),
        supabase.from('drift_log').select('*').eq('user_id', uid).gte('date', from).lte('date', to)
      ])
      setData({ logs: logsRes.data || [], drifts: driftRes.data || [] })
    }
    load()
  }, [])

  if (!data) return <div className="loading">Loading...</div>

  return (
    <div className="week-view">
      {/* Drift pattern */}
      <h3 className="section-label">Daily drift count</h3>
      <div className="drift-bar-row">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const count = data.drifts.filter(d => d.date === dateStr).length
          return (
            <div key={dateStr} className="drift-bar-col">
              <div className="drift-bar-fill" style={{ height: `${Math.min(count * 16, 64)}px` }} />
              <span className="drift-bar-label">{format(day, 'EEE')}</span>
            </div>
          )
        })}
      </div>

      {/* Habit grid */}
      <h3 className="section-label">Habit grid</h3>
      <div className="habit-grid">
        <div className="habit-grid-header">
          <span />
          {days.map(day => (
            <span key={day.toString()} className="grid-day">{format(day, 'EEE')}</span>
          ))}
        </div>
        {habits.map(habit => (
          <div key={habit.id} className="habit-grid-row">
            <span className="grid-habit-name">{habit.label}</span>
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const log = data.logs.find(l => l.habit_id === habit.id && l.date === dateStr)
              const logged = log && isLoggedAny(habit.metric_type, log)
              return (
                <span key={dateStr} className={`grid-cell ${logged ? 'done' : 'empty'}`}>
                  {logged ? '✓' : '·'}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MONTH VIEW ──────────────────────────────────────────────────────────────
function MonthView({ habits }) {
  const [data, setData] = useState(null)
  const { activeProfile } = useStore()

  useEffect(() => {
    async function load() {
      const uid = activeProfile
      const from = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')
      const [logsRes, driftRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', uid).gte('date', from).lte('date', to),
        supabase.from('drift_log').select('*').eq('user_id', uid).gte('date', from).lte('date', to)
      ])
      setData({ logs: logsRes.data || [], drifts: driftRes.data || [] })
    }
    load()
  }, [])

  if (!data) return <div className="loading">Loading...</div>

  const totalDrifts = data.drifts.length
  const daysWithData = [...new Set(data.logs.map(l => l.date))].length

  return (
    <div className="month-view">
      <div className="stat-row">
        <StatCard label="Total redirects" value={totalDrifts} />
        <StatCard label="Days with habits logged" value={daysWithData} />
      </div>

      {/* Per-habit monthly completion rate */}
      <h3 className="section-label">Habit completion this month</h3>
      <ul className="monthly-habit-list">
        {habits.map(habit => {
          const logged = data.logs.filter(l => l.habit_id === habit.id && isLoggedAny(habit.metric_type, l))
          const daysElapsed = new Date().getDate()
          const pct = Math.round((logged.length / daysElapsed) * 100)
          return (
            <li key={habit.id} className="monthly-habit-item">
              <span className="mh-label">{habit.label}</span>
              <div className="mh-bar-wrap">
                <div className="mh-bar" style={{ width: `${pct}%` }} />
              </div>
              <span className="mh-pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function formatLogValue(habit, log) {
  if (!log) return '—'
  if (habit.metric_type === 'boolean') return log.done ? '✓' : '—'
  if (habit.metric_type === 'time') return log.duration_mins ? `${log.duration_mins} ${habit.time_label || 'min'}` : '—'
  if (habit.metric_type === 'units') return log.units != null ? `${log.units} ${habit.unit_label || ''}` : '—'
  if (habit.metric_type === 'combo') {
    const parts = []
    if (log.done) parts.push('✓')
    if (log.duration_mins) parts.push(`${log.duration_mins} ${habit.time_label || 'min'}`)
    return parts.join(' · ') || '—'
  }
  return '—'
}

function isLoggedAny(metric_type, log) {
  if (!log) return false
  if (metric_type === 'boolean') return log.done === true
  if (metric_type === 'time') return (log.duration_mins || 0) > 0
  if (metric_type === 'units') return (log.units || 0) > 0
  if (metric_type === 'combo') return log.done === true || (log.duration_mins || 0) > 0
  return false
}
