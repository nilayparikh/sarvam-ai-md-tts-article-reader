import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAppStore } from "./store/useAppStore";
import {
  listAllFiles,
  getDefaultSettings,
  getAvailableSpeakers,
  getAvailableLanguages,
  checkHealth,
} from "./services/api";
import Header from "./components/Header";
import FileSelector from "./components/FileSelector";
import MarkdownViewer from "./components/MarkdownViewer";
import SettingsPanel from "./components/SettingsPanel";
import type { HealthResponse } from "./types";

function App() {
  const { setLanguages, setTTSSettings, setSpeakers, setAvailableLanguages } =
    useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all initial data in parallel
        const [
          healthData,
          filesData,
          speakersData,
          languagesData,
          defaultSettings,
        ] = await Promise.all([
          checkHealth().catch(() => null),
          listAllFiles().catch(() => []),
          getAvailableSpeakers().catch(() => []),
          getAvailableLanguages().catch(() => []),
          getDefaultSettings().catch(() => null),
        ]);

        if (healthData) {
          setHealth(healthData);
        }

        setLanguages(filesData);
        setSpeakers(speakersData);
        setAvailableLanguages(languagesData);

        if (defaultSettings) {
          setTTSSettings(defaultSettings);
        }
      } catch (err) {
        console.error("Failed to initialize:", err);
        setError(
          "Failed to connect to the backend. Make sure the server is running.",
        );
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setLanguages, setTTSSettings, setSpeakers, setAvailableLanguages]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading application...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", pb: 4 }}>
      <Header health={health} />

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {health && !health.sarvam_api_configured && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Sarvam AI API key is not configured. TTS generation will not work.
            Please set the SARVAM_API_KEY environment variable.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Panel - 70% */}
          <Grid item xs={12} lg={8.4}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <FileSelector />
              <MarkdownViewer />
            </Box>
          </Grid>

          {/* Right Panel - 30% */}
          <Grid item xs={12} lg={3.6}>
            <SettingsPanel />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
