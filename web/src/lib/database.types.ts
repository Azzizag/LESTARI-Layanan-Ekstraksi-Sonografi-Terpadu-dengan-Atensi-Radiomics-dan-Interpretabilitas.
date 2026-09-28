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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          created_at: string
          id: string
          image_sha256: string | null
          original_path: string
          patient_id: string
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_sha256?: string | null
          original_path: string
          patient_id: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_sha256?: string | null
          original_path?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "case_overview"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          code: string
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          birth_date?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          birth_date?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          cached: boolean
          case_id: string
          created_at: string
          gradcam_path: string | null
          heatmap_path: string | null
          id: string
          latency_ms: Json | null
          model_name: string | null
          model_version: string
          pipeline: Json | null
          predicted_class: Database["public"]["Enums"]["scan_class"]
          preprocessed_path: string | null
          prob_benign: number
          prob_malignant: number
          prob_normal: number
          roi: Json | null
          roi_mask_path: string | null
          shap_top: Json | null
          warnings: string[]
        }
        Insert: {
          cached?: boolean
          case_id: string
          created_at?: string
          gradcam_path?: string | null
          heatmap_path?: string | null
          id?: string
          latency_ms?: Json | null
          model_name?: string | null
          model_version: string
          pipeline?: Json | null
          predicted_class: Database["public"]["Enums"]["scan_class"]
          preprocessed_path?: string | null
          prob_benign: number
          prob_malignant: number
          prob_normal: number
          roi?: Json | null
          roi_mask_path?: string | null
          shap_top?: Json | null
          warnings?: string[]
        }
        Update: {
          cached?: boolean
          case_id?: string
          created_at?: string
          gradcam_path?: string | null
          heatmap_path?: string | null
          id?: string
          latency_ms?: Json | null
          model_name?: string | null
          model_version?: string
          pipeline?: Json | null
          predicted_class?: Database["public"]["Enums"]["scan_class"]
          preprocessed_path?: string | null
          prob_benign?: number
          prob_malignant?: number
          prob_normal?: number
          roi?: Json | null
          roi_mask_path?: string | null
          shap_top?: Json | null
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "predictions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_overview"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "predictions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          agrees_with_ai: boolean | null
          ai_class: Database["public"]["Enums"]["scan_class"] | null
          case_id: string
          created_at: string
          doctor_id: string
          final_class: Database["public"]["Enums"]["scan_class"]
          id: string
          mask_path: string | null
          notes: string | null
          prediction_id: string | null
          updated_at: string
        }
        Insert: {
          agrees_with_ai?: boolean | null
          ai_class?: Database["public"]["Enums"]["scan_class"] | null
          case_id: string
          created_at?: string
          doctor_id: string
          final_class: Database["public"]["Enums"]["scan_class"]
          id?: string
          mask_path?: string | null
          notes?: string | null
          prediction_id?: string | null
          updated_at?: string
        }
        Update: {
          agrees_with_ai?: boolean | null
          ai_class?: Database["public"]["Enums"]["scan_class"] | null
          case_id?: string
          created_at?: string
          doctor_id?: string
          final_class?: Database["public"]["Enums"]["scan_class"]
          id?: string
          mask_path?: string | null
          notes?: string | null
          prediction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_overview"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "case_overview"
            referencedColumns: ["prediction_id"]
          },
          {
            foreignKeyName: "reviews_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      case_overview: {
        Row: {
          agrees_with_ai: boolean | null
          cached: boolean | null
          case_id: string | null
          created_at: string | null
          doctor_id: string | null
          final_class: Database["public"]["Enums"]["scan_class"] | null
          model_version: string | null
          original_path: string | null
          patient_code: string | null
          patient_id: string | null
          patient_name: string | null
          predicted_class: Database["public"]["Enums"]["scan_class"] | null
          prediction_id: string | null
          prob_benign: number | null
          prob_malignant: number | null
          prob_normal: number | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["case_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      case_status:
        | "analyzing"
        | "analysis_failed"
        | "awaiting_review"
        | "priority"
        | "done"
      scan_class: "normal" | "benign" | "malignant"
      user_role: "admin" | "doctor"
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
    Enums: {
      case_status: [
        "analyzing",
        "analysis_failed",
        "awaiting_review",
        "priority",
        "done",
      ],
      scan_class: ["normal", "benign", "malignant"],
      user_role: ["admin", "doctor"],
    },
  },
} as const
