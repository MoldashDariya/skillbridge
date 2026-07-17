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
      ai_skill_gaps: {
        Row: {
          created_at: string | null
          id: string
          internship_id: string
          missing_skills: Json
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          internship_id: string
          missing_skills?: Json
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          internship_id?: string
          missing_skills?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_skill_gaps_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_skill_gaps_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string | null
          id: string
          internship_id: string
          message: string | null
          status: string | null
          student_id: string
          teacher_feedback: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          internship_id: string
          message?: string | null
          status?: string | null
          student_id: string
          teacher_feedback?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          internship_id?: string
          message?: string | null
          status?: string | null
          student_id?: string
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      college_admins: {
        Row: {
          college_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          college_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          college_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_name: string
          course_url: string
          id: string
          specialty: string
        }
        Insert: {
          course_name: string
          course_url: string
          id?: string
          specialty: string
        }
        Update: {
          course_name?: string
          course_url?: string
          id?: string
          specialty?: string
        }
        Relationships: []
      }
      employer_reviews: {
        Row: {
          application_id: string
          comment: string | null
          created_at: string | null
          employer_id: string
          id: string
          rating: number
          student_id: string
        }
        Insert: {
          application_id: string
          comment?: string | null
          created_at?: string | null
          employer_id: string
          id?: string
          rating: number
          student_id: string
        }
        Update: {
          application_id?: string
          comment?: string | null
          created_at?: string | null
          employer_id?: string
          id?: string
          rating?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_reviews_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          city: string | null
          company_description: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          document_urls: string[] | null
          id: string
          user_id: string
        }
        Insert: {
          city?: string | null
          company_description?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          document_urls?: string[] | null
          id?: string
          user_id: string
        }
        Update: {
          city?: string | null
          company_description?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          document_urls?: string[] | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      internships: {
        Row: {
          city: string | null
          contact: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          employer_id: string
          format: string | null
          id: string
          places_count: number | null
          requirements: string | null
          specialty: string | null
          status: string | null
          title: string
        }
        Insert: {
          city?: string | null
          contact?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          employer_id: string
          format?: string | null
          id?: string
          places_count?: number | null
          requirements?: string | null
          specialty?: string | null
          status?: string | null
          title: string
        }
        Update: {
          city?: string | null
          contact?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          employer_id?: string
          format?: string | null
          id?: string
          places_count?: number | null
          requirements?: string | null
          specialty?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "internships_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          student_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          student_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          student_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          city: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          photo_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_certificates: {
        Row: {
          created_at: string | null
          file_url: string
          id: string
          student_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          file_url: string
          id?: string
          student_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string
          id?: string
          student_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          attendance_percent: number | null
          behance_url: string | null
          bio: string | null
          college_name: string | null
          course_year: number | null
          created_at: string | null
          dribbble_url: string | null
          figma_url: string | null
          github_url: string | null
          gpa: number | null
          gpa_verified: boolean
          id: string
          linkedin_url: string | null
          portfolio_completed: boolean | null
          skills: string[] | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          attendance_percent?: number | null
          behance_url?: string | null
          bio?: string | null
          college_name?: string | null
          course_year?: number | null
          created_at?: string | null
          dribbble_url?: string | null
          figma_url?: string | null
          github_url?: string | null
          gpa?: number | null
          gpa_verified?: boolean
          id?: string
          linkedin_url?: string | null
          portfolio_completed?: boolean | null
          skills?: string[] | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          attendance_percent?: number | null
          behance_url?: string | null
          bio?: string | null
          college_name?: string | null
          course_year?: number | null
          created_at?: string | null
          dribbble_url?: string | null
          figma_url?: string | null
          github_url?: string | null
          gpa?: number | null
          gpa_verified?: boolean
          id?: string
          linkedin_url?: string | null
          portfolio_completed?: boolean | null
          skills?: string[] | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_college_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role: "student" | "employer" | "college_admin"
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
      user_role: ["student", "employer", "college_admin"],
    },
  },
} as const
