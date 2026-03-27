// src/hooks/useStore.js
// Global state via Zustand — config, today's plan, habits, drift count
// Supports two profiles: 'manik' and 'harini'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')

const defaultConfig = {
  notification_tone: 'sarcastic',
  focus_notifications_enabled: false,
  focus_notification_interval_mins: 45,
  evening_mode_start_hour: 17,
  evening_notification_interval_mins: 30,
  quotes: [
    "Do not go where the path may lead; go instead where there is no path and leave a trail.",
    "The unexamined life is not worth living.",
  ],
  downtime_defaults: []
}

export const PROFILES = [
  { id: 'manik', label: 'Manik' },
  { id: 'harini', label: 'Harini' }
]

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── Active profile ──────────────────────────────────────────────
      activeProfile: 'manik',

      // ─── Config ─────────────────────────────────────────────────────
      config: { ...defaultConfig },

      // ─── Daily plan ─────────────────────────────────────────────────
      dailyPlan: {
        date: today(),
        tasks: [],
        downtime_menu: []
      },

      // ─── Habits ─────────────────────────────────────────────────────
      habits: [],
      habitLogs: {},

      // ─── Drift ──────────────────────────────────────────────────────
      driftCount: 0,

      // ─── Switch profile ─────────────────────────────────────────────
      switchProfile: async (profileId) => {
        set({
          activeProfile: profileId,
          config: { ...defaultConfig },
          dailyPlan: { date: today(), tasks: [], downtime_menu: [] },
          habits: [],
          habitLogs: {},
          driftCount: 0
        })
        const store = get()
        await store.loadConfig()
        await store.loadDailyPlan()
        await store.loadHabits()
        await store.loadHabitLogs()
        await store.loadDriftCount()
      },

      // ─── Actions ────────────────────────────────────────────────────

      loadConfig: async () => {
        const uid = get().activeProfile
        const { data } = await supabase
          .from('config')
          .select('*')
          .eq('user_id', uid)
          .single()
        if (data) set({ config: data })
      },

      saveConfig: async (updates) => {
        const uid = get().activeProfile
        const newConfig = { ...get().config, ...updates }
        set({ config: newConfig })
        await supabase.from('config').upsert({
          user_id: uid,
          ...newConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      },

      loadDailyPlan: async () => {
        const uid = get().activeProfile
        const date = today()
        const { data } = await supabase
          .from('daily_plan')
          .select('*')
          .eq('user_id', uid)
          .eq('date', date)
          .single()
        if (data) {
          set({ dailyPlan: data })
        } else {
          const defaults = get().config.downtime_defaults || []
          set({ dailyPlan: { date, tasks: [], downtime_menu: defaults } })
        }
      },

      saveDailyPlan: async (plan) => {
        const uid = get().activeProfile
        const updated = { ...get().dailyPlan, ...plan }
        set({ dailyPlan: updated })
        await supabase.from('daily_plan').upsert({
          user_id: uid,
          ...updated
        }, { onConflict: 'user_id,date' })
      },

      toggleTask: async (taskId) => {
        const plan = get().dailyPlan
        const tasks = plan.tasks.map(t =>
          t.id === taskId ? { ...t, done: !t.done } : t
        )
        await get().saveDailyPlan({ tasks })
      },

      loadHabits: async () => {
        const uid = get().activeProfile
        const { data } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', uid)
          .eq('is_active', true)
          .order('sort_order')
        if (data) set({ habits: data })
      },

      loadHabitLogs: async () => {
        const uid = get().activeProfile
        const { data } = await supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', uid)
          .eq('date', today())
        if (data) {
          const logs = {}
          data.forEach(l => { logs[l.habit_id] = l })
          set({ habitLogs: logs })
        }
      },

      logHabit: async (habitId, values) => {
        const uid = get().activeProfile
        const existing = get().habitLogs[habitId]
        const log = {
          user_id: uid,
          habit_id: habitId,
          date: today(),
          ...values
        }
        if (existing?.id) {
          await supabase.from('habit_logs').update(log).eq('id', existing.id)
        } else {
          await supabase.from('habit_logs').insert(log)
        }
        set(state => ({
          habitLogs: { ...state.habitLogs, [habitId]: { ...existing, ...values } }
        }))
      },

      logDrift: async (mode, chosenActivity, breathingCompleted) => {
        const uid = get().activeProfile
        const count = get().driftCount + 1
        set({ driftCount: count })
        await supabase.from('drift_log').insert({
          user_id: uid,
          date: today(),
          mode,
          chosen_activity: chosenActivity || null,
          breathing_completed: breathingCompleted
        })
      },

      loadDriftCount: async () => {
        const uid = get().activeProfile
        const { data } = await supabase
          .from('drift_log')
          .select('id')
          .eq('user_id', uid)
          .eq('date', today())
        set({ driftCount: data?.length || 0 })
      }
    }),
    {
      name: 'intentional-store',
      partialize: (state) => ({
        activeProfile: state.activeProfile,
        driftCount: state.driftCount
      })
    }
  )
)
