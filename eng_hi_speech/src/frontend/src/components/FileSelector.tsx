import React, { useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  alpha,
  Divider,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Folder as FolderIcon,
  Description as FileIcon,
  Translate as TranslateIcon,
  CloudUpload as UploadIcon,
  PlaylistAdd as SelectIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useAppStore } from "../store/useAppStore";
import {
  getFileContent,
  parseMarkdown,
  uploadMarkdownFile,
  parseMarkdownContent,
  writeMarkdownFile,
} from "../services/api";

const FileSelector: React.FC = () => {
  const {
    languages,
    selectedLanguage,
    selectedFile,
    isUploadMode,
    uploadedFile,
    saveToTranslateDir,
    setSelectedLanguage,
    setSelectedFile,
    setFileContent,
    setParsedDocument,
    setIsParsing,
    setIsUploadMode,
    setUploadedFile,
    setSaveToTranslateDir,
  } = useAppStore();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: string | null,
  ) => {
    if (newMode !== null) {
      setIsUploadMode(newMode === "upload");
      setUploadError(null);
      setSaveMessage(null);
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };

  const handleFileSelect = async (
    language: string,
    filename: string,
    _path: string,
  ) => {
    const file = languages
      .find(
        (l) =>
          l.language.toLowerCase() === language.toLowerCase() ||
          l.files.some((f) => f.language === language),
      )
      ?.files.find((f) => f.filename === filename);

    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);

    try {
      // Fetch content and parse in parallel
      const [contentResponse, parsedDoc] = await Promise.all([
        getFileContent(file.language, filename),
        parseMarkdown(file.language, filename),
      ]);

      setFileContent(contentResponse.content);
      setParsedDocument(parsedDoc);
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setSaveMessage(null);

    try {
      // Upload and get content
      const uploadResult = await uploadMarkdownFile(
        file,
        selectedLanguage || "hi",
      );
      setUploadedFile(uploadResult);
      setFileContent(uploadResult.content);

      // Parse the uploaded content
      setIsParsing(true);
      const parsedDoc = await parseMarkdownContent(
        uploadResult.content,
        uploadResult.language,
        uploadResult.filename,
      );
      setParsedDocument(parsedDoc);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      setIsParsing(false);
      // Reset input so same file can be uploaded again
      event.target.value = "";
    }
  };

  const handleSaveToTranslate = async () => {
    if (!uploadedFile) return;

    try {
      const response = await writeMarkdownFile({
        content: uploadedFile.content,
        language: uploadedFile.language,
        filename: uploadedFile.filename,
        overwrite: false,
      });

      if (response.success) {
        setSaveMessage(`Saved: ${response.message}`);
      } else {
        setUploadError(response.error || "Failed to save file");
      }
    } catch (error) {
      console.error("Save failed:", error);
      setUploadError("Failed to save file to translate directory");
    }
  };

  const selectedLangData = languages.find(
    (l) =>
      l.language.toLowerCase() === selectedLanguage?.toLowerCase() ||
      l.files[0]?.language === selectedLanguage,
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="glass-card">
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FolderIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" fontWeight={600}>
            File Selection
          </Typography>
        </Box>

        {/* Mode Toggle */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <ToggleButtonGroup
            value={isUploadMode ? "upload" : "select"}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 2,
              },
            }}
          >
            <ToggleButton value="select">
              <SelectIcon sx={{ mr: 1, fontSize: 18 }} />
              Select File
            </ToggleButton>
            <ToggleButton value="upload">
              <UploadIcon sx={{ mr: 1, fontSize: 18 }} />
              Upload File
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={selectedLanguage || ""}
            label="Language"
            onChange={(e) => handleLanguageChange(e.target.value)}
            startAdornment={
              <TranslateIcon
                sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
              />
            }
          >
            {languages.map((lang) => (
              <MenuItem
                key={lang.language}
                value={lang.files[0]?.language || lang.language.toLowerCase()}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span>{lang.language}</span>
                  <Chip
                    size="small"
                    label={`${lang.files.length} file${lang.files.length !== 1 ? "s" : ""}`}
                    sx={{ ml: 2, height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
              </MenuItem>
            ))}
            {!languages.some((l) => l.files[0]?.language === "hi") && (
              <MenuItem value="hi">Hindi</MenuItem>
            )}
          </Select>
        </FormControl>

        {/* Upload Mode UI */}
        {isUploadMode && (
          <Box>
            <input
              type="file"
              ref={fileInputRef}
              accept=".md"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              data-testid="file-input"
            />
            <Button
              variant="outlined"
              fullWidth
              onClick={handleUploadClick}
              disabled={uploading}
              startIcon={
                uploading ? <CircularProgress size={18} /> : <UploadIcon />
              }
              sx={{ mb: 2 }}
              data-testid="upload-button"
            >
              {uploading ? "Uploading..." : "Choose Markdown File"}
            </Button>

            {uploadError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setUploadError(null)}
              >
                {uploadError}
              </Alert>
            )}

            {saveMessage && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => setSaveMessage(null)}
              >
                {saveMessage}
              </Alert>
            )}

            {uploadedFile && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: alpha("#6366f1", 0.1),
                  border: "1px solid",
                  borderColor: alpha("#6366f1", 0.3),
                }}
                data-testid="uploaded-file-info"
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <FileIcon sx={{ fontSize: 20, color: "primary.main" }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {uploadedFile.title || uploadedFile.filename}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {uploadedFile.filename} •{" "}
                  {formatFileSize(uploadedFile.size_bytes)}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveToTranslateDir}
                      onChange={(e) => setSaveToTranslateDir(e.target.checked)}
                      size="small"
                      data-testid="save-checkbox"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Save to translate directory
                    </Typography>
                  }
                />

                {saveToTranslateDir && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveToTranslate}
                    sx={{ mt: 1 }}
                    fullWidth
                    data-testid="save-button"
                  >
                    Save File
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Select Mode UI */}
        {!isUploadMode && selectedLanguage && selectedLangData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Available Files
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
              {selectedLangData.files.map((file) => (
                <ListItemButton
                  key={file.filename}
                  selected={selectedFile?.filename === file.filename}
                  onClick={() =>
                    handleFileSelect(file.language, file.filename, file.path)
                  }
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      bgcolor: alpha("#6366f1", 0.2),
                      "&:hover": {
                        bgcolor: alpha("#6366f1", 0.3),
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FileIcon sx={{ fontSize: 20, color: "primary.light" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.title || file.filename}
                    secondary={
                      <Box
                        component="span"
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <span>{file.filename}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.size_bytes)}</span>
                      </Box>
                    }
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {!isUploadMode && languages.length === 0 && (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <FolderIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">
              No files found in the translate directory
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FileSelector;
