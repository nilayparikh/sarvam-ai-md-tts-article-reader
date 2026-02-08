import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Chip,
  alpha,
} from "@mui/material";
import {
  Article as ArticleIcon,
  Timer as TimerIcon,
  TextFields as TextIcon,
  Layers as LayersIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "../store/useAppStore";

const MarkdownViewer: React.FC = () => {
  const { selectedFile, fileContent, parsedDocument, isParsing } =
    useAppStore();

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!selectedFile) {
    return (
      <Card className="glass-card" sx={{ minHeight: 400 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 350,
              color: "text.secondary",
            }}
          >
            <ArticleIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="body1">Select a file to preview</Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Choose a language and file from the selector above
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent>
        {/* Header with stats */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ArticleIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Document Preview
            </Typography>
          </Box>

          {parsedDocument && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Chip
                size="small"
                icon={<LayersIcon sx={{ fontSize: 14 }} />}
                label={`${parsedDocument.total_chunks} chunks`}
                sx={{ bgcolor: alpha("#6366f1", 0.2), color: "#818cf8" }}
              />
              <Chip
                size="small"
                icon={<TextIcon sx={{ fontSize: 14 }} />}
                label={`${parsedDocument.total_characters.toLocaleString()} chars`}
                sx={{ bgcolor: alpha("#22c55e", 0.2), color: "#4ade80" }}
              />
              <Chip
                size="small"
                icon={<TimerIcon sx={{ fontSize: 14 }} />}
                label={`~${formatDuration(parsedDocument.estimated_duration_seconds)}`}
                sx={{ bgcolor: alpha("#f59e0b", 0.2), color: "#fbbf24" }}
              />
            </Box>
          )}
        </Box>

        {/* Document title */}
        {parsedDocument?.title && (
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              mb: 2,
              pb: 1,
              borderBottom: "2px solid",
              borderColor: alpha("#6366f1", 0.3),
            }}
          >
            {parsedDocument.title}
          </Typography>
        )}

        {/* Content */}
        <Box
          sx={{
            maxHeight: 500,
            overflow: "auto",
            pr: 1,
          }}
        >
          {isParsing ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" height={30} sx={{ mt: 2 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="90%" />
            </Box>
          ) : fileContent ? (
            <Box className="markdown-content">
              <ReactMarkdown>{fileContent}</ReactMarkdown>
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MarkdownViewer;
