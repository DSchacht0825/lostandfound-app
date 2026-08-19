export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      persons: {
        Row: {
          id: string
          client_id: string
          first_name: string
          last_name: string
          nickname: string | null
          date_of_birth: string
          gender: string
          race: string
          ethnicity: string
          veteran_status: boolean
          disability_status: boolean
          disability_type: string | null
          chronic_homeless: boolean
          living_situation: string
          length_of_time_homeless: string | null
          enrollment_date: string
          case_manager: string | null
          referral_source: string | null
          preferred_language: string | null
          cultural_lived_experience: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string
          first_name: string
          last_name: string
          nickname?: string | null
          date_of_birth: string
          gender: string
          race: string
          ethnicity: string
          veteran_status: boolean
          disability_status: boolean
          disability_type?: string | null
          chronic_homeless: boolean
          living_situation: string
          length_of_time_homeless?: string | null
          enrollment_date: string
          case_manager?: string | null
          referral_source?: string | null
          preferred_language?: string | null
          cultural_lived_experience?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          first_name?: string
          last_name?: string
          nickname?: string | null
          date_of_birth?: string
          gender?: string
          race?: string
          ethnicity?: string
          veteran_status?: boolean
          disability_status?: boolean
          disability_type?: string | null
          chronic_homeless?: boolean
          living_situation?: string
          length_of_time_homeless?: string | null
          enrollment_date?: string
          case_manager?: string | null
          referral_source?: string | null
          preferred_language?: string | null
          cultural_lived_experience?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      encounters: {
        Row: {
          id: string
          person_id: string
          service_date: string
          outreach_location: string
          latitude: number
          longitude: number
          outreach_worker: string
          referral_source: string | null
          language_preference: string | null
          cultural_notes: string | null
          co_occurring_mh_sud: boolean
          co_occurring_type: string | null
          mat_referral: boolean
          mat_type: string | null
          mat_provider: string | null
          detox_referral: boolean
          detox_provider: string | null
          naloxone_distributed: boolean
          naloxone_date: string | null
          fentanyl_test_strips_count: number | null
          harm_reduction_education: boolean
          transportation_provided: boolean
          shower_trailer: boolean
          other_services: string | null
          high_utilizer_contact: boolean
          case_management_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          person_id: string
          service_date: string
          outreach_location: string
          latitude: number
          longitude: number
          outreach_worker: string
          referral_source?: string | null
          language_preference?: string | null
          cultural_notes?: string | null
          co_occurring_mh_sud: boolean
          co_occurring_type?: string | null
          mat_referral: boolean
          mat_type?: string | null
          mat_provider?: string | null
          detox_referral: boolean
          detox_provider?: string | null
          naloxone_distributed: boolean
          naloxone_date?: string | null
          fentanyl_test_strips_count?: number | null
          harm_reduction_education: boolean
          transportation_provided: boolean
          shower_trailer: boolean
          other_services?: string | null
          high_utilizer_contact?: boolean
          case_management_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          service_date?: string
          outreach_location?: string
          latitude?: number
          longitude?: number
          outreach_worker?: string
          referral_source?: string | null
          language_preference?: string | null
          cultural_notes?: string | null
          co_occurring_mh_sud?: boolean
          co_occurring_type?: string | null
          mat_referral?: boolean
          mat_type?: string | null
          mat_provider?: string | null
          detox_referral?: boolean
          detox_provider?: string | null
          naloxone_distributed?: boolean
          naloxone_date?: string | null
          fentanyl_test_strips_count?: number | null
          harm_reduction_education?: boolean
          transportation_provided?: boolean
          shower_trailer?: boolean
          other_services?: string | null
          high_utilizer_contact?: boolean
          case_management_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'field_worker'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'field_worker'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'field_worker'
          created_at?: string
          updated_at?: string
        }
      }
      status_changes: {
        Row: {
          id: string
          person_id: string
          change_type: 'exit' | 'return_to_active'
          change_date: string
          exit_destination: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          person_id: string
          change_type: 'exit' | 'return_to_active'
          change_date?: string
          exit_destination?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          change_type?: 'exit' | 'return_to_active'
          change_date?: string
          exit_destination?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
