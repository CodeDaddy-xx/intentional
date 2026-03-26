// src/components/MorningSetup.jsx
// Set today's tasks + downtime menu (5 options)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { format } from 'date-fns'

const newId = () => Math.random().toString(36).slice(2, 9)

export default function MorningSetup() {
  const navigate = useNavigate()
  const { dailyPlan, saveDailyPlan, config } = useStore()

  const [tasks, setTasks] = useState(
    dailyPlan.tasks?.length > 0
      ? dailyPlan.tasks
      : [{ id: newId(), label: '', done: false }]
  )

  const [downtimeMenu, setDowntimeMenu] = useState(
    dailyPlan.downtime_menu?.length > 0
      ? dailyPlan.downtime_menu
      : (config.downtime_defaults || []).slice(0, 5).map(d => ({ ...d, id: newId() }))
  )

  const [saving, setSaving] = useState(false)

  // ─── Tasks ───────────────────────────────────────────────────────────────
  const addTask = () => setTasks(t => [...t, { id: newId(), label: '', done: false }])
  const updateTask = (id, label) => setTasks(t => t.map(x => x.id === id ? { ...x, label } : x))
  const removeTask = (id) => setTasks(t => t.filter(x => x.id !== id))

  // ─── Downtime menu ───────────────────────────────────────────────────────
  const addDowntime = () => {
    if (downtimeMenu.length >= 5) return
    setDowntimeMenu(m => [...m, { id: newId(), label: '', firstStep: '' }])
  }
  const updateDowntime = (id, field, val) =>
    setDowntimeMenu(m => m.map(x => x.id === id ? { ...x, [field]: val } : x))
  const removeDowntime = (id) => setDowntimeMenu(m => m.filter(x => x.id !== id))

  // ─── Save ────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true)
    await saveDailyPlan({
      tasks: tasks.filter(t => t.label.trim()),
      downtime_menu: downtimeMenu.filter(d => d.label.trim())
    })
    setSaving(false)
    navigate('/')
  }

  const dateLabel = format(new Date(), 'EEEE, d MMMM')

  return (
    <div className="page morning-setup">
      <h1 className="page-title">Today's plan</h1>
      <p className="page-subtitle">{dateLabel}</p>

      {/* Tasks */}
      <section className="setup-section">
        <h2>Top tasks <span className="hint">max 5</span></h2>
        <ul className="setup-list">
          {tasks.slice(0, 5).map((task, i) => (
            <li key={task.id} className="setup-item">
              <span className="item-num">{i + 1}</span>
              <input
                className="setup-input"
                placeholder={`Task ${i + 1}`}
                value={task.label}
                onChange={e => updateTask(task.id, e.target.value)}
              />
              <button className="remove-btn" onClick={() => removeTask(task.id)}>×</button>
            </li>
          ))}
        </ul>
        {tasks.length < 5 && (
          <button className="add-btn" onClick={addTask}>+ Add task</button>
        )}
      </section>

      {/* Downtime menu */}
      <section className="setup-section">
        <h2>Downtime menu <span className="hint">up to 5 options</span></h2>
        <p className="section-hint">
          What you'll be shown instead of doom scrolling. Include a first tiny step.
        </p>
        <ul className="setup-list downtime-list">
          {downtimeMenu.map((item, i) => (
            <li key={item.id} className="setup-item downtime-item">
              <span className="item-num">{i + 1}</span>
              <div className="downtime-inputs">
                <input
                  className="setup-input"
                  placeholder="Activity (e.g. Flute practice)"
                  value={item.label}
                  onChange={e => updateDowntime(item.id, 'label', e.target.value)}
                />
                <input
                  className="setup-input first-step"
                  placeholder="First tiny step (e.g. Pick up the flute)"
                  value={item.firstStep}
                  onChange={e => updateDowntime(item.id, 'firstStep', e.target.value)}
                />
              </div>
              <button className="remove-btn" onClick={() => removeDowntime(item.id)}>×</button>
            </li>
          ))}
        </ul>
        {downtimeMenu.length < 5 && (
          <button className="add-btn" onClick={addDowntime}>+ Add option</button>
        )}
      </section>

      <button className="btn-primary save-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save & start the day →'}
      </button>
    </div>
  )
}
