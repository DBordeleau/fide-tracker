import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Player = {
    fide_id: string
    name: string
    federation: string
    rating: number
    rank: number
    monthly_change: number | null
    yearly_change: number | null
}