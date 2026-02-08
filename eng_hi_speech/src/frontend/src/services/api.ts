import axios from "axios";
import type {
  LanguageFiles,
  FileInfo,
  ParsedDocument,
  TTSSettings,
  GenerateTTSResponse,
  ExportResponse,
  HealthResponse,
  Speaker,
  Language,
  MarkdownWriteRequest,
  MarkdownWriteResponse,
  UploadedFileInfo,
  GenerationSummary,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minute timeout for long-running TTS generation
});

// Health
export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
};

// File Discovery
export const listAllFiles = async (): Promise<LanguageFiles[]> => {
  const response = await api.get<LanguageFiles[]>("/files");
  return response.data;
};

export const listFilesForLanguage = async (
  language: string,
): Promise<FileInfo[]> => {
  const response = await api.get<FileInfo[]>(`/files/${language}`);
  return response.data;
};

export const getFileContent = async (
  language: string,
  filename: string,
): Promise<{ content: string; filename: string; language: string }> => {
  const response = await api.get(`/files/${language}/${filename}/content`);
  return response.data;
};

// File Upload and Write
export const uploadMarkdownFile = async (
  file: File,
  language: string = "hi",
): Promise<UploadedFileInfo> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);

  const response = await api.post<UploadedFileInfo>("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const writeMarkdownFile = async (
  request: MarkdownWriteRequest,
): Promise<MarkdownWriteResponse> => {
  const response = await api.post<MarkdownWriteResponse>(
    "/files/write",
    request,
  );
  return response.data;
};

export const parseMarkdownContent = async (
  content: string,
  language: string = "hi",
  filename: string = "uploaded.md",
): Promise<ParsedDocument> => {
  const formData = new FormData();
  formData.append("content", content);
  formData.append("language", language);
  formData.append("filename", filename);

  const response = await api.post<ParsedDocument>("/parse/content", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Parsing
export const parseMarkdown = async (
  language: string,
  filename: string,
  maxChunkSize?: number,
): Promise<ParsedDocument> => {
  const response = await api.post<ParsedDocument>("/parse", {
    language,
    filename,
    max_chunk_size: maxChunkSize,
  });
  return response.data;
};

// TTS Generation
export const generateTTS = async (
  filePath: string,
  settings: TTSSettings,
  chunksToGenerate?: number[],
): Promise<GenerateTTSResponse> => {
  const response = await api.post<GenerateTTSResponse>("/tts/generate", {
    file_path: filePath,
    settings,
    chunks_to_generate: chunksToGenerate,
  });
  return response.data;
};

export const getTTSStatus = async (
  jobId: string,
): Promise<GenerateTTSResponse> => {
  const response = await api.get<GenerateTTSResponse>(`/tts/status/${jobId}`);
  return response.data;
};

export const getChunkAudioUrl = (jobId: string, chunkId: number): string => {
  return `/api/tts/preview/${jobId}/${chunkId}`;
};

export const exportAudio = async (
  jobId: string,
  filename: string,
  format: "mp3" | "wav" = "mp3",
): Promise<ExportResponse> => {
  const response = await api.post<ExportResponse>("/tts/export", {
    job_id: jobId,
    filename,
    format,
  });
  return response.data;
};

export const getDownloadUrl = (
  jobId: string,
  format: "mp3" | "wav" = "mp3",
): string => {
  return `/api/tts/download/${jobId}?format=${format}`;
};

// Settings
export const getDefaultSettings = async (): Promise<TTSSettings> => {
  const response = await api.get<TTSSettings>("/settings/defaults");
  return response.data;
};

export const getAvailableSpeakers = async (): Promise<Speaker[]> => {
  const response = await api.get<{ speakers: Speaker[] }>("/settings/speakers");
  return response.data.speakers;
};

export const getAvailableLanguages = async (): Promise<Language[]> => {
  const response = await api.get<{ languages: Language[] }>(
    "/settings/languages",
  );
  return response.data.languages;
};

// API Statistics
export const getGenerationSummary = async (
  jobId: string,
): Promise<GenerationSummary> => {
  const response = await api.get<GenerationSummary>(`/tts/summary/${jobId}`);
  return response.data;
};

export default api;
