"""
FastAPI Backend for TTS Application

Provides REST API for:
- File discovery and listing
- Markdown parsing and chunking
- TTS generation with Sarvam AI
- Audio preview and export
- File upload and markdown writing
- API call statistics
- Real-time progress streaming via SSE
"""
import base64
import logging
import sys
import asyncio
import json
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse


# Configure logging
def setup_logging():
    """Setup comprehensive logging for the application."""
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)

    # Reduce noise from other libraries
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)

    return logging.getLogger('tts_backend')

# Initialize logging
logger = setup_logging()

from config import get_settings
from models import (
    FileInfo,
    LanguageFiles,
    ParsedDocument,
    TTSSettings,
    GenerateTTSRequest,
    GenerateTTSResponse,
    ExportRequest,
    ExportResponse,
    HealthResponse,
    MarkdownWriteRequest,
    MarkdownWriteResponse,
    UploadedFileInfo,
    GenerationSummary,
)
from services import (
    create_parser,
    create_file_discovery_service,
    get_tts_service,
)


# Application version
VERSION = "1.0.0"


# Store for active generation jobs
_active_jobs: dict[str, dict] = {}
# Rate limiting tracker
_request_tracker: dict[str, list[float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    settings = get_settings()
    logger.info(f"Starting TTS Backend v{VERSION}")
    logger.info(f"Translate path: {settings.translate_dir}")
    logger.info(f"Speech output path: {settings.speech_output_dir}")
    logger.info(f"Sarvam AI configured: {bool(settings.sarvam_api_key)}")

    # Ensure speech output directory exists
    settings.speech_output_dir.mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown
    logger.info("Shutting down TTS Backend")


# Create FastAPI app
app = FastAPI(
    title="Sarvam TTS Backend",
    description="Text-to-Speech API using Sarvam AI",
    version=VERSION,
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    tts_service = get_tts_service()

    return HealthResponse(
        status="healthy",
        version=VERSION,
        sarvam_api_configured=tts_service.is_configured
    )


# ============================================================================
# File Discovery Endpoints
# ============================================================================

@app.get("/api/files", response_model=list[LanguageFiles])
async def list_all_files():
    """
    List all available markdown files grouped by language.

    Returns files from the translate directory organized by language folder.
    """
    file_service = create_file_discovery_service()
    return file_service.discover_all_languages()


@app.get("/api/files/{language}", response_model=list[FileInfo])
async def list_files_for_language(language: str):
    """
    List markdown files for a specific language.

    Args:
        language: Language folder name (e.g., "hi", "eng", "guj")
    """
    file_service = create_file_discovery_service()
    files = file_service.discover_files_for_language(language)

    if not files:
        raise HTTPException(
            status_code=404,
            detail=f"No files found for language: {language}"
        )

    return files


@app.get("/api/files/{language}/{filename}/content")
async def get_file_content(language: str, filename: str):
    """
    Get the raw content of a markdown file.

    Args:
        language: Language folder name
        filename: Markdown filename
    """
    file_service = create_file_discovery_service()
    settings = get_settings()

    file_path = settings.translate_dir / language / filename

    try:
        content = file_service.get_file_content(str(file_path))
        return {"content": content, "filename": filename, "language": language}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============================================================================
# Parsing Endpoints
# ============================================================================

class ParseRequest(BaseModel):
    """Request to parse a markdown file."""
    language: str
    filename: str
    max_chunk_size: Optional[int] = None


@app.post("/api/parse", response_model=ParsedDocument)
async def parse_markdown(request: ParseRequest):
    """
    Parse a markdown file into TTS-optimized chunks.

    Returns structured document with chunks, pauses, and loudness settings.
    """
    settings = get_settings()
    file_path = settings.translate_dir / request.language / request.filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    parser = create_parser(request.max_chunk_size)

    try:
        document = parser.parse_file(file_path, request.language)
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


# ============================================================================
# TTS Generation Endpoints
# ============================================================================

# Store for active generation jobs
_active_jobs: dict[str, dict] = {}
_rate_limit_requests: dict[str, list[float]] = {}
_rate_limit_max = 5  # Max concurrent requests per client
_rate_limit_window = 60  # Window in seconds


def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit."""
    import time
    now = time.time()

    if client_ip not in _rate_limit_requests:
        _rate_limit_requests[client_ip] = []

    # Clean old requests
    _rate_limit_requests[client_ip] = [
        t for t in _rate_limit_requests[client_ip]
        if now - t < _rate_limit_window
    ]

    if len(_rate_limit_requests[client_ip]) >= _rate_limit_max:
        return False

    _rate_limit_requests[client_ip].append(now)
    return True


@app.post("/api/tts/generate")
async def generate_tts(request: GenerateTTSRequest, req: Request, background_tasks: BackgroundTasks):
    """
    Start TTS generation for a document.

    Returns immediately with a job ID. Poll /api/tts/status/{job_id} for progress.
    """
    client_ip = req.client.host if req.client else "unknown"
    logger.info(f"TTS generation request from {client_ip}: {request.file_path}")

    # Check rate limit
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again."
        )

    settings = get_settings()
    start_time = datetime.now()

    # Parse the file path
    file_path = Path(request.file_path)
    if not file_path.is_absolute():
        # Assume it's relative to translate directory
        parts = request.file_path.split("/")
        if len(parts) >= 2:
            file_path = settings.translate_dir / parts[0] / parts[1]
        else:
            logger.error(f"Invalid file path: {request.file_path}")
            raise HTTPException(status_code=400, detail="Invalid file path")

    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")

    # Extract language from path
    language = file_path.parent.name
    logger.info(f"Processing file: {file_path.name}, language: {language}")

    # Parse document
    parser = create_parser()
    document = parser.parse_file(file_path, language)
    logger.info(f"Parsed document: {len(document.chunks)} chunks, {document.total_characters} chars")

    # Start generation
    tts_service = get_tts_service()

    # Generate synchronously for now (can be made async with background tasks)
    results = []
    chunk_count = 0
    async for response in tts_service.generate_tts_for_document(
        document,
        request.settings,
        request.chunks_to_generate
    ):
        results.append(response)
        if response.completed_chunks > chunk_count:
            chunk_count = response.completed_chunks
            logger.info(f"Progress: {chunk_count}/{response.total_chunks} chunks completed")

    final_response = results[-1] if results else None

    if final_response:
        # Store document for export
        _active_jobs[final_response.job_id] = {
            "document": document,
            "response": final_response
        }

        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"TTS generation completed in {duration:.2f}s - Job ID: {final_response.job_id}")
        return final_response

    logger.error("TTS generation failed - no response")
    raise HTTPException(status_code=500, detail="Failed to generate TTS")


@app.post("/api/tts/generate/stream")
async def generate_tts_stream(request: GenerateTTSRequest, req: Request):
    """
    Start TTS generation with SSE streaming for real-time progress updates.

    Returns Server-Sent Events with progress updates.
    """
    client_ip = req.client.host if req.client else "unknown"
    logger.info(f"SSE TTS generation request from {client_ip}: {request.file_path}")

    # Check rate limit
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again."
        )

    settings = get_settings()

    # Parse the file path
    file_path = Path(request.file_path)
    if not file_path.is_absolute():
        parts = request.file_path.split("/")
        if len(parts) >= 2:
            file_path = settings.translate_dir / parts[0] / parts[1]
        else:
            raise HTTPException(status_code=400, detail="Invalid file path")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    language = file_path.parent.name

    async def event_generator():
        """Generate SSE events for TTS progress."""
        try:
            parser = create_parser()
            document = parser.parse_file(file_path, language)

            # Send initial event
            yield {
                "event": "start",
                "data": json.dumps({
                    "total_chunks": len(document.chunks),
                    "total_characters": document.total_characters,
                    "filename": document.filename
                })
            }

            tts_service = get_tts_service()

            async for response in tts_service.generate_tts_for_document(
                document,
                request.settings,
                request.chunks_to_generate
            ):
                # Store for later export
                _active_jobs[response.job_id] = {
                    "document": document,
                    "response": response
                }

                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "job_id": response.job_id,
                        "completed_chunks": response.completed_chunks,
                        "total_chunks": response.total_chunks,
                        "status": response.status,
                        "percentage": int((response.completed_chunks / response.total_chunks) * 100) if response.total_chunks > 0 else 0
                    })
                }

                # Small delay to prevent flooding
                await asyncio.sleep(0.1)

            # Send completion event
            yield {
                "event": "complete",
                "data": json.dumps({
                    "job_id": response.job_id,
                    "status": response.status
                })
            }

        except Exception as e:
            logger.error(f"SSE generation error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())


@app.get("/api/tts/status/{job_id}", response_model=GenerateTTSResponse)
async def get_tts_status(job_id: str):
    """Get the status of a TTS generation job."""
    tts_service = get_tts_service()
    status = tts_service.get_job_status(job_id)

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return status


@app.get("/api/tts/preview/{job_id}/{chunk_id}")
async def preview_chunk_audio(job_id: str, chunk_id: int):
    """
    Get audio preview for a specific chunk.

    Returns the audio as a WAV file.
    """
    tts_service = get_tts_service()
    audio = tts_service.get_audio_preview(job_id, chunk_id)

    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    return StreamingResponse(
        iter([audio]),
        media_type="audio/wav",
        headers={
            "Content-Disposition": f"inline; filename=chunk_{chunk_id}.wav"
        }
    )


@app.post("/api/tts/export", response_model=ExportResponse)
async def export_audio(request: ExportRequest):
    """
    Export the generated audio as MP3 or WAV.

    Concatenates all chunks with appropriate pauses and loudness adjustments.
    """
    if request.job_id not in _active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = _active_jobs[request.job_id]
    document = job_data["document"]

    tts_service = get_tts_service()

    try:
        output_path, file_size, duration = await tts_service.export_audio(
            request.job_id,
            document,
            request.filename if hasattr(request, 'filename') else None,
            request.format
        )

        return ExportResponse(
            success=True,
            output_path=str(output_path),
            file_size_bytes=file_size,
            duration_seconds=duration
        )
    except Exception as e:
        return ExportResponse(
            success=False,
            error=str(e)
        )


@app.get("/api/tts/download/{job_id}")
async def download_audio(job_id: str, format: str = "mp3"):
    """Download the exported audio file."""
    if job_id not in _active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = _active_jobs[job_id]
    document = job_data["document"]

    tts_service = get_tts_service()

    try:
        output_path, _, _ = await tts_service.export_audio(
            job_id,
            document,
            format=format
        )

        return FileResponse(
            output_path,
            media_type="audio/mpeg" if format == "mp3" else "audio/wav",
            filename=output_path.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Settings Endpoints
# ============================================================================

@app.get("/api/settings/defaults")
async def get_default_settings():
    """Get default TTS settings."""
    settings = get_settings()

    return {
        "target_language_code": "hi-IN",
        "speaker": settings.default_speaker,
        "pace": settings.default_pace,
        "speech_sample_rate": settings.default_sample_rate,
        "model": settings.default_model,
        "temperature": settings.default_temperature,
        "enable_preprocessing": True,
        "heading_loudness_boost": 1.2,
        "pause_after_heading_ms": 500,
        "pause_after_bullet_ms": 300,
    }


@app.get("/api/settings/speakers")
async def get_available_speakers():
    """Get list of available TTS speakers."""
    return {
        "speakers": [
            {"id": "shubh", "name": "Shubh", "gender": "male"},
            {"id": "arvind", "name": "Arvind", "gender": "male"},
            {"id": "meera", "name": "Meera", "gender": "female"},
            {"id": "pavithra", "name": "Pavithra", "gender": "female"},
            {"id": "maitreyi", "name": "Maitreyi", "gender": "female"},
            {"id": "amol", "name": "Amol", "gender": "male"},
            {"id": "amartya", "name": "Amartya", "gender": "male"},
        ]
    }


@app.get("/api/settings/languages")
async def get_available_languages():
    """Get list of available TTS languages."""
    return {
        "languages": [
            {"code": "hi-IN", "name": "Hindi"},
            {"code": "en-IN", "name": "English (India)"},
            {"code": "gu-IN", "name": "Gujarati"},
            {"code": "bn-IN", "name": "Bengali"},
            {"code": "kn-IN", "name": "Kannada"},
            {"code": "ml-IN", "name": "Malayalam"},
            {"code": "mr-IN", "name": "Marathi"},
            {"code": "od-IN", "name": "Odia"},
            {"code": "pa-IN", "name": "Punjabi"},
            {"code": "ta-IN", "name": "Tamil"},
            {"code": "te-IN", "name": "Telugu"},
        ]
    }


# ============================================================================
# File Upload and Markdown Write Endpoints
# ============================================================================

@app.post("/api/files/upload", response_model=UploadedFileInfo)
async def upload_markdown(
    file: UploadFile = File(...),
    language: str = Form(default="hi")
):
    """
    Upload a markdown file for processing.

    The file is read into memory and returned as content.
    It is NOT saved to disk - use the write endpoint to save.
    """
    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Only markdown (.md) files are supported")

    content = await file.read()
    content_str = content.decode('utf-8')

    # Extract title from first H1 heading
    title = None
    for line in content_str.split('\n'):
        line = line.strip()
        if line.startswith('# '):
            title = line[2:].strip()
            break

    return UploadedFileInfo(
        filename=file.filename,
        language=language,
        content=content_str,
        size_bytes=len(content),
        title=title
    )


@app.post("/api/files/write", response_model=MarkdownWriteResponse)
async def write_markdown(request: MarkdownWriteRequest):
    """
    Write markdown content to a file in the translate directory.

    This can be used to save uploaded content or create new files.
    """
    settings = get_settings()

    # Ensure filename ends with .md
    filename = request.filename
    if not filename.endswith('.md'):
        filename = f"{filename}.md"

    # Build target path
    target_dir = settings.translate_dir / request.language
    target_path = target_dir / filename

    # Check if file exists and overwrite is not allowed
    if target_path.exists() and not request.overwrite:
        return MarkdownWriteResponse(
            success=False,
            error=f"File already exists: {filename}. Set overwrite=true to replace."
        )

    try:
        # Ensure directory exists
        target_dir.mkdir(parents=True, exist_ok=True)

        # Write the file
        target_path.write_text(request.content, encoding='utf-8')

        return MarkdownWriteResponse(
            success=True,
            path=str(target_path),
            message=f"File saved successfully: {filename}"
        )
    except Exception as e:
        return MarkdownWriteResponse(
            success=False,
            error=f"Failed to write file: {str(e)}"
        )


@app.post("/api/parse/content", response_model=ParsedDocument)
async def parse_markdown_content(
    content: str = Form(...),
    language: str = Form(default="hi"),
    filename: str = Form(default="uploaded.md")
):
    """
    Parse markdown content directly (for uploaded files).

    This parses content without requiring a file on disk.
    """
    parser = create_parser()

    try:
        document = parser.parse_content(content, filename, language)
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


# ============================================================================
# API Statistics Endpoints
# ============================================================================

@app.get("/api/tts/summary/{job_id}", response_model=GenerationSummary)
async def get_generation_summary(job_id: str):
    """
    Get detailed statistics summary for a TTS generation job.

    Includes:
    - Total API calls made
    - Characters and bytes sent/received
    - Response times
    - Per-chunk statistics
    """
    tts_service = get_tts_service()
    summary = tts_service.get_generation_summary(job_id)

    if not summary:
        raise HTTPException(status_code=404, detail="Job not found or no statistics available")

    return summary


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
