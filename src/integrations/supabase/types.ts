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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      case_actions: {
        Row: {
          action_type: string
          case_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          document_category: string | null
          id: string
          is_client_action: boolean
          metadata: Json
          priority: string
          reasoning: string | null
          result_content: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          case_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_category?: string | null
          id?: string
          is_client_action?: boolean
          metadata?: Json
          priority?: string
          reasoning?: string | null
          result_content?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          case_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_category?: string | null
          id?: string
          is_client_action?: boolean
          metadata?: Json
          priority?: string
          reasoning?: string | null
          result_content?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_activities: {
        Row: {
          activity_type: string
          case_id: string
          client_visible: boolean
          content: string | null
          created_at: string
          id: string
          metadata: Json
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          case_id: string
          client_visible?: boolean
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          case_id?: string
          client_visible?: boolean
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          ai_status: string
          case_id: string
          client_visible: boolean
          created_at: string
          document_category: string
          extracted_data: Json
          file_type: string | null
          id: string
          metadata: Json
          name: string
          raw_text: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          ai_status?: string
          case_id: string
          client_visible?: boolean
          created_at?: string
          document_category?: string
          extracted_data?: Json
          file_type?: string | null
          id?: string
          metadata?: Json
          name: string
          raw_text?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string
          user_id: string
        }
        Update: {
          ai_status?: string
          case_id?: string
          client_visible?: boolean
          created_at?: string
          document_category?: string
          extracted_data?: Json
          file_type?: string | null
          id?: string
          metadata?: Json
          name?: string
          raw_text?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_drafts: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          case_id: string
          client_visible: boolean
          content: string
          created_at: string
          document_type: string
          docx_storage_path: string | null
          id: string
          jurisdiction: string
          metadata: Json
          pdf_storage_path: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          version_number: number
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          client_visible?: boolean
          content?: string
          created_at?: string
          document_type?: string
          docx_storage_path?: string | null
          id?: string
          jurisdiction?: string
          metadata?: Json
          pdf_storage_path?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          version_number?: number
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          client_visible?: boolean
          content?: string
          created_at?: string
          document_type?: string
          docx_storage_path?: string | null
          id?: string
          jurisdiction?: string
          metadata?: Json
          pdf_storage_path?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_context: Json
          case_summary: string
          case_type: Database["public"]["Enums"]["case_type"]
          client_id: string | null
          client_name: string
          client_summary: string
          created_at: string
          id: string
          intake_data: Json
          key_facts: string[]
          last_recommendations: Json
          opponent: string | null
          progress_percentage: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_context?: Json
          case_summary?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          client_id?: string | null
          client_name: string
          client_summary?: string
          created_at?: string
          id?: string
          intake_data?: Json
          key_facts?: string[]
          last_recommendations?: Json
          opponent?: string | null
          progress_percentage?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_context?: Json
          case_summary?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          client_id?: string | null
          client_name?: string
          client_summary?: string
          created_at?: string
          id?: string
          intake_data?: Json
          key_facts?: string[]
          last_recommendations?: Json
          opponent?: string | null
          progress_percentage?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_access_tokens: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          token: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          token?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          incorporation_date: string | null
          jurisdiction: string
          registered_address: string | null
          registration_number: string | null
          services: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string
          registered_address?: string | null
          registration_number?: string | null
          services?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string
          registered_address?: string | null
          registration_number?: string | null
          services?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      directors: {
        Row: {
          client_id: string
          created_at: string
          full_name: string
          id: string
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          full_name: string
          id?: string
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          full_name?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_status: string | null
          case_id: string | null
          client_id: string
          created_at: string
          extracted_data: Json | null
          file_type: string | null
          id: string
          name: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_status?: string | null
          case_id?: string | null
          client_id: string
          created_at?: string
          extracted_data?: Json | null
          file_type?: string | null
          id?: string
          name: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_status?: string | null
          case_id?: string | null
          client_id?: string
          created_at?: string
          extracted_data?: Json | null
          file_type?: string | null
          id?: string
          name?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      license_applications: {
        Row: {
          case_id: string | null
          client_id: string
          created_at: string
          id: string
          license_type: string
          missing_documents: number | null
          readiness_score: number | null
          regulatory_authority: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          license_type: string
          missing_documents?: number | null
          readiness_score?: number | null
          regulatory_authority: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          license_type?: string
          missing_documents?: number | null
          readiness_score?: number | null
          regulatory_authority?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_applications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          attachments: Json
          case_id: string | null
          client_id: string
          created_at: string
          id: string
          message: string
          metadata: Json
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          attachments?: Json
          case_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          attachments?: Json
          case_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          firm_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          firm_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          firm_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shareholders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          percentage: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          percentage?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "shareholders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_portal_cases: {
        Args: { _token: string }
        Returns: {
          case_type: Database["public"]["Enums"]["case_type"]
          client_name: string
          client_summary: string
          created_at: string
          id: string
          progress_percentage: number
          status: string
          title: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      case_type:
        | "licensing"
        | "contract_dispute"
        | "corporate"
        | "employment"
        | "intellectual_property"
        | "general_legal"
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
      case_type: [
        "licensing",
        "contract_dispute",
        "corporate",
        "employment",
        "intellectual_property",
        "general_legal",
      ],
    },
  },
} as const
