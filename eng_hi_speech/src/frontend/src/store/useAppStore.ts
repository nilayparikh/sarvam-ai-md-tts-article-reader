import { create } from "zustand";
import type {
  LanguageFiles,
  FileInfo,
  ParsedDocument,
  TTSSettings,
  GenerateTTSResponse,
  Speaker,
  Language,
  GenerationSummary,
  UploadedFileInfo,
} from "../types";

// Progress tracking interface
export interface GenerationProgress {
  percentage: number;
  completedChunks: number;
  totalChunks: number;
  message: string;
  currentChunk?: string;
}

interface AppState {
  // File selection
  languages: LanguageFiles[];
  selectedLanguage: string | null;
  selectedFile: FileInfo | null;
  fileContent: string | null;

  // Upload mode
  isUploadMode: boolean;
  uploadedFile: UploadedFileInfo | null;
  saveToTranslateDir: boolean;

  // Parsing
  parsedDocument: ParsedDocument | null;
  isParsing: boolean;

  // TTS
  ttsSettings: TTSSettings;
  ttsJob: GenerateTTSResponse | null;
  isGenerating: boolean;
  generationSummary: GenerationSummary | null;

  // Progress tracking
  generationProgress: GenerationProgress | null;
  showLoadingOverlay: boolean;
  loadingMessage: string;

  // Options
  speakers: Speaker[];
  availableLanguages: Language[];

  // UI State
  previewChunkId: number | null;

  // Actions
  setLanguages: (languages: LanguageFiles[]) => void;
  setSelectedLanguage: (language: string | null) => void;
  setSelectedFile: (file: FileInfo | null) => void;
  setFileContent: (content: string | null) => void;
  setIsUploadMode: (mode: boolean) => void;
  setUploadedFile: (file: UploadedFileInfo | null) => void;
  setSaveToTranslateDir: (save: boolean) => void;
  setParsedDocument: (doc: ParsedDocument | null) => void;
  setIsParsing: (parsing: boolean) => void;
  setTTSSettings: (settings: Partial<TTSSettings>) => void;
  setTTSJob: (job: GenerateTTSResponse | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationSummary: (summary: GenerationSummary | null) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  setShowLoadingOverlay: (show: boolean, message?: string) => void;
  setSpeakers: (speakers: Speaker[]) => void;
  setAvailableLanguages: (languages: Language[]) => void;
  setPreviewChunkId: (id: number | null) => void;
  reset: () => void;
}

const defaultTTSSettings: TTSSettings = {
  target_language_code: "hi-IN",
  speaker: "shubh",
  pace: 1.1,
  speech_sample_rate: 48000,
  model: "bulbul:v3",
  temperature: 0.6,
  enable_preprocessing: true,
  heading_loudness_boost: 1.2,
  pause_after_heading_ms: 500,
  pause_after_bullet_ms: 300,
};

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  languages: [],
  selectedLanguage: null,
  selectedFile: null,
  fileContent: null,
  isUploadMode: false,
  uploadedFile: null,
  saveToTranslateDir: false,
  parsedDocument: null,
  isParsing: false,
  ttsSettings: defaultTTSSettings,
  ttsJob: null,
  isGenerating: false,
  generationSummary: null,
  generationProgress: null,
  showLoadingOverlay: false,
  loadingMessage: "Processing...",
  speakers: [],
  availableLanguages: [],
  previewChunkId: null,

  // Actions
  setLanguages: (languages) => set({ languages }),
  setSelectedLanguage: (selectedLanguage) =>
    set({
      selectedLanguage,
      selectedFile: null,
      fileContent: null,
      parsedDocument: null,
      isUploadMode: false,
      uploadedFile: null,
    }),
  setSelectedFile: (selectedFile) =>
    set({
      selectedFile,
      fileContent: null,
      parsedDocument: null,
      ttsJob: null,
      generationSummary: null,
      isUploadMode: false,
      uploadedFile: null,
      generationProgress: null,
    }),
  setFileContent: (fileContent) => set({ fileContent }),
  setIsUploadMode: (isUploadMode) =>
    set({
      isUploadMode,
      selectedFile: isUploadMode ? null : undefined,
      selectedLanguage: isUploadMode ? null : undefined,
    }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setSaveToTranslateDir: (saveToTranslateDir) => set({ saveToTranslateDir }),
  setParsedDocument: (parsedDocument) => set({ parsedDocument }),
  setIsParsing: (isParsing) => set({ isParsing }),
  setTTSSettings: (settings) =>
    set((state) => ({ ttsSettings: { ...state.ttsSettings, ...settings } })),
  setTTSJob: (ttsJob) => set({ ttsJob }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationSummary: (generationSummary) => set({ generationSummary }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  setShowLoadingOverlay: (
    showLoadingOverlay,
    loadingMessage = "Processing...",
  ) => set({ showLoadingOverlay, loadingMessage }),
  setSpeakers: (speakers) => set({ speakers }),
  setAvailableLanguages: (availableLanguages) => set({ availableLanguages }),
  setPreviewChunkId: (previewChunkId) => set({ previewChunkId }),
  reset: () =>
    set({
      selectedLanguage: null,
      selectedFile: null,
      fileContent: null,
      parsedDocument: null,
      ttsJob: null,
      generationSummary: null,
      isUploadMode: false,
      uploadedFile: null,
      generationProgress: null,
      showLoadingOverlay: false,
    }),
}));
