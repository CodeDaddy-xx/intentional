// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Simple user ID — since this is a personal app, we use a fixed local ID
// (no auth needed for personal use; add Supabase Auth later if desired)
export const USER_ID = 'manik'
