export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ageing: {
        Row: {
          b0_30: number
          b180_plus: number
          b30_60: number
          b60_90: number
          b90_180: number
          company_id: string
          created_at: string
          id: string
          kind: string
          party: string
          period_id: string
          total: number
        }
        Insert: {
          b0_30?: number
          b180_plus?: number
          b30_60?: number
          b60_90?: number
          b90_180?: number
          company_id: string
          created_at?: string
          id?: string
          kind: string
          party: string
          period_id: string
          total?: number
        }
        Update: {
          b0_30?: number
          b180_plus?: number
          b30_60?: number
          b60_90?: number
          b90_180?: number
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          party?: string
          period_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ageing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ageing_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          at: string
          company_id: string | null
          detail: Json | null
          id: number
          ip: string | null
          period_id: string | null
          target: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          at?: string
          company_id?: string | null
          detail?: Json | null
          id?: never
          ip?: string | null
          period_id?: string | null
          target?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          at?: string
          company_id?: string | null
          detail?: Json | null
          id?: never
          ip?: string | null
          period_id?: string | null
          target?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_groups: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          group_id: string | null
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          key: string
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "branch_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_companies: {
        Row: {
          ca_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          ca_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          ca_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_companies_ca_id_fkey"
            columns: ["ca_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          archived_at: string | null
          cin: string | null
          created_at: string
          fy_start_month: number
          group_name: string | null
          gst: string | null
          id: string
          logo_url: string | null
          name: string
          pan: string | null
          slug: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          cin?: string | null
          created_at?: string
          fy_start_month?: number
          group_name?: string | null
          gst?: string | null
          id?: string
          logo_url?: string | null
          name: string
          pan?: string | null
          slug: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          cin?: string | null
          created_at?: string
          fy_start_month?: number
          group_name?: string | null
          gst?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pan?: string | null
          slug?: string
        }
        Relationships: []
      }
      ledger_map: {
        Row: {
          bs_pl: string
          classification: string | null
          company_id: string
          grouping: string
          id: string
          ledger_name: string
          source: string
          updated_at: string
        }
        Insert: {
          bs_pl: string
          classification?: string | null
          company_id: string
          grouping: string
          id?: string
          ledger_name: string
          source?: string
          updated_at?: string
        }
        Update: {
          bs_pl?: string
          classification?: string | null
          company_id?: string
          grouping?: string
          id?: string
          ledger_name?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_inputs: {
        Row: {
          branch_id: string | null
          company_id: string
          id: string
          key: string
          period_id: string
          segment: string
          value: number
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          id?: string
          key: string
          period_id: string
          segment?: string
          value?: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          id?: string
          key?: string
          period_id?: string
          segment?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_inputs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_inputs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_inputs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tb: {
        Row: {
          branch_id: string | null
          bs_pl: string
          classification: string
          closing: number
          company_id: string
          created_at: string
          credit: number
          debit: number
          grouping: string
          id: string
          opening: number
          particulars: string
          period_id: string
          unmapped: boolean
        }
        Insert: {
          branch_id?: string | null
          bs_pl: string
          classification: string
          closing?: number
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          grouping: string
          id?: string
          opening?: number
          particulars: string
          period_id: string
          unmapped?: boolean
        }
        Update: {
          branch_id?: string | null
          bs_pl?: string
          classification?: string
          closing?: number
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          grouping?: string
          id?: string
          opening?: number
          particulars?: string
          period_id?: string
          unmapped?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "master_tb_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tb_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tb_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tb_edits: {
        Row: {
          branch_id: string | null
          company_id: string
          edited_at: string
          edited_by: string | null
          field: string
          id: string
          new_value: number
          old_value: number
          particulars: string
          period_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          edited_at?: string
          edited_by?: string | null
          field: string
          id?: string
          new_value: number
          old_value: number
          particulars: string
          period_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          edited_at?: string
          edited_by?: string | null
          field?: string
          id?: string
          new_value?: number
          old_value?: number
          particulars?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tb_edits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tb_edits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tb_edits_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tb_edits_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      mis_budgets: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          key: string
          period_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          key: string
          period_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          period_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mis_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mis_budgets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      mis_segments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key: string
          label: string
          purchase_groupings: string[]
          revenue_fallback_grouping: string | null
          revenue_grouping: string | null
          revenue_manual_key: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key: string
          label: string
          purchase_groupings?: string[]
          revenue_fallback_grouping?: string | null
          revenue_grouping?: string | null
          revenue_manual_key?: string | null
          sort_order: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          purchase_groupings?: string[]
          revenue_fallback_grouping?: string | null
          revenue_grouping?: string | null
          revenue_manual_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mis_segments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mis_template_lines: {
        Row: {
          company_id: string
          created_at: string
          fallback_grouping: string | null
          grouping: string | null
          id: string
          key: string
          kind: string
          label: string
          manual_key: string | null
          negate: boolean
          section: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          fallback_grouping?: string | null
          grouping?: string | null
          id?: string
          key: string
          kind: string
          label: string
          manual_key?: string | null
          negate?: boolean
          section: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          fallback_grouping?: string | null
          grouping?: string | null
          id?: string
          key?: string
          kind?: string
          label?: string
          manual_key?: string | null
          negate?: boolean
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mis_template_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          company_id: string
          created_at: string
          days_in_period: number | null
          gp_dashboard_html: string | null
          id: string
          label: string
          month: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_in_period?: number | null
          gp_dashboard_html?: string | null
          id?: string
          label: string
          month: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_in_period?: number | null
          gp_dashboard_html?: string | null
          id?: string
          label?: string
          month?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          author_id: string
          body: string
          company_id: string
          created_at: string
          id: string
          period_id: string | null
          status: string
        }
        Insert: {
          author_id: string
          body: string
          company_id: string
          created_at?: string
          id?: string
          period_id?: string | null
          status?: string
        }
        Update: {
          author_id?: string
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          period_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      query_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          query_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          query_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_replies_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      report_scope_config: {
        Row: {
          company_id: string
          id: string
          report: string
          scope_depth: string
          updated_at: string
        }
        Insert: {
          company_id: string
          id?: string
          report: string
          scope_depth?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          report?: string
          scope_depth?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_scope_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_info: {
        Row: {
          category: string
          closing_value: number
          company_id: string
          id: string
          opening_value: number
          period_id: string
        }
        Insert: {
          category: string
          closing_value?: number
          company_id: string
          id?: string
          opening_value?: number
          period_id: string
        }
        Update: {
          category?: string
          closing_value?: number
          company_id?: string
          id?: string
          opening_value?: number
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_info_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_period: { Args: { p_period_id: string }; Returns: boolean }
      current_app_role: { Args: never; Returns: string }
      visible_company_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

