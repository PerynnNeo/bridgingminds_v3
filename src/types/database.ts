/**
 * Typed database schema for the Supabase client.
 * Hand-authored to match supabase/migrations/0001_initial_schema.sql.
 * (Can later be regenerated with `supabase gen types typescript`.)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'user' | 'admin';
export type AnalysisStatus = 'pending' | 'completed' | 'failed';
export type FocusArea = 'pacing' | 'pronunciation' | 'fluency' | 'confidence' | 'filler_words';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ItemType = 'word' | 'phrase' | 'pitch' | 'presentation';
export type TargetSkill = 'pronunciation' | 'pacing' | 'fluency' | 'tone' | 'clarity';
export type GameType = 'debate' | 'daily_question';
export type GameMode = 'solo_ai' | 'friend_same_device' | 'solo_prompt';
export type QuestionCategory = 'school' | 'fun' | 'pitch' | 'opinion' | 'storytelling';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: UserRole;
          age_group: string | null;
          onboarding_completed: boolean;
          consent_audio_analysis: boolean;
          consent_video_analysis: boolean;
          consent_personalization: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          age_group?: string | null;
          onboarding_completed?: boolean;
          consent_audio_analysis?: boolean;
          consent_video_analysis?: boolean;
          consent_personalization?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      onboarding_sessions: {
        Row: {
          id: string;
          user_id: string;
          reading_audio_path: string | null;
          rapid_answer_audio_path: string | null;
          video_path: string | null;
          reading_transcript: string | null;
          rapid_answer_transcript: string | null;
          analysis_status: AnalysisStatus;
          camera_enabled: boolean;
          visual_metrics: Json | null;
          combined_feedback: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reading_audio_path?: string | null;
          rapid_answer_audio_path?: string | null;
          video_path?: string | null;
          reading_transcript?: string | null;
          rapid_answer_transcript?: string | null;
          analysis_status?: AnalysisStatus;
          camera_enabled?: boolean;
          visual_metrics?: Json | null;
          combined_feedback?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['onboarding_sessions']['Insert']>;
        Relationships: [];
      };
      speech_profiles: {
        Row: {
          id: string;
          user_id: string;
          pacing_score: number | null;
          clarity_score: number | null;
          fluency_score: number | null;
          filler_word_rate: number | null;
          pause_pattern_summary: string | null;
          common_mispronunciations: Json;
          confidence_cues: Json;
          strengths: string[];
          focus_areas: string[];
          generated_summary: string | null;
          visual_metrics: Json | null;
          visual_summary: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pacing_score?: number | null;
          clarity_score?: number | null;
          fluency_score?: number | null;
          filler_word_rate?: number | null;
          pause_pattern_summary?: string | null;
          common_mispronunciations?: Json;
          confidence_cues?: Json;
          strengths?: string[];
          focus_areas?: string[];
          generated_summary?: string | null;
          visual_metrics?: Json | null;
          visual_summary?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['speech_profiles']['Insert']>;
        Relationships: [];
      };
      practice_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_title: string | null;
          plan_summary: string | null;
          focus_area: FocusArea | null;
          difficulty: Difficulty | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_title?: string | null;
          plan_summary?: string | null;
          focus_area?: FocusArea | null;
          difficulty?: Difficulty | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_plans']['Insert']>;
        Relationships: [];
      };
      practice_items: {
        Row: {
          id: string;
          plan_id: string | null;
          user_id: string;
          item_type: ItemType | null;
          text: string;
          target_skill: TargetSkill | null;
          difficulty: Difficulty | null;
          model_audio_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          user_id: string;
          item_type?: ItemType | null;
          text: string;
          target_skill?: TargetSkill | null;
          difficulty?: Difficulty | null;
          model_audio_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_items']['Insert']>;
        Relationships: [];
      };
      practice_attempts: {
        Row: {
          id: string;
          user_id: string;
          practice_item_id: string | null;
          audio_path: string | null;
          video_path: string | null;
          transcript: string | null;
          clarity_score: number | null;
          pacing_score: number | null;
          pronunciation_score: number | null;
          filler_word_count: number | null;
          feedback: string | null;
          camera_enabled: boolean;
          visual_metrics: Json | null;
          combined_feedback: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          practice_item_id?: string | null;
          audio_path?: string | null;
          video_path?: string | null;
          transcript?: string | null;
          clarity_score?: number | null;
          pacing_score?: number | null;
          pronunciation_score?: number | null;
          filler_word_count?: number | null;
          feedback?: string | null;
          camera_enabled?: boolean;
          visual_metrics?: Json | null;
          combined_feedback?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_attempts']['Insert']>;
        Relationships: [];
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_type: GameType | null;
          mode: GameMode | null;
          prompt: string | null;
          transcript: string | null;
          audio_path: string | null;
          video_path: string | null;
          structure_score: number | null;
          clarity_score: number | null;
          pacing_score: number | null;
          confidence_score: number | null;
          feedback: string | null;
          camera_enabled: boolean;
          visual_metrics: Json | null;
          combined_feedback: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_type?: GameType | null;
          mode?: GameMode | null;
          prompt?: string | null;
          transcript?: string | null;
          audio_path?: string | null;
          video_path?: string | null;
          structure_score?: number | null;
          clarity_score?: number | null;
          pacing_score?: number | null;
          confidence_score?: number | null;
          feedback?: string | null;
          camera_enabled?: boolean;
          visual_metrics?: Json | null;
          combined_feedback?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['game_sessions']['Insert']>;
        Relationships: [];
      };
      visual_analysis_results: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          activity_id: string | null;
          eye_contact_ratio: number | null;
          face_visibility_ratio: number | null;
          framing_score: number | null;
          head_stability_score: number | null;
          expression_variation_score: number | null;
          mouth_visibility_score: number | null;
          lighting_quality_score: number | null;
          gesture_balance_score: number | null;
          delivery_presence_score: number | null;
          feedback_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          activity_id?: string | null;
          eye_contact_ratio?: number | null;
          face_visibility_ratio?: number | null;
          framing_score?: number | null;
          head_stability_score?: number | null;
          expression_variation_score?: number | null;
          mouth_visibility_score?: number | null;
          lighting_quality_score?: number | null;
          gesture_balance_score?: number | null;
          delivery_presence_score?: number | null;
          feedback_summary?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['visual_analysis_results']['Insert']>;
        Relationships: [];
      };
      daily_questions: {
        Row: {
          id: string;
          category: QuestionCategory | null;
          question_text: string;
          difficulty: QuestionDifficulty | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category?: QuestionCategory | null;
          question_text: string;
          difficulty?: QuestionDifficulty | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_questions']['Insert']>;
        Relationships: [];
      };
      coaching_cache: {
        Row: {
          signature: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          signature: string;
          payload: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['coaching_cache']['Insert']>;
        Relationships: [];
      };
      progress_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          total_recordings: number;
          avg_clarity_score: number | null;
          avg_pacing_score: number | null;
          avg_pronunciation_score: number | null;
          filler_word_rate: number | null;
          streak_count: number;
          most_improved_skill: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          total_recordings?: number;
          avg_clarity_score?: number | null;
          avg_pacing_score?: number | null;
          avg_pronunciation_score?: number | null;
          filler_word_rate?: number | null;
          streak_count?: number;
          most_improved_skill?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['progress_metrics']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/** Convenience row aliases. */
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type OnboardingSession = Database['public']['Tables']['onboarding_sessions']['Row'];
export type SpeechProfileRow = Database['public']['Tables']['speech_profiles']['Row'];
export type PracticePlan = Database['public']['Tables']['practice_plans']['Row'];
export type PracticeItem = Database['public']['Tables']['practice_items']['Row'];
export type PracticeAttempt = Database['public']['Tables']['practice_attempts']['Row'];
export type GameSession = Database['public']['Tables']['game_sessions']['Row'];
export type DailyQuestion = Database['public']['Tables']['daily_questions']['Row'];
export type ProgressMetric = Database['public']['Tables']['progress_metrics']['Row'];
export type VisualAnalysisResult = Database['public']['Tables']['visual_analysis_results']['Row'];
