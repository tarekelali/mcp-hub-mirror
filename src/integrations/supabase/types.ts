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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cmps: {
        Row: {
          acc_folder_id: string | null
          acc_project_id: string
          area_sqm: number | null
          country_code: string
          created_at: string | null
          id: string
          name: string
          published: boolean
        }
        Insert: {
          acc_folder_id?: string | null
          acc_project_id: string
          area_sqm?: number | null
          country_code: string
          created_at?: string | null
          id?: string
          name: string
          published?: boolean
        }
        Update: {
          acc_folder_id?: string | null
          acc_project_id?: string
          area_sqm?: number | null
          country_code?: string
          created_at?: string | null
          id?: string
          name?: string
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cmps_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cmps_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "mv_country_counts"
            referencedColumns: ["code"]
          },
        ]
      }
      contacts: {
        Row: {
          cmp_id: string
          email: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          cmp_id: string
          email: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          cmp_id?: string
          email?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_cmp_id_fkey"
            columns: ["cmp_id"]
            isOneToOne: true
            referencedRelation: "cmps"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          centroid: Json | null
          code: string
          name: string
        }
        Insert: {
          centroid?: Json | null
          code: string
          name: string
        }
        Update: {
          centroid?: Json | null
          code?: string
          name?: string
        }
        Relationships: []
      }
      da_jobs: {
        Row: {
          attempts: number
          cmp_id: string
          created_at: string
          id: string
          input_item_id: string
          input_version_id: string
          output_urls: Json | null
          status: string
          task: string
          workitem_id: string | null
        }
        Insert: {
          attempts?: number
          cmp_id: string
          created_at?: string
          id?: string
          input_item_id: string
          input_version_id: string
          output_urls?: Json | null
          status?: string
          task: string
          workitem_id?: string | null
        }
        Update: {
          attempts?: number
          cmp_id?: string
          created_at?: string
          id?: string
          input_item_id?: string
          input_version_id?: string
          output_urls?: Json | null
          status?: string
          task?: string
          workitem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "da_jobs_cmp_id_fkey"
            columns: ["cmp_id"]
            isOneToOne: false
            referencedRelation: "cmps"
            referencedColumns: ["id"]
          },
        ]
      }
      detailed_solutions: {
        Row: {
          area_sqm: number
          code: string
          hfb_id: string
          id: string
          name: string | null
          pct: number
          urn_country: string | null
          urn_crs: string | null
          urn_current: string | null
          urn_similar: string | null
        }
        Insert: {
          area_sqm: number
          code: string
          hfb_id: string
          id?: string
          name?: string | null
          pct: number
          urn_country?: string | null
          urn_crs?: string | null
          urn_current?: string | null
          urn_similar?: string | null
        }
        Update: {
          area_sqm?: number
          code?: string
          hfb_id?: string
          id?: string
          name?: string | null
          pct?: number
          urn_country?: string | null
          urn_crs?: string | null
          urn_current?: string | null
          urn_similar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detailed_solutions_hfb_id_fkey"
            columns: ["hfb_id"]
            isOneToOne: false
            referencedRelation: "hfbs"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_tokens: {
        Row: {
          aps_user_id: string | null
          created_at: string | null
          refresh_token_enc: string
          scope: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          aps_user_id?: string | null
          created_at?: string | null
          refresh_token_enc: string
          scope: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          aps_user_id?: string | null
          created_at?: string | null
          refresh_token_enc?: string
          scope?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hfbs: {
        Row: {
          area_sqm: number
          cmp_id: string
          id: string
          level: Database["public"]["Enums"]["level_kind"]
          name: string
          pct: number
        }
        Insert: {
          area_sqm: number
          cmp_id: string
          id?: string
          level: Database["public"]["Enums"]["level_kind"]
          name: string
          pct: number
        }
        Update: {
          area_sqm?: number
          cmp_id?: string
          id?: string
          level?: Database["public"]["Enums"]["level_kind"]
          name?: string
          pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "hfbs_cmp_id_fkey"
            columns: ["cmp_id"]
            isOneToOne: false
            referencedRelation: "cmps"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_jobs: {
        Row: {
          attempts: number
          cmp_id: string
          id: string
          requested_by: string | null
          scheduled_at: string
          status: string
        }
        Insert: {
          attempts?: number
          cmp_id: string
          id?: string
          requested_by?: string | null
          scheduled_at?: string
          status?: string
        }
        Update: {
          attempts?: number
          cmp_id?: string
          id?: string
          requested_by?: string | null
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_cmp_id_fkey"
            columns: ["cmp_id"]
            isOneToOne: false
            referencedRelation: "cmps"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_runs: {
        Row: {
          cadence: string
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          cadence?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          cadence?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      metrics_aps_usage: {
        Row: {
          calls: number
          day: string
          endpoint: string
          tokens: number
        }
        Insert: {
          calls?: number
          day: string
          endpoint: string
          tokens?: number
        }
        Update: {
          calls?: number
          day?: string
          endpoint?: string
          tokens?: number
        }
        Relationships: []
      }
      revit_sheets: {
        Row: {
          acc_item_id: string
          acc_version_id: string
          cmp_id: string
          id: string
          last_synced_at: string | null
          name: string
          number: string
          pdf_url: string | null
        }
        Insert: {
          acc_item_id: string
          acc_version_id: string
          cmp_id: string
          id?: string
          last_synced_at?: string | null
          name: string
          number: string
          pdf_url?: string | null
        }
        Update: {
          acc_item_id?: string
          acc_version_id?: string
          cmp_id?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          number?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revit_sheets_cmp_id_fkey"
            columns: ["cmp_id"]
            isOneToOne: false
            referencedRelation: "cmps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_country_counts: {
        Row: {
          centroid: Json | null
          code: string | null
          name: string | null
          published: number | null
          total: number | null
          unpublished: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_mv_country_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      level_kind: "marketHall" | "showroom"
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
      level_kind: ["marketHall", "showroom"],
    },
  },
} as const
