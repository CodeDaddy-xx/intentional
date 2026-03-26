// src/App.jsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './hooks/useStore'
import { usePushNotifications } from './hooks/usePushNotifications'

import Dashboard from './components/Dashboard'
import MorningSetup from './components/MorningSetup'
import BreathingExercise from './components/BreathingExercise'
import AlternativesScreen from './components/AlternativesScreen'
import HabitTracker from './components/HabitTracker'
import ProgressViews from './components/ProgressViews'
import Settings from './components/Settings'
import Nav from './components/Nav'

export default function App() {
  const { loadConfig, loadDailyPlan, loadHabits, loadHabitLogs, loadDriftCount } = useStore()
  usePushNotifications()

  useEffect(() => {
    loadConfig()
    loadDailyPlan()
    loadHabits()
    loadHabitLogs()
    loadDriftCount()
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          {/* Breathing and alternatives are full-screen overlays — no nav */}
          <Route path="/breathing" element={<BreathingExercise />} />
          <Route path="/alternatives" element={<AlternativesScreen />} />

          {/* Main app with nav */}
          <Route path="/*" element={
            <>
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/morning" element={<MorningSetup />} />
                  <Route path="/habits" element={<HabitTracker />} />
                  <Route path="/progress" element={<ProgressViews />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Nav />
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
