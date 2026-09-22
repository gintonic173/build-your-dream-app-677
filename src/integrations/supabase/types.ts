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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      charging_sessions: {
        Row: {
          charger_type: string | null
          cost_eur: number | null
          created_at: string
          currency: string
          end_soc: number | null
          energy_kwh: number
          id: string
          location_label: string | null
          mileage_km: number | null
          note: string | null
          occurred_at: string
          price_per_kwh: number | null
          source: string
          start_soc: number | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          charger_type?: string | null
          cost_eur?: number | null
          created_at?: string
          currency?: string
          end_soc?: number | null
          energy_kwh: number
          id?: string
          location_label?: string | null
          mileage_km?: number | null
          note?: string | null
          occurred_at?: string
          price_per_kwh?: number | null
          source?: string
          start_soc?: number | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          charger_type?: string | null
          cost_eur?: number | null
          created_at?: string
          currency?: string
          end_soc?: number | null
          energy_kwh?: number
          id?: string
          location_label?: string | null
          mileage_km?: number | null
          note?: string | null
          occurred_at?: string
          price_per_kwh?: number | null
          source?: string
          start_soc?: number | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charging_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: Json
          created_at: string
          id: number
          message_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: never
          message_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: never
          message_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          metric: Json | null
          severity: string
          title: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          metric?: Json | null
          severity?: string
          title: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          metric?: Json | null
          severity?: string
          title?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          category: string
          cost_eur: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          mileage_km: number | null
          next_due_at: string | null
          next_due_km: number | null
          occurred_at: string
          provider: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          category?: string
          cost_eur?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          mileage_km?: number | null
          next_due_at?: string | null
          next_due_km?: number | null
          occurred_at?: string
          provider?: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          category?: string
          cost_eur?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          mileage_km?: number | null
          next_due_at?: string | null
          next_due_km?: number | null
          occurred_at?: string
          provider?: string | null
          title?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          avg_speed_kmh: number | null
          created_at: string
          distance_km: number
          end_soc: number | null
          energy_kwh: number | null
          id: string
          label: string | null
          note: string | null
          occurred_at: string
          start_soc: number | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km: number
          end_soc?: number | null
          energy_kwh?: number | null
          id?: string
          label?: string | null
          note?: string | null
          occurred_at?: string
          start_soc?: number | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number
          end_soc?: number | null
          energy_kwh?: number | null
          id?: string
          label?: string | null
          note?: string | null
          occurred_at?: string
          start_soc?: number | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          battery_kwh: number | null
          created_at: string
          efficiency_wh_km: number | null
          id: string
          make: string | null
          model: string | null
          model_year: number | null
          name: string
          plate: string | null
          user_id: string
          wltp_range_km: number | null
        }
        Insert: {
          battery_kwh?: number | null
          created_at?: string
          efficiency_wh_km?: number | null
          id?: string
          make?: string | null
          model?: string | null
          model_year?: number | null
          name: string
          plate?: string | null
          user_id: string
          wltp_range_km?: number | null
        }
        Update: {
          battery_kwh?: number | null
          created_at?: string
          efficiency_wh_km?: number | null
          id?: string
          make?: string | null
          model?: string | null
          model_year?: number | null
          name?: string
          plate?: string | null
          user_id?: string
          wltp_range_km?: number | null
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
