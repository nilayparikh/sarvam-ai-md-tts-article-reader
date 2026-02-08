"""
Pydantic models and schemas for the TTS API.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ChunkType(str, Enum):
    """Type of content chunk."""
    HEADING_H1 = "h1"
    HEADING_H2 = "h2"
    HEADING_H3 = "h3"
    PARAGRAPH = "paragraph"
    BULLET = "bullet"
    CODE = "code"
    BLOCKQUOTE = "blockquote"


class LanguageCode(str, Enum):
    """Supported language codes for TTS."""
    HINDI = "hi-IN"
    ENGLISH = "en-IN"
    GUJARATI = "gu-IN"
    BENGALI = "bn-IN"
    KANNADA = "kn-IN"
    MALAYALAM = "ml-IN"
    MARATHI = "mr-IN"
    ODIA = "od-IN"
    PUNJABI = "pa-IN"
    TAMIL = "ta-IN"
    TELUGU = "te-IN"


class Speaker(str, Enum):
    """Available TTS speakers."""
    SHUBH = "shubh"
    ARVIND = "arvind"
    MEERA = "meera"
    PAVITHRA = "pavithra"
    MAITREYI = "maitreyi"
    AMOL = "amol"
    AMARTYA = "amartya"


class ContentChunk(BaseModel):
    """A parsed chunk of content."""
    id: int
    type: ChunkType
    text: str
    raw_text: str  # Original with markdown
    char_count: int
    pause_after_ms: int = 300
    loudness_boost: float = 1.0

    class Config:
        use_enum_values = True


class ParsedDocument(BaseModel):
    """A fully parsed document."""
    filename: str
    language: str
    title: Optional[str] = None
    chunks: list[ContentChunk]
    total_chunks: int
    total_characters: int
    estimated_duration_seconds: float


class FileInfo(BaseModel):
    """Information about a markdown file."""
    filename: str
    language: str
    path: str
    size_bytes: int
    title: Optional[str] = None


class LanguageFiles(BaseModel):
    """Files grouped by language."""
    language: str
    language_code: str
    files: list[FileInfo]


class TTSSettings(BaseModel):
    """Settings for TTS generation."""
    target_language_code: str = Field(default="hi-IN")
    speaker: str = Field(default="shubh")
    pace: float = Field(default=1.1, ge=0.5, le=2.0)
    speech_sample_rate: int = Field(default=48000)
    model: str = Field(default="bulbul:v3")
    temperature: float = Field(default=0.6, ge=0.0, le=1.0)
    enable_preprocessing: bool = Field(default=True)

    # Enhancement settings
    heading_loudness_boost: float = Field(default=1.2, ge=1.0, le=1.5)
    pause_after_heading_ms: int = Field(default=500, ge=0, le=2000)
    pause_after_bullet_ms: int = Field(default=300, ge=0, le=1000)


class GenerateTTSRequest(BaseModel):
    """Request to generate TTS."""
    file_path: str
    settings: TTSSettings = Field(default_factory=TTSSettings)
    chunks_to_generate: Optional[list[int]] = None  # None = all chunks


class TTSChunkResult(BaseModel):
    """Result of TTS generation for a single chunk."""
    chunk_id: int
    success: bool
    audio_base64: Optional[str] = None
    duration_ms: Optional[int] = None
    error: Optional[str] = None


class GenerateTTSResponse(BaseModel):
    """Response from TTS generation."""
    job_id: str
    filename: str
    total_chunks: int
    completed_chunks: int
    status: Literal["processing", "completed", "failed"]
    results: list[TTSChunkResult] = []
    output_path: Optional[str] = None
    error: Optional[str] = None


class ExportRequest(BaseModel):
    """Request to export audio as MP3."""
    job_id: str
    filename: str
    format: Literal["mp3", "wav"] = "mp3"


class ExportResponse(BaseModel):
    """Response from export."""
    success: bool
    output_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    sarvam_api_configured: bool


# ===========================================================================
# File Upload and Markdown Write Models
# ===========================================================================

class MarkdownWriteRequest(BaseModel):
    """Request to write/save markdown content."""
    content: str
    language: str
    filename: str
    overwrite: bool = False


class MarkdownWriteResponse(BaseModel):
    """Response from markdown write operation."""
    success: bool
    path: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class UploadedFileInfo(BaseModel):
    """Information about an uploaded file."""
    filename: str
    language: str
    content: str
    size_bytes: int
    title: Optional[str] = None


# ===========================================================================
# API Call Statistics Models
# ===========================================================================

class APICallStats(BaseModel):
    """Statistics for a single API call."""
    chunk_id: int
    characters_sent: int
    bytes_sent: int
    bytes_received: int
    duration_ms: int
    success: bool
    error: Optional[str] = None


class GenerationSummary(BaseModel):
    """Summary statistics for a TTS generation job."""
    job_id: str
    filename: str
    total_api_calls: int
    successful_calls: int
    failed_calls: int
    total_characters: int
    total_bytes_sent: int
    total_bytes_received: int
    total_duration_ms: int
    average_response_time_ms: float
    output_file_size_bytes: Optional[int] = None
    output_duration_seconds: Optional[float] = None
    calls: list[APICallStats] = []

