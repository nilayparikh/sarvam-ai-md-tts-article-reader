"""
TTS Service using Sarvam AI

Handles text-to-speech conversion using the Sarvam AI API.
Supports chunked processing, audio concatenation, and export.
"""
import base64
import uuid
import asyncio
import io
import time
import json
import logging
from pathlib import Path
from typing import Optional, AsyncGenerator
from datetime import datetime
import httpx
from pydub import AudioSegment

from models.schemas import (
    ContentChunk,
    TTSSettings,
    TTSChunkResult,
    GenerateTTSResponse,
    ParsedDocument,
    APICallStats,
    GenerationSummary,
)
from config import get_settings

# Get logger
logger = logging.getLogger('tts_backend.tts_service')


class TTSService:
    """
    Service for text-to-speech conversion using Sarvam AI.

    Features:
    - Async chunk processing
    - Audio concatenation with pauses
    - Loudness adjustment for headings
    - MP3 export
    - API call statistics tracking
    """

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.sarvam_api_key
        self.base_url = self.settings.sarvam_base_url

        # In-memory storage for generated audio (job_id -> audio segments)
        self._audio_cache: dict[str, list[tuple[int, bytes]]] = {}
        self._job_status: dict[str, GenerateTTSResponse] = {}
        # API call stats storage (job_id -> list of call stats)
        self._api_stats: dict[str, list[APICallStats]] = {}

    @property
    def is_configured(self) -> bool:
        """Check if the API is configured."""
        return bool(self.api_key and self.api_key != "your-api-key-here")

    async def generate_tts_for_document(
        self,
        document: ParsedDocument,
        settings: TTSSettings,
        chunk_ids: Optional[list[int]] = None
    ) -> AsyncGenerator[GenerateTTSResponse, None]:
        """
        Generate TTS for a parsed document.

        Args:
            document: Parsed document with chunks
            settings: TTS settings to use
            chunk_ids: Optional list of specific chunk IDs to process

        Yields:
            GenerateTTSResponse with progress updates
        """
        job_id = str(uuid.uuid4())
        logger.info(f"Starting TTS job {job_id} for {document.filename}")

        # Filter chunks if specific IDs requested
        chunks = document.chunks
        if chunk_ids:
            chunks = [c for c in chunks if c.id in chunk_ids]
            logger.info(f"Processing {len(chunks)} specific chunks")

        # Initialize job status
        response = GenerateTTSResponse(
            job_id=job_id,
            filename=document.filename,
            total_chunks=len(chunks),
            completed_chunks=0,
            status="processing",
            results=[]
        )
        self._job_status[job_id] = response
        self._audio_cache[job_id] = []
        self._api_stats[job_id] = []  # Initialize stats tracking

        logger.info(f"Job {job_id}: Processing {len(chunks)} chunks")
        yield response

        # Process chunks with rate limiting
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, chunk in enumerate(chunks):
                chunk_start = time.time()
                try:
                    logger.debug(f"Job {job_id}: Processing chunk {i+1}/{len(chunks)} (ID: {chunk.id}, {len(chunk.text)} chars)")
                    result, stats = await self._process_chunk_with_stats(client, chunk, settings)
                    response.results.append(result)
                    self._api_stats[job_id].append(stats)

                    if result.success and result.audio_base64:
                        audio_bytes = base64.b64decode(result.audio_base64)
                        self._audio_cache[job_id].append((chunk.id, audio_bytes))
                        logger.info(f"Job {job_id}: Chunk {i+1}/{len(chunks)} completed in {stats.duration_ms}ms")
                    else:
                        logger.warning(f"Job {job_id}: Chunk {i+1} failed - {result.error}")

                    response.completed_chunks += 1
                    yield response

                    # Small delay between API calls to avoid rate limiting
                    if i < len(chunks) - 1:
                        await asyncio.sleep(0.2)

                except Exception as e:
                    logger.error(f"Job {job_id}: Chunk {i+1} exception - {str(e)}")
                    response.results.append(TTSChunkResult(
                        chunk_id=chunk.id,
                        success=False,
                        error=str(e)
                    ))
                    # Track failed call stats
                    self._api_stats[job_id].append(APICallStats(
                        chunk_id=chunk.id,
                        characters_sent=len(chunk.text),
                        bytes_sent=0,
                        bytes_received=0,
                        duration_ms=0,
                        success=False,
                        error=str(e)
                    ))
                    response.completed_chunks += 1
                    yield response

        # Mark as completed
        response.status = "completed"
        self._job_status[job_id] = response
        successful = sum(1 for r in response.results if r.success)
        failed = len(response.results) - successful
        logger.info(f"Job {job_id} completed: {successful} successful, {failed} failed")
        yield response

    async def _process_chunk_with_stats(
        self,
        client: httpx.AsyncClient,
        chunk: ContentChunk,
        settings: TTSSettings
    ) -> tuple[TTSChunkResult, APICallStats]:
        """Process a single chunk through the TTS API and track stats."""

        start_time = time.time()

        if not self.is_configured:
            return (
                TTSChunkResult(
                    chunk_id=chunk.id,
                    success=False,
                    error="Sarvam AI API key not configured"
                ),
                APICallStats(
                    chunk_id=chunk.id,
                    characters_sent=len(chunk.text),
                    bytes_sent=0,
                    bytes_received=0,
                    duration_ms=0,
                    success=False,
                    error="API key not configured"
                )
            )

        # Prepare the request
        # Adjust pace for headings (slightly slower for emphasis)
        pace = settings.pace
        # Handle both enum and string type values (due to serialization)
        chunk_type = chunk.type.value if hasattr(chunk.type, 'value') else chunk.type
        if chunk_type.startswith('h'):
            pace = max(0.9, settings.pace - 0.1)  # Slightly slower for headings

        payload = {
            "text": chunk.text,
            "target_language_code": settings.target_language_code,
            "speaker": settings.speaker,
            "pace": pace,
            "speech_sample_rate": settings.speech_sample_rate,
            "enable_preprocessing": settings.enable_preprocessing,
            "model": settings.model,
        }

        payload_bytes = json.dumps(payload).encode('utf-8')
        bytes_sent = len(payload_bytes)

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = await client.post(
                f"{self.base_url}/text-to-speech",
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            response_bytes = len(response.content)
            duration_ms = int((time.time() - start_time) * 1000)

            data = response.json()

            # Extract audio from response
            audio_base64 = data.get("audios", [None])[0]

            if not audio_base64:
                return (
                    TTSChunkResult(
                        chunk_id=chunk.id,
                        success=False,
                        error="No audio in response"
                    ),
                    APICallStats(
                        chunk_id=chunk.id,
                        characters_sent=len(chunk.text),
                        bytes_sent=bytes_sent,
                        bytes_received=response_bytes,
                        duration_ms=duration_ms,
                        success=False,
                        error="No audio in response"
                    )
                )

            # Estimate duration (rough calculation)
            # Base64 WAV at 48kHz, 16-bit mono is ~96KB/s
            audio_bytes = base64.b64decode(audio_base64)
            estimated_duration_ms = len(audio_bytes) / 96  # Very rough estimate

            return (
                TTSChunkResult(
                    chunk_id=chunk.id,
                    success=True,
                    audio_base64=audio_base64,
                    duration_ms=int(estimated_duration_ms)
                ),
                APICallStats(
                    chunk_id=chunk.id,
                    characters_sent=len(chunk.text),
                    bytes_sent=bytes_sent,
                    bytes_received=response_bytes,
                    duration_ms=duration_ms,
                    success=True
                )
            )

        except httpx.HTTPStatusError as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = f"API error: {e.response.status_code} - {e.response.text}"
            return (
                TTSChunkResult(
                    chunk_id=chunk.id,
                    success=False,
                    error=error_msg
                ),
                APICallStats(
                    chunk_id=chunk.id,
                    characters_sent=len(chunk.text),
                    bytes_sent=bytes_sent,
                    bytes_received=len(e.response.content) if e.response else 0,
                    duration_ms=duration_ms,
                    success=False,
                    error=error_msg
                )
            )
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return (
                TTSChunkResult(
                    chunk_id=chunk.id,
                    success=False,
                    error=str(e)
                ),
                APICallStats(
                    chunk_id=chunk.id,
                    characters_sent=len(chunk.text),
                    bytes_sent=bytes_sent,
                    bytes_received=0,
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e)
                )
            )

    async def _process_chunk(
        self,
        client: httpx.AsyncClient,
        chunk: ContentChunk,
        settings: TTSSettings
    ) -> TTSChunkResult:
        """Process a single chunk through the TTS API."""

        if not self.is_configured:
            return TTSChunkResult(
                chunk_id=chunk.id,
                success=False,
                error="Sarvam AI API key not configured"
            )

        # Prepare the request
        # Adjust pace for headings (slightly slower for emphasis)
        pace = settings.pace
        # Handle both enum and string type values (due to serialization)
        chunk_type = chunk.type.value if hasattr(chunk.type, 'value') else chunk.type
        if chunk_type.startswith('h'):
            pace = max(0.9, settings.pace - 0.1)  # Slightly slower for headings

        payload = {
            "text": chunk.text,
            "target_language_code": settings.target_language_code,
            "speaker": settings.speaker,
            "pace": pace,
            "speech_sample_rate": settings.speech_sample_rate,
            "enable_preprocessing": settings.enable_preprocessing,
            "model": settings.model,
        }

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = await client.post(
                f"{self.base_url}/text-to-speech",
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            data = response.json()

            # Extract audio from response
            audio_base64 = data.get("audios", [None])[0]

            if not audio_base64:
                return TTSChunkResult(
                    chunk_id=chunk.id,
                    success=False,
                    error="No audio in response"
                )

            # Estimate duration (rough calculation)
            # Base64 WAV at 48kHz, 16-bit mono is ~96KB/s
            audio_bytes = base64.b64decode(audio_base64)
            estimated_duration_ms = len(audio_bytes) / 96  # Very rough estimate

            return TTSChunkResult(
                chunk_id=chunk.id,
                success=True,
                audio_base64=audio_base64,
                duration_ms=int(estimated_duration_ms)
            )

        except httpx.HTTPStatusError as e:
            return TTSChunkResult(
                chunk_id=chunk.id,
                success=False,
                error=f"API error: {e.response.status_code} - {e.response.text}"
            )
        except Exception as e:
            return TTSChunkResult(
                chunk_id=chunk.id,
                success=False,
                error=str(e)
            )

    async def export_audio(
        self,
        job_id: str,
        document: ParsedDocument,
        output_filename: Optional[str] = None,
        format: str = "mp3"
    ) -> tuple[Path, int, float]:
        """
        Export concatenated audio to file.

        Args:
            job_id: Job ID from generation
            document: Original parsed document (for pause information)
            output_filename: Optional custom filename
            format: Output format (mp3 or wav)

        Returns:
            Tuple of (output_path, file_size_bytes, duration_seconds)
        """
        if job_id not in self._audio_cache:
            raise ValueError(f"Job not found: {job_id}")

        audio_segments = self._audio_cache[job_id]
        if not audio_segments:
            raise ValueError("No audio segments to export")

        # Create chunk lookup for pause information
        chunk_lookup = {c.id: c for c in document.chunks}

        # Concatenate audio with pauses
        combined = AudioSegment.empty()

        for chunk_id, audio_bytes in sorted(audio_segments, key=lambda x: x[0]):
            # Load audio segment
            try:
                segment = AudioSegment.from_wav(io.BytesIO(audio_bytes))
            except Exception:
                # Try as raw audio
                segment = AudioSegment.from_file(io.BytesIO(audio_bytes))

            # Apply loudness boost if needed
            chunk = chunk_lookup.get(chunk_id)
            if chunk and chunk.loudness_boost > 1.0:
                # Convert boost to dB (1.3 boost ≈ +2.3dB)
                db_boost = 20 * (chunk.loudness_boost - 1.0)
                segment = segment + db_boost

            # Add segment
            combined += segment

            # Add pause after chunk
            if chunk:
                pause_duration = chunk.pause_after_ms
                if pause_duration > 0:
                    silence = AudioSegment.silent(duration=pause_duration)
                    combined += silence

        # Ensure output directory exists
        settings = get_settings()
        output_dir = settings.speech_output_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = Path(document.filename).stem
            output_filename = f"{base_name}_{timestamp}.{format}"

        output_path = output_dir / output_filename

        # Export
        if format == "mp3":
            combined.export(output_path, format="mp3", bitrate="192k")
        else:
            combined.export(output_path, format="wav")

        # Get file info
        file_size = output_path.stat().st_size
        duration_seconds = len(combined) / 1000.0

        return output_path, file_size, duration_seconds

    def get_job_status(self, job_id: str) -> Optional[GenerateTTSResponse]:
        """Get the status of a TTS generation job."""
        return self._job_status.get(job_id)

    def get_audio_preview(self, job_id: str, chunk_id: int) -> Optional[bytes]:
        """Get audio for a specific chunk."""
        if job_id not in self._audio_cache:
            return None

        for cid, audio in self._audio_cache[job_id]:
            if cid == chunk_id:
                return audio

        return None

    def cleanup_job(self, job_id: str):
        """Clean up resources for a job."""
        self._audio_cache.pop(job_id, None)
        self._job_status.pop(job_id, None)
        self._api_stats.pop(job_id, None)

    def get_generation_summary(self, job_id: str) -> Optional[GenerationSummary]:
        """Get summary statistics for a generation job."""
        if job_id not in self._api_stats:
            return None

        stats = self._api_stats[job_id]
        job_status = self._job_status.get(job_id)

        if not stats or not job_status:
            return None

        successful = [s for s in stats if s.success]
        failed = [s for s in stats if not s.success]

        total_chars = sum(s.characters_sent for s in stats)
        total_sent = sum(s.bytes_sent for s in stats)
        total_received = sum(s.bytes_received for s in stats)
        total_duration = sum(s.duration_ms for s in stats)
        avg_response = total_duration / len(stats) if stats else 0

        return GenerationSummary(
            job_id=job_id,
            filename=job_status.filename,
            total_api_calls=len(stats),
            successful_calls=len(successful),
            failed_calls=len(failed),
            total_characters=total_chars,
            total_bytes_sent=total_sent,
            total_bytes_received=total_received,
            total_duration_ms=total_duration,
            average_response_time_ms=round(avg_response, 2),
            calls=stats
        )


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get or create the TTS service singleton."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
