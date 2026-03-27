// src/components/Dashboard.jsx
import { useNavigate } from 'react-router-dom'
import { useStore, PROFILES } from '../hooks/useStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const { dailyPlan, habits, habitLogs, driftCount, config, activeProfile, switchProfile } = useStore()

  const now = new Date()
  const hour = now.getHours()
  const isEvening = hour >= (config.evening_mode_start_hour ?? 17)
  const mode = isEvening ? 'Evening' : 'Focus'
  const modeEmoji = isEvening ? '🌙' : '⚡'

  const tasks = dailyPlan.tasks || []
  const doneTasks = tasks.filter(t => t.done).length

  const habitsDoneToday = habits.filter(h => {
    const log = habitLogs[h.id]
    if (!log) return false
    if (h.metric_type === 'boolean') return log.done === true
    if (h.metric_type === 'time') return (log.duration_mins || 0) > 0
    if (h.metric_type === 'units') return (log.units || 0) > 0
    if (h.metric_type === 'combo') return log.done === true || (log.duration_mins || 0) > 0
    return false
  }).length

  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <div className="page dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="greeting">Good {greeting}</h1>
          <div className={`mode-badge ${isEvening ? 'evening' : 'focus'}`}>
            {modeEmoji} {mode} Mode
          </div>
        </div>
        {/* Profile toggle */}
        <div className="profile-toggle">
          {PROFILES.map(p => (
            <button
              key={p.id}
              className={`profile-btn ${activeProfile === p.id ? 'active' : ''}`}
              onClick={() => activeProfile !== p.id && switchProfile(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drift count */}
      {driftCount > 0 && (
        <div className="drift-banner">
          <span className="drift-count">{driftCount}</span>
          <span className="drift-label">
            {driftCount === 1 ? 'redirect today' : 'redirects today'}
          </span>
          {driftCount >= 3 && <span className="drift-note">You keep coming back. That counts.</span>}
        </div>
      )}

      {/* Tasks — scrollable, fixed height */}
      <section className="card task-card">
        <div className="card-header">
          <h2>Today's tasks</h2>
          <span className="pill">{doneTasks}/{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <button className="empty-state" onClick={() => navigate('/morning')}>
            + Set your tasks for today
          </button>
        ) : (
          <ul className="task-list scrollable">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>

      {/* Habits summary */}
      <section className="card">
        <div className="card-header">
          <h2>Habits</h2>
          <span className="pill">{habitsDoneToday}/{habits.length}</span>
        </div>
        <button className="nav-link" onClick={() => navigate('/habits')}>
          View & log habits →
        </button>
      </section>

      {/* Quick actions — always visible */}
      <div className="quick-actions">
        <button className="btn-secondary" onClick={() => navigate('/morning')}>
          ✏️ Edit today's plan
        </button>
        <button className="btn-drift" onClick={() => navigate('/breathing')}>
          🌀 I'm drifting
        </button>
      </div>
    </div>
  )
}

function TaskItem({ task }) {
  const { toggleTask } = useStore()
  return (
    <li className={`task-item ${task.done ? 'done' : ''}`} onClick={() => toggleTask(task.id)}>
      <span className="task-check">{task.done ? '✓' : '○'}</span>
      <span className="task-label">{task.label}</span>
    </li>
  )
}
