import axios, { AxiosError } from "axios";
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

// Request queue for throttling
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: Array<() => Promise<void>> = [];

const processQueue = () => {
  while (pendingRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      pendingRequests++;
      next().finally(() => {
        pendingRequests--;
        processQueue();
      });
    }
  }
};

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 600000, // 10 minute timeout for long-running TTS generation
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] Response ${response.status} from ${response.config.url}`,
    );
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Log detailed error info
    console.error("[API] Error:", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429) {
      console.warn("[API] Rate limited, retrying after delay...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return api.request(originalRequest!);
    }

    // Handle timeout errors with a clearer message
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(
        "Request timed out. The server might be processing a large document. Please try again or use a smaller document.",
      );
    }

    // Handle network errors
    if (!error.response) {
      throw new Error(
        "Unable to connect to the server. Please check if the backend is running.",
      );
    }

    return Promise.reject(error);
  },
);

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

// TTS Generation Progress Callback Interface
export interface TTSProgressEvent {
  type: "start" | "progress" | "complete" | "error";
  data: {
    job_id?: string;
    completed_chunks?: number;
    total_chunks?: number;
    total_characters?: number;
    filename?: string;
    status?: string;
    percentage?: number;
    error?: string;
  };
}

// TTS Generation with SSE streaming for real-time progress
export const generateTTSWithProgress = (
  filePath: string,
  settings: TTSSettings,
  onProgress: (event: TTSProgressEvent) => void,
  chunksToGenerate?: number[],
): { abort: () => void; promise: Promise<GenerateTTSResponse | null> } => {
  const abortController = new AbortController();

  const promise = new Promise<GenerateTTSResponse | null>((resolve, reject) => {
    const eventSource = new EventSource(
      `/api/tts/generate/stream?payload=${encodeURIComponent(
        JSON.stringify({
          file_path: filePath,
          settings,
          chunks_to_generate: chunksToGenerate,
        }),
      )}`,
    );

    // Fall back to regular HTTP if SSE fails
    const fetchWithProgress = async () => {
      console.log("[API] SSE not available, using polling fallback");

      try {
        onProgress({
          type: "start",
          data: { filename: filePath },
        });

        const response = await generateTTS(
          filePath,
          settings,
          chunksToGenerate,
        );

        onProgress({
          type: "complete",
          data: {
            job_id: response.job_id,
            status: response.status,
            completed_chunks: response.completed_chunks,
            total_chunks: response.total_chunks,
            percentage: 100,
          },
        });

        resolve(response);
      } catch (error) {
        onProgress({
          type: "error",
          data: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        reject(error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      fetchWithProgress();
    };

    eventSource.onopen = () => {
      console.log("[API] SSE connection opened");
    };

    eventSource.addEventListener("start", (e) => {
      const data = JSON.parse(e.data);
      onProgress({ type: "start", data });
    });

    eventSource.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      onProgress({ type: "progress", data });
    });

    eventSource.addEventListener("complete", (e) => {
      const data = JSON.parse(e.data);
      eventSource.close();
      onProgress({ type: "complete", data });

      // Get full response via regular API
      if (data.job_id) {
        getTTSStatus(data.job_id).then(resolve).catch(reject);
      } else {
        resolve(null);
      }
    });

    eventSource.addEventListener("error", (e) => {
      if (e instanceof MessageEvent) {
        const data = JSON.parse(e.data);
        onProgress({ type: "error", data });
        reject(new Error(data.error || "TTS generation failed"));
      }
      eventSource.close();
    });

    abortController.signal.addEventListener("abort", () => {
      eventSource.close();
      resolve(null);
    });
  });

  return {
    abort: () => abortController.abort(),
    promise,
  };
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
