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
      achievements: {
        Row: {
          achievement_type: string
          created_at: string
          description: string
          earned_at: string
          icon: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          created_at?: string
          description: string
          earned_at?: string
          icon: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string
          description?: string
          earned_at?: string
          icon?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          seen: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          seen?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          seen?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_rate_limits: {
        Row: {
          created_at: string
          function_name: string
          id: string
          last_request_at: string
          request_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          last_request_at?: string
          request_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          last_request_at?: string
          request_count?: number
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          calories: number | null
          carbs: number | null
          category: string | null
          created_at: string | null
          description: string | null
          fats: number | null
          id: string
          image_url: string | null
          name: string
          price: number
          proteins: number | null
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          fats?: number | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          proteins?: number | null
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          fats?: number | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          proteins?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          calories: number | null
          created_at: string | null
          delivery_date: string | null
          delivery_fee: number | null
          delivery_type: string
          email: string | null
          id: string
          items: Json
          kraj: string | null
          menu_id: string | null
          menu_size: string
          name: string | null
          note: string | null
          payment_type: string | null
          phone: string
          status: string | null
          total_price: number
          user_id: string
        }
        Insert: {
          address: string
          calories?: number | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_type: string
          email?: string | null
          id?: string
          items: Json
          kraj?: string | null
          menu_id?: string | null
          menu_size: string
          name?: string | null
          note?: string | null
          payment_type?: string | null
          phone: string
          status?: string | null
          total_price: number
          user_id: string
        }
        Update: {
          address?: string
          calories?: number | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_type?: string
          email?: string | null
          id?: string
          items?: Json
          kraj?: string | null
          menu_id?: string | null
          menu_size?: string
          name?: string | null
          note?: string | null
          payment_type?: string | null
          phone?: string
          status?: string | null
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "weekly_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          created_at: string | null
          date: string
          id: string
          photo_url: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          photo_url?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          photo_url?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity: string | null
          address: string | null
          age: number | null
          allergies: string[] | null
          budget: string | null
          created_at: string | null
          dislikes: string[] | null
          email: string | null
          favorite_foods: string[] | null
          gender: string | null
          goal: string | null
          goal_weight: number | null
          health_issues: string | null
          height: number | null
          id: string
          kraj: string | null
          name: string | null
          notes: string | null
          phone: string | null
          preferences: string[] | null
          promo_code: string | null
          promo_discount_used: boolean | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          activity?: string | null
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          budget?: string | null
          created_at?: string | null
          dislikes?: string[] | null
          email?: string | null
          favorite_foods?: string[] | null
          gender?: string | null
          goal?: string | null
          goal_weight?: number | null
          health_issues?: string | null
          height?: number | null
          id?: string
          kraj?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: string[] | null
          promo_code?: string | null
          promo_discount_used?: boolean | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          activity?: string | null
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          budget?: string | null
          created_at?: string | null
          dislikes?: string[] | null
          email?: string | null
          favorite_foods?: string[] | null
          gender?: string | null
          goal?: string | null
          goal_weight?: number | null
          health_issues?: string | null
          height?: number | null
          id?: string
          kraj?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: string[] | null
          promo_code?: string | null
          promo_discount_used?: boolean | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_menus: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          items: Json
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          items: Json
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          items?: Json
          start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: { Args: { email_input: string }; Returns: boolean }
      get_current_user_role: { Args: never; Returns: string }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
