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
      admin_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          confidence: number | null
          content: string
          created_at: string
          generated_for_date: string
          id: string
          insight_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string
          generated_for_date?: string
          id?: string
          insight_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string
          generated_for_date?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      aux_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          note: string | null
          started_at: string
          status_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          status_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          status_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aux_sessions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "aux_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      aux_statuses: {
        Row: {
          category: Database["public"]["Enums"]["aux_category"]
          color: string
          created_at: string
          id: string
          is_default: boolean
          is_paid: boolean
          name: string
          shortcut_key: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["aux_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_paid?: boolean
          name: string
          shortcut_key?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["aux_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_paid?: boolean
          name?: string
          shortcut_key?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_adherence: {
        Row: {
          break_overrun_minutes: number
          computed_at: string
          for_date: string
          id: string
          scheduled_minutes: number
          score: number
          user_id: string
          worked_minutes: number
        }
        Insert: {
          break_overrun_minutes?: number
          computed_at?: string
          for_date: string
          id?: string
          scheduled_minutes?: number
          score: number
          user_id: string
          worked_minutes?: number
        }
        Update: {
          break_overrun_minutes?: number
          computed_at?: string
          for_date?: string
          id?: string
          scheduled_minutes?: number
          score?: number
          user_id?: string
          worked_minutes?: number
        }
        Relationships: []
      }
      manager_notes: {
        Row: {
          author_id: string
          body: string
          color: string
          created_at: string
          id: string
          recipient_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          color?: string
          created_at?: string
          id?: string
          recipient_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          color?: string
          created_at?: string
          id?: string
          recipient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mindmap_boards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mindmap_edges: {
        Row: {
          board_id: string
          created_at: string
          id: string
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mindmap_edges_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mindmap_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mindmap_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "mindmap_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mindmap_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "mindmap_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mindmap_nodes: {
        Row: {
          board_id: string
          color: string | null
          created_at: string
          data: Json
          height: number | null
          id: string
          node_type: Database["public"]["Enums"]["mindmap_node_type"]
          position_x: number
          position_y: number
          tags: string[] | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string
          data?: Json
          height?: number | null
          id?: string
          node_type?: Database["public"]["Enums"]["mindmap_node_type"]
          position_x?: number
          position_y?: number
          tags?: string[] | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string
          data?: Json
          height?: number | null
          id?: string
          node_type?: Database["public"]["Enums"]["mindmap_node_type"]
          position_x?: number
          position_y?: number
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mindmap_nodes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mindmap_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_goal_minutes: number
          display_name: string | null
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number
          display_name?: string | null
          id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number
          display_name?: string | null
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          break_minutes: number
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          required_status_category: Database["public"]["Enums"]["aux_category"]
          start_time: string
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          required_status_category?: Database["public"]["Enums"]["aux_category"]
          start_time: string
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          break_minutes?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          required_status_category?: Database["public"]["Enums"]["aux_category"]
          start_time?: string
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: number
          status: Database["public"]["Enums"]["task_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          invited_email: string | null
          status: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          status?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          status?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: { Args: { _email: string }; Returns: string }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "member"
      aux_category: "productive" | "neutral" | "unproductive"
      mindmap_node_type: "text" | "image" | "link" | "task"
      request_status: "pending" | "approved" | "rejected"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
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
      app_role: ["super_admin", "admin", "member"],
      aux_category: ["productive", "neutral", "unproductive"],
      mindmap_node_type: ["text", "image", "link", "task"],
      request_status: ["pending", "approved", "rejected"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
    },
  },
} as const
