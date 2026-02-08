import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  alpha,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Snackbar,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandIcon,
  VolumeUp as VolumeIcon,
  Speed as SpeedIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  RecordVoiceOver as SpeakerIcon,
  Analytics as StatsIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAppStore } from "../store/useAppStore";
import {
  generateTTS,
  exportAudio,
  getDownloadUrl,
  getGenerationSummary,
  writeMarkdownFile,
} from "../services/api";
import LoadingOverlay from "./LoadingOverlay";

// Debounce utility to prevent rapid re-submissions
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallRef = useRef<number>(0);

  return useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback();
    } else {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback();
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
};

const SettingsPanel: React.FC = () => {
  const {
    selectedFile,
    parsedDocument,
    ttsSettings,
    setTTSSettings,
    ttsJob,
    setTTSJob,
    isGenerating,
    setIsGenerating,
    speakers,
    availableLanguages,
    generationSummary,
    setGenerationSummary,
    uploadedFile,
    isUploadMode,
    generationProgress,
    setGenerationProgress,
    showLoadingOverlay,
    setShowLoadingOverlay,
    loadingMessage,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);

  // Fetch summary when job completes
  useEffect(() => {
    const fetchSummary = async () => {
      if (ttsJob?.status === "completed" && ttsJob?.job_id) {
        try {
          const summary = await getGenerationSummary(ttsJob.job_id);
          setGenerationSummary(summary);
        } catch (err) {
          console.error("Failed to fetch generation summary:", err);
        }
      }
    };
    fetchSummary();
  }, [ttsJob?.status, ttsJob?.job_id, setGenerationSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setShowLoadingOverlay(false);
    setGenerationProgress(null);
    setSnackbarMessage("Generation cancelled");
    setSnackbarOpen(true);
  }, [setIsGenerating, setShowLoadingOverlay, setGenerationProgress]);

  const handleGenerateInternal = async () => {
    // Prevent duplicate requests
    if (isGeneratingRef.current) {
      console.log("Generation already in progress, skipping...");
      return;
    }

    if (!parsedDocument) return;

    // Determine the file path based on mode
    let filePath: string;
    if (isUploadMode && uploadedFile) {
      // For uploaded files, we need to save them to disk first
      try {
        setShowLoadingOverlay(true, "Saving uploaded file...");
        const writeResponse = await writeMarkdownFile({
          content: uploadedFile.content,
          language: uploadedFile.language,
          filename: uploadedFile.filename,
          overwrite: true,
        });
        if (!writeResponse.success) {
          setError(writeResponse.error || "Failed to save uploaded file");
          setShowLoadingOverlay(false);
          return;
        }
      } catch (err) {
        console.error("Failed to save uploaded file:", err);
        setError("Failed to save uploaded file before TTS generation");
        setShowLoadingOverlay(false);
        return;
      }
      filePath = `${uploadedFile.language}/${uploadedFile.filename}`;
    } else if (selectedFile) {
      filePath = `${selectedFile.language}/${selectedFile.filename}`;
    } else {
      return;
    }

    setError(null);
    setIsGenerating(true);
    isGeneratingRef.current = true;
    setAudioUrl(null);
    setGenerationSummary(null);
    setShowLoadingOverlay(true, "Generating TTS audio...");
    setGenerationProgress({
      percentage: 0,
      completedChunks: 0,
      totalChunks: parsedDocument.total_chunks,
      message: "Starting generation...",
    });

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[SettingsPanel] Starting TTS generation for: ${filePath}`);
      const response = await generateTTS(filePath, ttsSettings);
      console.log(`[SettingsPanel] TTS generation completed:`, response);

      setTTSJob(response);
      setGenerationProgress({
        percentage: 100,
        completedChunks: response.completed_chunks,
        totalChunks: response.total_chunks,
        message: "Finalizing...",
      });

      if (response.status === "completed") {
        // Export audio
        setShowLoadingOverlay(true, "Exporting audio file...");
        const filename =
          isUploadMode && uploadedFile
            ? uploadedFile.filename
            : selectedFile?.filename || "output.mp3";
        const exportResponse = await exportAudio(response.job_id, filename);

        if (exportResponse.success) {
          setAudioUrl(getDownloadUrl(response.job_id, "mp3"));
          setSnackbarMessage("TTS generation completed successfully!");
          setSnackbarOpen(true);
        } else {
          setError(exportResponse.error || "Failed to export audio");
        }
      } else if (response.status === "failed") {
        setError(response.error || "TTS generation failed");
      }
    } catch (err) {
      console.error("TTS generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to generate TTS: ${errorMessage}`);
      setSnackbarMessage(`Error: ${errorMessage}`);
      setSnackbarOpen(true);
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
      setShowLoadingOverlay(false);
      setGenerationProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Debounced generate handler to prevent rapid re-submissions
  const handleGenerate = useDebounce(handleGenerateInternal, 1000);

  const handleDownload = () => {
    if (ttsJob && audioUrl) {
      window.open(audioUrl, "_blank");
    }
  };

  const progress = ttsJob
    ? (ttsJob.completed_chunks / ttsJob.total_chunks) * 100
    : 0;

  return (
    <>
      {/* Loading Overlay */}
      <LoadingOverlay
        open={showLoadingOverlay}
        message={loadingMessage}
        progress={generationProgress?.percentage}
        completedChunks={generationProgress?.completedChunks}
        totalChunks={generationProgress?.totalChunks}
        currentChunk={generationProgress?.currentChunk}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          position: "sticky",
          top: 80,
        }}
      >
        {/* TTS Settings Card */}
        <Card className="glass-card">
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SettingsIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" fontWeight={600}>
                TTS Settings
              </Typography>
            </Box>

            {/* Language Selection */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Target Language</InputLabel>
              <Select
                value={ttsSettings.target_language_code}
                label="Target Language"
                onChange={(e) =>
                  setTTSSettings({ target_language_code: e.target.value })
                }
              >
                {availableLanguages.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Speaker Selection */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Speaker</InputLabel>
              <Select
                value={ttsSettings.speaker}
                label="Speaker"
                onChange={(e) => setTTSSettings({ speaker: e.target.value })}
                startAdornment={
                  <SpeakerIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                }
              >
                {speakers.map((speaker) => (
                  <MenuItem key={speaker.id} value={speaker.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {speaker.name}
                      <Chip
                        size="small"
                        label={speaker.gender}
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Pace Slider */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <SpeedIcon sx={{ fontSize: 16 }} /> Pace
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {ttsSettings.pace.toFixed(1)}x
                </Typography>
              </Box>
              <Slider
                value={ttsSettings.pace}
                onChange={(_, value) =>
                  setTTSSettings({ pace: value as number })
                }
                min={0.5}
                max={2.0}
                step={0.1}
                marks={[
                  { value: 0.5, label: "0.5x" },
                  { value: 1.0, label: "1x" },
                  { value: 1.5, label: "1.5x" },
                  { value: 2.0, label: "2x" },
                ]}
              />
            </Box>

            {/* Temperature Slider */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body2">Temperature</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {ttsSettings.temperature.toFixed(1)}
                </Typography>
              </Box>
              <Slider
                value={ttsSettings.temperature}
                onChange={(_, value) =>
                  setTTSSettings({ temperature: value as number })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </Box>

            {/* Advanced Settings */}
            <Accordion
              sx={{
                bgcolor: "transparent",
                boxShadow: "none",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Typography variant="body2" fontWeight={500}>
                  Advanced Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {/* Sample Rate */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Sample Rate</InputLabel>
                  <Select
                    value={ttsSettings.speech_sample_rate}
                    label="Sample Rate"
                    onChange={(e) =>
                      setTTSSettings({
                        speech_sample_rate: e.target.value as number,
                      })
                    }
                  >
                    <MenuItem value={22050}>22.05 kHz</MenuItem>
                    <MenuItem value={44100}>44.1 kHz</MenuItem>
                    <MenuItem value={48000}>48 kHz (Best)</MenuItem>
                  </Select>
                </FormControl>

                {/* Heading Loudness Boost */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <VolumeIcon sx={{ fontSize: 16 }} /> Heading Boost
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      +
                      {((ttsSettings.heading_loudness_boost - 1) * 100).toFixed(
                        0,
                      )}
                      %
                    </Typography>
                  </Box>
                  <Slider
                    value={ttsSettings.heading_loudness_boost}
                    onChange={(_, value) =>
                      setTTSSettings({
                        heading_loudness_boost: value as number,
                      })
                    }
                    min={1.0}
                    max={1.5}
                    step={0.1}
                  />
                </Box>

                {/* Pause after heading */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <PauseIcon sx={{ fontSize: 16 }} /> Heading Pause
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {ttsSettings.pause_after_heading_ms}ms
                    </Typography>
                  </Box>
                  <Slider
                    value={ttsSettings.pause_after_heading_ms}
                    onChange={(_, value) =>
                      setTTSSettings({
                        pause_after_heading_ms: value as number,
                      })
                    }
                    min={0}
                    max={2000}
                    step={100}
                  />
                </Box>

                {/* Pause after bullet */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Bullet Pause</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {ttsSettings.pause_after_bullet_ms}ms
                    </Typography>
                  </Box>
                  <Slider
                    value={ttsSettings.pause_after_bullet_ms}
                    onChange={(_, value) =>
                      setTTSSettings({ pause_after_bullet_ms: value as number })
                    }
                    min={0}
                    max={1000}
                    step={50}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>

        {/* Generate Card */}
        <Card className="glass-card">
          <CardContent>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={
                  isGenerating ? (
                    <RefreshIcon className="loading-pulse" />
                  ) : (
                    <PlayIcon />
                  )
                }
                onClick={handleGenerate}
                disabled={
                  (!selectedFile && !uploadedFile) ||
                  !parsedDocument ||
                  isGenerating
                }
                data-testid="generate-button"
                sx={{
                  py: 1.5,
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  },
                  "&:disabled": {
                    background: alpha("#6366f1", 0.3),
                  },
                }}
              >
                {isGenerating ? "Generating..." : "Generate TTS"}
              </Button>

              {/* Cancel button */}
              {isGenerating && (
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  onClick={handleCancel}
                  sx={{
                    py: 1.5,
                    minWidth: 100,
                    borderColor: alpha("#ef4444", 0.5),
                    "&:hover": {
                      borderColor: "#ef4444",
                      bgcolor: alpha("#ef4444", 0.1),
                    },
                  }}
                >
                  <CancelIcon />
                </Button>
              )}
            </Box>

            {/* Document Info */}
            {parsedDocument && !isGenerating && !ttsJob && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: alpha("#6366f1", 0.1),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Ready to process: {parsedDocument.total_chunks} chunks, ~
                  {parsedDocument.estimated_duration_seconds}s estimated
                </Typography>
              </Box>
            )}

            {/* Progress */}
            {isGenerating && ttsJob && (
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Processing chunks...
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {ttsJob.completed_chunks} / {ttsJob.total_chunks}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha("#6366f1", 0.2),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      background:
                        "linear-gradient(90deg, #6366f1 0%, #ec4899 100%)",
                    },
                  }}
                />
              </Box>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Success / Audio Player */}
            {ttsJob?.status === "completed" && audioUrl && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  TTS generation completed successfully!
                </Alert>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha("#000", 0.2),
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Audio Preview
                  </Typography>
                  <audio controls style={{ width: "100%" }}>
                    <source src={audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  sx={{ mt: 2 }}
                >
                  Download MP3
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Chunks Info */}
        {parsedDocument && (
          <Card className="glass-card">
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Chunk Analysis
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {["h1", "h2", "h3", "paragraph", "bullet"].map((type) => {
                  const count = parsedDocument.chunks.filter(
                    (c) => c.type === type,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <Chip
                      key={type}
                      size="small"
                      label={`${type}: ${count}`}
                      sx={{
                        bgcolor: alpha(
                          type.startsWith("h")
                            ? "#6366f1"
                            : type === "bullet"
                              ? "#22c55e"
                              : "#94a3b8",
                          0.2,
                        ),
                        fontSize: "0.7rem",
                      }}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* API Statistics Card */}
        {generationSummary && (
          <Card className="glass-card" data-testid="api-stats-card">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <StatsIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  API Call Summary
                </Typography>
              </Box>

              <Table
                size="small"
                sx={{ "& td, & th": { borderBottom: "none", py: 0.5 } }}
              >
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Total API Calls
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {generationSummary.total_api_calls}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Successful
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, color: "success.main", pr: 0 }}
                    >
                      {generationSummary.successful_calls}
                    </TableCell>
                  </TableRow>
                  {generationSummary.failed_calls > 0 && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                        Failed
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, color: "error.main", pr: 0 }}
                      >
                        {generationSummary.failed_calls}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Characters Sent
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {generationSummary.total_characters.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Bytes Sent
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {(generationSummary.total_bytes_sent / 1024).toFixed(2)}{" "}
                      KB
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Bytes Received
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {(
                        generationSummary.total_bytes_received /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Total Duration
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {(generationSummary.total_duration_ms / 1000).toFixed(2)}{" "}
                      s
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", pl: 0 }}>
                      Avg Response Time
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, pr: 0 }}>
                      {generationSummary.average_response_time_ms.toFixed(0)} ms
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};

export default SettingsPanel;
