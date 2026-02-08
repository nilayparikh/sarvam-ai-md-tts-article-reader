import React from "react";
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
  Backdrop,
  alpha,
} from "@mui/material";

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
  completedChunks?: number;
  totalChunks?: number;
  currentChunk?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = "Processing...",
  progress,
  completedChunks,
  totalChunks,
  currentChunk,
}) => {
  return (
    <Backdrop
      sx={{
        color: "#fff",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: "blur(8px)",
        backgroundColor: alpha("#0f0f23", 0.85),
      }}
      open={open}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          p: 4,
          borderRadius: 3,
          background: "rgba(26, 26, 46, 0.9)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          minWidth: 320,
          maxWidth: 400,
        }}
      >
        {/* Animated spinner with gradient */}
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <CircularProgress
            size={80}
            thickness={3}
            sx={{
              color: "primary.main",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }}
          />
          {progress !== undefined && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {`${Math.round(progress)}%`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Main message */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#f1f5f9",
            textAlign: "center",
          }}
        >
          {message}
        </Typography>

        {/* Progress bar */}
        {progress !== undefined && (
          <Box sx={{ width: "100%" }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha("#6366f1", 0.2),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  background:
                    "linear-gradient(90deg, #6366f1 0%, #ec4899 100%)",
                },
              }}
            />
          </Box>
        )}

        {/* Chunk progress */}
        {completedChunks !== undefined && totalChunks !== undefined && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Processing chunk{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {completedChunks}
              </Box>{" "}
              of{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {totalChunks}
              </Box>
            </Typography>
          </Box>
        )}

        {/* Current chunk info */}
        {currentChunk && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textAlign: "center",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentChunk}
          </Typography>
        )}

        {/* Animated dots */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "primary.main",
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 0.4, transform: "scale(0.8)" },
                  "50%": { opacity: 1, transform: "scale(1)" },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;
