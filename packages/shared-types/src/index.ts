export type UserRole = "patient" | "caregiver" | "admin";

export type GameType =
  | "memory_match"
  | "sequence_recall"
  | "object_recognition";

export type ReminderType =
  | "medicine"
  | "hydration"
  | "activity"
  | "appointment";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  region?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatientLoginRequest {
  patient_id?: string;
  full_name?: string;
  pin: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  region?: string | null;
  role: string;
}

export interface PatientAuthResponse {
  id: string;
  full_name: string;
  preferred_language: string;
  region?: string | null;
}

export interface AuthMeResponse {
  role: string;
  user?: UserResponse | null;
  patient?: PatientAuthResponse | null;
}

export interface Patient {
  id: string;
  caregiver_id: string;
  full_name: string;
  date_of_birth?: string | null;
  region?: string | null;
  notes?: string | null;
  preferred_language: string;
  photo_uri?: string | null;
  cognitive_level: number;
  created_at: string;
  updated_at: string;
}

export interface PatientCreate {
  full_name: string;
  date_of_birth?: string | null;
  region?: string | null;
  notes?: string | null;
  preferred_language?: string;
  photo_uri?: string | null;
  pin?: string | null;
}

export interface Caregiver {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  region?: string | null;
  role: string;
}

export interface GameSession {
  id: string;
  patient_id: string;
  game_type: GameType;
  score?: number | null;
  duration_seconds?: number | null;
  difficulty_level: number;
  played_at: string;
}

export interface GameSessionCreate {
  patient_id: string;
  game_type: GameType;
  score?: number | null;
  duration_seconds?: number | null;
  difficulty_level?: number | null;
}

export interface Reminder {
  id: string;
  patient_id: string;
  title: string;
  message?: string | null;
  reminder_type: ReminderType;
  scheduled_at: string;
  is_done: boolean;
  completed_at?: string | null;
  is_sent: boolean;
}

export interface ReminderCreate {
  patient_id: string;
  title: string;
  message?: string | null;
  reminder_type: ReminderType;
  scheduled_at: string;
}

export interface ReminderUpdate {
  title?: string | null;
  message?: string | null;
  reminder_type?: ReminderType | null;
  scheduled_at?: string | null;
  is_done?: boolean | null;
}

export interface ProgressMetrics {
  patient_id: string;
  total_sessions: number;
  average_score: number;
  streak_days: number;
  last_active?: string | null;
}

export interface PlatformStats {
  total_patients: number;
  total_caregivers: number;
  total_sessions: number;
  regions: Record<string, number>;
}

export interface SystemHealthResponse {
  status: string;
  database: string;
  redis: string;
  detail?: string | null;
}

export interface DifficultyDetail {
  recommended_level: number;
  decision: string;
  reason: string;
  trend: string;
  confidence: number;
  ml_agrees?: boolean | null;
  ml_prediction?: string | null;
}

export interface PersonalizationDetail {
  recommended_domain: string;
  activity_hint?: string | null;
  my_world_item_id?: string | null;
  content_theme: string;
  theme_label: string;
  preferred_language?: string | null;
  my_world_available: boolean;
  reason: string;
}

export interface DomainAnalytics {
  average_performance: number;
  trend: string;
  slope: number;
  sessions_played: number;
}

export interface AnalyticsDetail {
  overall_trend: string;
  overall_slope: number;
  decline_alert: boolean;
  domains: Record<string, DomainAnalytics>;
  strongest_domain?: string | null;
  weakest_domain?: string | null;
  sessions_last_7_days: number;
  total_sessions: number;
}

export interface AISummaryResponse {
  patient_id: string;
  difficulty: DifficultyDetail;
  personalization: PersonalizationDetail;
  analytics: AnalyticsDetail;
}

export type AlertType =
  | "cognitive_decline"
  | "inactivity"
  | "missed_reminder";

export type AlertSeverity = "low" | "medium" | "high";

export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  patient_id: string;
  caregiver_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  source_ref?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  patient_name?: string | null;
}

export interface AlertUpdate {
  status: "acknowledged" | "resolved";
}

export interface AlertSummary {
  active_count: number;
  high_count: number;
  by_type: Record<string, number>;
}

// --- My World: the patient's memory journal ---------------------------------

export type MyWorldCategory =
  | "person"
  | "place"
  | "object"
  | "event"
  | "moment";

export type MediaType = "photo" | "video" | "audio" | "note";

export type MyWorldReactionType = "viewed" | "remembered" | "unsure";

export interface MyWorldItem {
  id: string;
  patient_id: string;
  category: MyWorldCategory;
  name: string;
  relationship?: string | null;
  description?: string | null;
  photo_uri?: string | null;
  media_type: MediaType;
  media_uri?: string | null;
  thumbnail_uri?: string | null;
  media_bytes?: number | null;
  story?: string | null;
  memory_date?: string | null;
  people: string[];
  tags: string[];
  is_favourite: boolean;
  sort_order: number;
  success_rate?: number | null;
  times_shown: number;
  remembered_count: number;
  last_shown_at?: string | null;
  last_viewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyWorldItemCreate {
  category: MyWorldCategory;
  name: string;
  relationship?: string | null;
  description?: string | null;
  photo_uri?: string | null;
  media_type?: MediaType;
  media_uri?: string | null;
  thumbnail_uri?: string | null;
  media_bytes?: number | null;
  story?: string | null;
  memory_date?: string | null;
  people?: string[];
  tags?: string[];
  is_favourite?: boolean;
  sort_order?: number;
}

export type MyWorldItemUpdate = Partial<MyWorldItemCreate>;

export interface MyWorldReaction {
  reaction: MyWorldReactionType;
  client_timestamp?: string | null;
}

export type UploadResourceType = "image" | "video" | "raw";

export interface UploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  public_id: string;
  resource_type: UploadResourceType;
  upload_url: string;
}
