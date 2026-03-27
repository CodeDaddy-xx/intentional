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
import PulseOverlay from './components/PulseOverlay'

export default function App() {
  const { loadConfig, loadDailyPlan, loadHabits, loadHabitLogs, loadDriftCount, pulseVisible, pulseMode, hidePulse } = useStore()
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
        {/* In-app pulse overlay — renders on top of everything */}
        {pulseVisible && (
          <PulseOverlay mode={pulseMode} onDismiss={hidePulse} />
        )}

        <Routes>
          <Route path="/breathing" element={<BreathingExercise />} />
          <Route path="/alternatives" element={<AlternativesScreen />} />

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
