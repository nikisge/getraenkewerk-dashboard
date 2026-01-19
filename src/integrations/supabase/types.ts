export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          acceptance: string | null
          created_at: string
          customers: number | null
          id: number
          image: string | null
          price: number | null
          product_id: number | null
          product_name: string | null
          promo_from: string | null
          promo_to: string | null
        }
        Insert: {
          acceptance?: string | null
          created_at?: string
          customers?: number | null
          id?: number
          image?: string | null
          price?: number | null
          product_id?: number | null
          product_name?: string | null
          promo_from?: string | null
          promo_to?: string | null
        }
        Update: {
          acceptance?: string | null
          created_at?: string
          customers?: number | null
          id?: number
          image?: string | null
          price?: number | null
          product_id?: number | null
          product_name?: string | null
          promo_from?: string | null
          promo_to?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          active_from: string
          active_to: string | null
          campaign_code: string
          default_next_check_days: number | null
          exclude_existing_buyers: boolean | null
          id: number
          is_active: boolean | null
          is_group_campaign: boolean | null
          name: string
          Niedrigster_VK: string | null
          rejection_reasons: Json | null
        }
        Insert: {
          active_from: string
          active_to?: string | null
          campaign_code: string
          default_next_check_days?: number | null
          exclude_existing_buyers?: boolean | null
          id?: number
          is_active?: boolean | null
          is_group_campaign?: boolean | null
          name: string
          Niedrigster_VK?: string | null
          rejection_reasons?: Json | null
        }
        Update: {
          active_from?: string
          active_to?: string | null
          campaign_code?: string
          default_next_check_days?: number | null
          exclude_existing_buyers?: boolean | null
          id?: number
          is_active?: boolean | null
          is_group_campaign?: boolean | null
          name?: string
          Niedrigster_VK?: string | null
          rejection_reasons?: Json | null
        }
        Relationships: []
      }
      churn_callbacks: {
        Row: {
          action: string
          Churn_Grund: string | null
          created_at: string
          id: string
          kunden_nummer: number
          note: string | null
          rep_username: string
          telegram_chat_id: number
        }
        Insert: {
          action: string
          Churn_Grund?: string | null
          created_at?: string
          id?: string
          kunden_nummer: number
          note?: string | null
          rep_username: string
          telegram_chat_id: number
        }
        Update: {
          action?: string
          Churn_Grund?: string | null
          created_at?: string
          id?: string
          kunden_nummer?: number
          note?: string | null
          rep_username?: string
          telegram_chat_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "churn_callbacks_kunden_nummer_fkey"
            columns: ["kunden_nummer"]
            isOneToOne: false
            referencedRelation: "dim_customers"
            referencedColumns: ["kunden_nummer"]
          },
        ]
      }
      dim_customers: {
        Row: {
          abc_class: string | null
          activity_state: string | null
          churn_alert_pending: boolean | null
          contact: string | null
          created_at: string | null
          days_since_last_order: number | null
          email: string | null
          email2: string | null
          firma: string | null
          gesellschaft: string | null
          inactive_reason: string | null
          kunden_nummer: number
          last_order_date: string | null
          latitude: number | null
          longitude: number | null
          mobil: string | null
          opening_hours_fri: string | null
          opening_hours_mon: string | null
          opening_hours_notes: string | null
          opening_hours_sat: string | null
          opening_hours_sun: string | null
          opening_hours_thu: string | null
          opening_hours_tue: string | null
          opening_hours_wed: string | null
          orders_365d: number | null
          ort: string | null
          plz: string | null
          purchase_interval: number | null
          rep_id: number | null
          revenue_180d: number | null
          revenue_30d: number | null
          revenue_365d: number | null
          revenue_90d: number | null
          season_end: string | null
          season_start: string | null
          source_file_id: string
          status_active: boolean | null
          strasse: string | null
          telefon: string | null
          u_key: string
          updated_at: string | null
        }
        Insert: {
          abc_class?: string | null
          activity_state?: string | null
          churn_alert_pending?: boolean | null
          contact?: string | null
          created_at?: string | null
          days_since_last_order?: number | null
          email?: string | null
          email2?: string | null
          firma?: string | null
          gesellschaft?: string | null
          inactive_reason?: string | null
          kunden_nummer: number
          last_order_date?: string | null
          latitude?: number | null
          longitude?: number | null
          mobil?: string | null
          opening_hours_fri?: string | null
          opening_hours_mon?: string | null
          opening_hours_notes?: string | null
          opening_hours_sat?: string | null
          opening_hours_sun?: string | null
          opening_hours_thu?: string | null
          opening_hours_tue?: string | null
          opening_hours_wed?: string | null
          orders_365d?: number | null
          ort?: string | null
          plz?: string | null
          purchase_interval?: number | null
          rep_id?: number | null
          revenue_180d?: number | null
          revenue_30d?: number | null
          revenue_365d?: number | null
          revenue_90d?: number | null
          season_end?: string | null
          season_start?: string | null
          source_file_id: string
          status_active?: boolean | null
          strasse?: string | null
          telefon?: string | null
          u_key: string
          updated_at?: string | null
        }
        Update: {
          abc_class?: string | null
          activity_state?: string | null
          churn_alert_pending?: boolean | null
          contact?: string | null
          created_at?: string | null
          days_since_last_order?: number | null
          email?: string | null
          email2?: string | null
          firma?: string | null
          gesellschaft?: string | null
          inactive_reason?: string | null
          kunden_nummer?: number
          last_order_date?: string | null
          latitude?: number | null
          longitude?: number | null
          mobil?: string | null
          opening_hours_fri?: string | null
          opening_hours_mon?: string | null
          opening_hours_notes?: string | null
          opening_hours_sat?: string | null
          opening_hours_sun?: string | null
          opening_hours_thu?: string | null
          opening_hours_tue?: string | null
          opening_hours_wed?: string | null
          orders_365d?: number | null
          ort?: string | null
          plz?: string | null
          purchase_interval?: number | null
          rep_id?: number | null
          revenue_180d?: number | null
          revenue_30d?: number | null
          revenue_365d?: number | null
          revenue_90d?: number | null
          season_end?: string | null
          season_start?: string | null
          source_file_id?: string
          status_active?: boolean | null
          strasse?: string | null
          telefon?: string | null
          u_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dim_customers_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "rep_performance"
            referencedColumns: ["rep_id"]
          },
          {
            foreignKeyName: "dim_customers_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["rep_id"]
          },
          {
            foreignKeyName: "dim_customers_rep_id_fkey1"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "rep_performance"
            referencedColumns: ["rep_id"]
          },
          {
            foreignKeyName: "dim_customers_rep_id_fkey1"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["rep_id"]
          },
        ]
      }
      etl_log: {
        Row: {
          errors: Json | null
          file_id: string | null
          file_name: string | null
          file_url: string | null
          flow: string
          id: number
          n8n_process_id: string
          rows_in: number | null
          rows_updated: number | null
          rows_upserted: number | null
          timestamp: string | null
          warnings: Json | null
        }
        Insert: {
          errors?: Json | null
          file_id?: string | null
          file_name?: string | null
          file_url?: string | null
          flow: string
          id?: number
          n8n_process_id: string
          rows_in?: number | null
          rows_updated?: number | null
          rows_upserted?: number | null
          timestamp?: string | null
          warnings?: Json | null
        }
        Update: {
          errors?: Json | null
          file_id?: string | null
          file_name?: string | null
          file_url?: string | null
          flow?: string
          id?: number
          n8n_process_id?: string
          rows_in?: number | null
          rows_updated?: number | null
          rows_upserted?: number | null
          timestamp?: string | null
          warnings?: Json | null
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          kunden_nummer: number
          stop_order: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          kunden_nummer: number
          stop_order: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          kunden_nummer?: number
          stop_order?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_kunden_nummer_fkey"
            columns: ["kunden_nummer"]
            isOneToOne: false
            referencedRelation: "dim_customers"
            referencedColumns: ["kunden_nummer"]
          },
        ]
      }
      routes: {
        Row: {
          id: string
          rep_id: number
          name: string
          weekday: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rep_id: number
          name: string
          weekday?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rep_id?: number
          name?: string
          weekday?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["rep_id"]
          },
        ]
      }
      fact_sales: {
        Row: {
          artikel: string
          artikel_gruppe: string | null
          buisness_key: string
          datum: string
          gesellschaft: string | null
          id: number
          kategorie: string | null
          kunde_firma: string
          kunden_nummer: number | null
          menge: number
          periode_bis: string
          row_id: number
          sku: string | null
          source_file_id: string
          umsatz: number
        }
        Insert: {
          artikel: string
          artikel_gruppe?: string | null
          buisness_key: string
          datum: string
          gesellschaft?: string | null
          id?: number
          kategorie?: string | null
          kunde_firma: string
          kunden_nummer?: number | null
          menge: number
          periode_bis: string
          row_id: number
          sku?: string | null
          source_file_id: string
          umsatz: number
        }
        Update: {
          artikel?: string
          artikel_gruppe?: string | null
          buisness_key?: string
          datum?: string
          gesellschaft?: string | null
          id?: number
          kategorie?: string | null
          kunde_firma?: string
          kunden_nummer?: number | null
          menge?: number
          periode_bis?: string
          row_id?: number
          sku?: string | null
          source_file_id?: string
          umsatz?: number
        }
        Relationships: [
          {
            foreignKeyName: "fact_sales_kunden_nummer_fkey"
            columns: ["kunden_nummer"]
            isOneToOne: false
            referencedRelation: "dim_customers"
            referencedColumns: ["kunden_nummer"]
          },
        ]
      }
      reps: {
        Row: {
          auth_token: string | null
          auth_user_id: string | null
          name: string
          rep_id: number
          telegram_chat_id: string
          telegram_username: string
          password_hash: string | null
          is_admin: boolean | null
        }
        Insert: {
          auth_token?: string | null
          auth_user_id?: string | null
          name: string
          rep_id: number
          telegram_chat_id: string
          telegram_username: string
          password_hash?: string | null
          is_admin?: boolean | null
        }
        Update: {
          auth_token?: string | null
          auth_user_id?: string | null
          name?: string
          rep_id?: number
          telegram_chat_id?: string
          telegram_username?: string
          password_hash?: string | null
          is_admin?: boolean | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          rep_id: number
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          rep_id: number
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          rep_id?: number
          token?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["rep_id"]
          }
        ]
      }
      tasks: {
        Row: {
          active_from: string | null
          adaption_state: string | null
          campaign_code: string | null
          claimed_at: string | null
          failure_reason: string | null
          id: string
          kunden_nummer: number | null
          last_change: string | null
          last_purchase_date: string | null
          last_sent_at: string | null
          note: string | null
          notitz_rep: string | null
          reminder_date: string | null
          status: string
          verification_failed: boolean | null
          verified_by_sales: boolean | null
        }
        Insert: {
          active_from?: string | null
          adaption_state?: string | null
          campaign_code?: string | null
          claimed_at?: string | null
          failure_reason?: string | null
          id?: string
          kunden_nummer?: number | null
          last_change?: string | null
          last_purchase_date?: string | null
          last_sent_at?: string | null
          note?: string | null
          notitz_rep?: string | null
          reminder_date?: string | null
          status: string
          verification_failed?: boolean | null
          verified_by_sales?: boolean | null
        }
        Update: {
          active_from?: string | null
          adaption_state?: string | null
          campaign_code?: string | null
          claimed_at?: string | null
          failure_reason?: string | null
          id?: string
          kunden_nummer?: number | null
          last_change?: string | null
          last_purchase_date?: string | null
          last_sent_at?: string | null
          note?: string | null
          notitz_rep?: string | null
          reminder_date?: string | null
          status?: string
          verification_failed?: boolean | null
          verified_by_sales?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_campaign_code_fkey"
            columns: ["campaign_code"]
            isOneToOne: false
            referencedRelation: "campaign_performance_stats"
            referencedColumns: ["campaign_code"]
          },
          {
            foreignKeyName: "tasks_campaign_code_fkey"
            columns: ["campaign_code"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_code"]
          },
          {
            foreignKeyName: "tasks_kunden_nummer_fkey"
            columns: ["kunden_nummer"]
            isOneToOne: false
            referencedRelation: "dim_customers"
            referencedColumns: ["kunden_nummer"]
          },
        ]
      }
    }
    Views: {
      campaign_performance_stats: {
        Row: {
          active_from: string | null
          campaign_code: string | null
          campaign_name: string | null
          conversion_rate_percent: number | null
          is_active: boolean | null
          processed_tasks: number | null
          rejection_breakdown: Json | null
          remaining_potential: number | null
          total_assigned_customers: number | null
          total_rejected: number | null
          total_sales_won: number | null
        }
        Relationships: []
      }
      dashboard_tasks: {
        Row: {
          adaption_state: string | null
          auth_token: string | null
          campaign_code: string | null
          campaign_rejection_reasons: Json | null
          custom_interval: number | null
          due_date: string | null
          failure_reason: string | null
          firma: string | null
          kunden_nummer: number | null
          last_change: string | null
          last_purchase_date: string | null
          next_check_date: string | null
          note: string | null
          notitz_rep: string | null
          ort: string | null
          purchase_interval: number | null
          reference_id: string | null
          reminder_date: string | null
          rep_id: number | null
          rep_name: string | null
          season_end: string | null
          season_start: string | null
          seasonal_interval: number | null
          status: string | null
          task_id: string | null
          task_type: string | null
          title: string | null
          verified_by_sales: boolean | null
        }
        Relationships: []
      }
      rep_performance: {
        Row: {
          active_customers: number | null
          assigned_customers: number | null
          at_risk_customers: number | null
          completed_tasks: number | null
          completion_rate: number | null
          name: string | null
          open_tasks: number | null
          pending_tasks: number | null
          rep_id: number | null
          tasks_per_day_30d: number | null
          tasks_per_day_7d: number | null
          total_tasks: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_and_update_customers: { Args: never; Returns: undefined }
      authenticate_rep: {
        Args: { p_password: string }
        Returns: {
          session_token: string
          rep_id: number
          rep_name: string
          is_admin: boolean
          telegram_chat_id: string
          expires_at: string
        }[]
      }
      validate_session: {
        Args: { p_token: string }
        Returns: {
          rep_id: number
          rep_name: string
          is_admin: boolean
          telegram_chat_id: string
          auth_token: string | null
          expires_at: string
        }[]
      }
      invalidate_session: {
        Args: { p_token: string }
        Returns: undefined
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      change_password: {
        Args: { p_session_token: string; p_new_password: string }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: never
        Returns: number
      }
      inject_campaign_tasks: {
        Args: never
        Returns: {
          campaign_code_out: string
          tasks_created: number
        }[]
      }
      refresh_customer_metrics: { Args: never; Returns: undefined }
      update_abc_classification: { Args: never; Returns: undefined }
      update_adoption_status: {
        Args: never
        Returns: {
          affected_tasks: number
          new_tasks: number
          updated_tasks: number
        }[]
      }
      upsert_fact_sales: {
        Args: {
          p_artikel: string
          p_buisness_key: string
          p_datum: string
          p_kunde_firma: string
          p_kunden_nummer: number
          p_menge: number
          p_periode_bis: string
          p_row_id: number
          p_sku: string
          p_source_file_id: string
          p_umsatz: number
        }
        Returns: string
      }
      verify_claimed_purchases: {
        Args: never
        Returns: {
          action_taken: string
          campaign_code: string
          check_status: string
          claimed_at: string
          found_purchase_date: string
          kunden_nummer: number
          task_id: string
        }[]
      }
    }
    Enums: {
      purchase_interval: "7" | "14" | "21" | "28" | "Saisonal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      purchase_interval: ["7", "14", "21", "28", "Saisonal"],
    },
  },
} as const
