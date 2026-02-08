// Types for TTS Application

export interface FileInfo {
  filename: string;
  language: string;
  path: string;
  size_bytes: number;
  title?: string;
}

export interface LanguageFiles {
  language: string;
  language_code: string;
  files: FileInfo[];
}

export interface ContentChunk {
  id: number;
  type: "h1" | "h2" | "h3" | "paragraph" | "bullet" | "code" | "blockquote";
  text: string;
  raw_text: string;
  char_count: number;
  pause_after_ms: number;
  loudness_boost: number;
}

export interface ParsedDocument {
  filename: string;
  language: string;
  title?: string;
  chunks: ContentChunk[];
  total_chunks: number;
  total_characters: number;
  estimated_duration_seconds: number;
}

export interface TTSSettings {
  target_language_code: string;
  speaker: string;
  pace: number;
  speech_sample_rate: number;
  model: string;
  temperature: number;
  enable_preprocessing: boolean;
  heading_loudness_boost: number;
  pause_after_heading_ms: number;
  pause_after_bullet_ms: number;
}

export interface TTSChunkResult {
  chunk_id: number;
  success: boolean;
  audio_base64?: string;
  duration_ms?: number;
  error?: string;
}

export interface GenerateTTSResponse {
  job_id: string;
  filename: string;
  total_chunks: number;
  completed_chunks: number;
  status: "processing" | "completed" | "failed";
  results: TTSChunkResult[];
  output_path?: string;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  output_path?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  sarvam_api_configured: boolean;
}

export interface Speaker {
  id: string;
  name: string;
  gender: "male" | "female";
}

export interface Language {
  code: string;
  name: string;
}

// File Upload and Write Types
export interface MarkdownWriteRequest {
  content: string;
  language: string;
  filename: string;
  overwrite?: boolean;
}

export interface MarkdownWriteResponse {
  success: boolean;
  path?: string;
  message?: string;
  error?: string;
}

export interface UploadedFileInfo {
  filename: string;
  language: string;
  content: string;
  size_bytes: number;
  title?: string;
}

// API Call Statistics Types
export interface APICallStats {
  chunk_id: number;
  characters_sent: number;
  bytes_sent: number;
  bytes_received: number;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface GenerationSummary {
  job_id: string;
  filename: string;
  total_api_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_characters: number;
  total_bytes_sent: number;
  total_bytes_received: number;
  total_duration_ms: number;
  average_response_time_ms: number;
  output_file_size_bytes?: number;
  output_duration_seconds?: number;
  calls: APICallStats[];
}
