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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addon_images: {
        Row: {
          addon_id: string
          alt_text: string
          created_at: string
          file_path: string
          id: string
          is_published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          addon_id: string
          alt_text: string
          created_at?: string
          file_path: string
          id?: string
          is_published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          addon_id?: string
          alt_text?: string
          created_at?: string
          file_path?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_images_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_releases: {
        Row: {
          addon_id: string
          changelog: string
          created_at: string
          file_path: string | null
          file_size_bytes: number | null
          game_version: string
          id: string
          interface_version: number
          published_at: string | null
          sha256: string | null
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          version: string
        }
        Insert: {
          addon_id: string
          changelog?: string
          created_at?: string
          file_path?: string | null
          file_size_bytes?: number | null
          game_version: string
          id?: string
          interface_version: number
          published_at?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          version: string
        }
        Update: {
          addon_id?: string
          changelog?: string
          created_at?: string
          file_path?: string | null
          file_size_bytes?: number | null
          game_version?: string
          id?: string
          interface_version?: number
          published_at?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_releases_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          author_name: string
          category_id: string
          created_at: string
          credits: string
          description: string
          distribution_approved: boolean
          id: string
          installation_instructions: string
          license_name: string
          name: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          summary: string
          updated_at: string
        }
        Insert: {
          author_name: string
          category_id: string
          created_at?: string
          credits?: string
          description?: string
          distribution_approved?: boolean
          id?: string
          installation_instructions?: string
          license_name?: string
          name: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category_id?: string
          created_at?: string
          credits?: string
          description?: string
          distribution_approved?: boolean
          id?: string
          installation_instructions?: string
          license_name?: string
          name?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      editorial_events: {
        Row: {
          actor_id: string | null
          addon_id: string | null
          after_data: Json | null
          before_data: Json | null
          changed_fields: string[]
          entity: string
          entity_id: string
          id: string
          note: string
          occurred_at: string
          operation: string
        }
        Insert: {
          actor_id?: string | null
          addon_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_fields?: string[]
          entity: string
          entity_id: string
          id?: string
          note?: string
          occurred_at?: string
          operation: string
        }
        Update: {
          actor_id?: string | null
          addon_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_fields?: string[]
          entity?: string
          entity_id?: string
          id?: string
          note?: string
          occurred_at?: string
          operation?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_access: { Args: never; Returns: string }
      admit_support_test_checkout: { Args: never; Returns: Json }
      catalog_page: {
        Args: {
          p_after_name?: string
          p_after_slug?: string
          p_category?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          author_name: string
          category_id: string
          created_at: string
          credits: string
          description: string
          distribution_approved: boolean
          id: string
          installation_instructions: string
          license_name: string
          name: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          summary: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "addons"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      change_draft_asset: {
        Args: {
          p_addon: string
          p_entity: string
          p_expected: string
          p_id: string
          p_note?: string
          p_path?: string
          p_sha?: string
          p_size?: number
        }
        Returns: Json
      }
      draft_asset_status: { Args: { p_addon: string }; Returns: Json }
      editorial_action: {
        Args: {
          p_action: string
          p_addon_id: string
          p_alt?: string
          p_entity: string
          p_expected: string
          p_id: string
          p_note: string
          p_order?: number
        }
        Returns: Json
      }
      read_support_test_status: {
        Args: { p_session_id: string }
        Returns: Json
      }
      record_support_test_event: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_created: number
          p_event_id: string
          p_event_type: string
          p_session_id: string
          p_state: string
        }
        Returns: string
      }
      retire_asset_object: {
        Args: {
          p_addon: string
          p_bucket: string
          p_id: string
          p_path: string
        }
        Returns: boolean
      }
      save_category: {
        Args: {
          p_expected?: string
          p_id?: string
          p_name: string
          p_note: string
          p_slug: string
          p_sort: number
          p_visible: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      publication_status: "draft" | "published" | "archived"
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
      publication_status: ["draft", "published", "archived"],
    },
  },
} as const
