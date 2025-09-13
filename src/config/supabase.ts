import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tbcahehcgdkbatkmevmx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiY2FoZWhjZ2RrYmF0a21ldm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTE5MzUsImV4cCI6MjA2OTcyNzkzNX0.xoKjuu1N58ZLweNMkZe3mI526hB_9O6siezDRlkxja4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you can generate these from your Supabase dashboard)
export interface Database {
  // Add your database types here
  // Example:
  // public: {
  //   Tables: {
  //     users: {
  //       Row: {
  //         id: string
  //         email: string
  //         created_at: string
  //       }
  //       Insert: {
  //         id?: string
  //         email: string
  //         created_at?: string
  //       }
  //       Update: {
  //         id?: string
  //         email?: string
  //         created_at?: string
  //       }
  //     }
  //   }
  // }
} 