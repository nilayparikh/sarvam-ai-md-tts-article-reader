import React from "react";
import { AppBar, Toolbar, Typography, Box, Chip, alpha } from "@mui/material";
import {
  GraphicEq as AudioIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type { HealthResponse } from "../types";

interface HeaderProps {
  health: HealthResponse | null;
}

const Header: React.FC<HeaderProps> = ({ health }) => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: alpha("#1a1a2e", 0.8),
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
            }}
          >
            <AudioIcon sx={{ fontSize: 24, color: "white" }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(90deg, #f8fafc 0%, #94a3b8 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Sarvam TTS
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Document Reader
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {health && (
            <>
              <Chip
                size="small"
                icon={<CheckIcon sx={{ fontSize: 16 }} />}
                label={`v${health.version}`}
                sx={{
                  bgcolor: alpha("#22c55e", 0.2),
                  color: "#22c55e",
                  "& .MuiChip-icon": { color: "#22c55e" },
                }}
              />
              <Chip
                size="small"
                icon={
                  health.sarvam_api_configured ? (
                    <CheckIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <WarningIcon sx={{ fontSize: 16 }} />
                  )
                }
                label={
                  health.sarvam_api_configured
                    ? "API Ready"
                    : "API Not Configured"
                }
                sx={{
                  bgcolor: health.sarvam_api_configured
                    ? alpha("#22c55e", 0.2)
                    : alpha("#f59e0b", 0.2),
                  color: health.sarvam_api_configured ? "#22c55e" : "#f59e0b",
                  "& .MuiChip-icon": {
                    color: health.sarvam_api_configured ? "#22c55e" : "#f59e0b",
                  },
                }}
              />
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
