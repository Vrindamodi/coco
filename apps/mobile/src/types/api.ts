export type GameType =
  | "memory_match"
  | "sequence_recall"
  | "object_recognition";

export type ReminderType =
  | "medicine"
  | "hydration"
  | "activity"
  | "appointment";

export interface Token {
  access_token: string;
  token_type: string;
}

export interface PatientLoginRequest {
  patient_id?: string;
  full_name?: string;
  pin: string;
}

export interface PatientAuthResponse {
  id: string;
  full_name: string;
  preferred_language: string;
  region?: string | null;
}

export interface AuthMeResponse {
  role: string;
  patient?: PatientAuthResponse | null;
}

export interface GameSession {
  id: string;
  patient_id: string;
  game_type: GameType;
  score?: number | null;
  duration_seconds?: number | null;
  difficulty_level: number;
  hints_used?: number | null;
  played_at: string;
  created_at?: string;
}

/** Body of a `game_result` sync operation. `session_id` is chosen on-device. */
export interface GameResultPayload {
  session_id: string;
  game_type: GameType;
  score: number;
  duration_seconds: number;
  difficulty_level: number;
  hints_used: number;
}

export interface GameSessionCreate {
  patient_id: string;
  game_type: GameType;
  score?: number | null;
  duration_seconds?: number | null;
  difficulty_level?: number | null;
}

export interface DifficultyResponse {
  patient_id: string;
  suggested_difficulty: number;
  cognitive_level: number;
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

export interface ProgressMetrics {
  patient_id: string;
  total_sessions: number;
  average_score: number;
  streak_days: number;
  last_active?: string | null;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  patient_id: string;
  role: ChatRole;
  content: string;
  language: string;
  created_at: string;
}

export interface ChatTurnResponse {
  transcript: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

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

export type SyncOperationType =
  | "game_result"
  | "reminder_update"
  | "my_world_reaction";

export interface SyncOperationCreate {
  operation_id: string;
  device_id: string;
  patient_id: string;
  operation_type: SyncOperationType;
  payload: Record<string, unknown>;
  client_timestamp: string;
}

export interface SyncOperationResult {
  operation_id: string;
  status: "synced" | "duplicate" | "failed";
  resource_id?: string | null;
  error?: string | null;
}

export interface SyncResponse {
  synced: number;
  duplicates: number;
  failed: number;
  results: SyncOperationResult[];
}

export interface SyncPullResponse {
  server_time: string;
  since?: string | null;
  reminders: Reminder[];
  game_sessions: GameSession[];
  my_world_items: MyWorldItem[];
}
