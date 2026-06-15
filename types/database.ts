export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// --- ENUM Definitions (Senin verdiğin kurallar) ---
export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type DreamStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Visibility = 'private' | 'public';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          subscription_tier: SubscriptionTier // 'free' | 'pro' | 'elite'
          credits_used_today: number
          is_admin: boolean
          created_at: string
          updated_at: string
          // İhtiyaç oldukça diğer sütunları buraya ekleyeceğiz
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          subscription_tier?: SubscriptionTier
          credits_used_today?: number
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          subscription_tier?: SubscriptionTier
          credits_used_today?: number
          is_admin?: boolean
          updated_at?: string
        }
      }
      dreams: {
        Row: {
          id: string
          user_id: string
          dream_text: string
          dream_title: string | null
          ai_response: Json | null
          status: DreamStatus // 'pending' | 'processing' | ...
          visibility: Visibility // 'private' | 'public'
          created_at: string
        }
        Insert: {
          user_id: string
          dream_text: string
          dream_title?: string | null
          status?: DreamStatus
          visibility?: Visibility
        }
        Update: {
          dream_text?: string
          dream_title?: string | null
          ai_response?: Json | null
          status?: DreamStatus
          visibility?: Visibility
        }
      }
    }
  }
}