// src/hooks/useStore.js
// Global state via Zustand — config, today's plan, habits, drift count

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, USER_ID } from '../lib/supabase'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── Config ─────────────────────────────────────────────────────
      config: {
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
      },

      // ─── Daily plan ─────────────────────────────────────────────────
      dailyPlan: {
        date: today(),
        tasks: [],        // {id, label, done}
        downtime_menu: [] // {id, label, firstStep}
      },

      // ─── Habits ─────────────────────────────────────────────────────
      habits: [], // from DB — {id, label, metric_type, unit_label, time_label, sort_order}
      habitLogs: {}, // { [habitId]: { done, duration_mins, units } }

      // ─── Drift ──────────────────────────────────────────────────────
      driftCount: 0, // resets each day

      // ─── Loading ────────────────────────────────────────────────────
      loading: false,

      // ─── Actions ────────────────────────────────────────────────────

      loadConfig: async () => {
        const { data } = await supabase
          .from('config')
          .select('*')
          .eq('user_id', USER_ID)
          .single()
        if (data) set({ config: data })
      },

      saveConfig: async (updates) => {
        const newConfig = { ...get().config, ...updates }
        set({ config: newConfig })
        await supabase.from('config').upsert({
          user_id: USER_ID,
          ...newConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      },

      loadDailyPlan: async () => {
        const date = today()
        const { data } = await supabase
          .from('daily_plan')
          .select('*')
          .eq('user_id', USER_ID)
          .eq('date', date)
          .single()
        if (data) {
          set({ dailyPlan: data })
        } else {
          // Seed downtime menu from defaults
          const defaults = get().config.downtime_defaults || []
          set({ dailyPlan: { date, tasks: [], downtime_menu: defaults } })
        }
      },

      saveDailyPlan: async (plan) => {
        const updated = { ...get().dailyPlan, ...plan }
        set({ dailyPlan: updated })
        await supabase.from('daily_plan').upsert({
          user_id: USER_ID,
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
        const { data } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', USER_ID)
          .eq('is_active', true)
          .order('sort_order')
        if (data) set({ habits: data })
      },

      loadHabitLogs: async () => {
        const { data } = await supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', USER_ID)
          .eq('date', today())
        if (data) {
          const logs = {}
          data.forEach(l => { logs[l.habit_id] = l })
          set({ habitLogs: logs })
        }
      },

      logHabit: async (habitId, values) => {
        // values: { done?, duration_mins?, units? }
        const existing = get().habitLogs[habitId]
        const log = {
          user_id: USER_ID,
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
        const count = get().driftCount + 1
        set({ driftCount: count })
        await supabase.from('drift_log').insert({
          user_id: USER_ID,
          date: today(),
          mode,
          chosen_activity: chosenActivity || null,
          breathing_completed: breathingCompleted
        })
      },

      loadDriftCount: async () => {
        const { data } = await supabase
          .from('drift_log')
          .select('id')
          .eq('user_id', USER_ID)
          .eq('date', today())
        set({ driftCount: data?.length || 0 })
      }
    }),
    {
      name: 'intentional-store',
      partialize: (state) => ({
        config: state.config,
        driftCount: state.driftCount
      })
    }
  )
)
