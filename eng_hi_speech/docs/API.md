# API Reference

Complete API documentation for the Sarvam TTS Backend.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API does not require authentication. The Sarvam AI API key is configured server-side via environment variables.

---

## Health & Status

### GET /health

Check the health status of the API.

**Response**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "sarvam_api_configured": true
}
```

---

## File Discovery

### GET /files

List all available markdown files grouped by language.

**Response**

```json
[
  {
    "language": "Hindi",
    "language_code": "hi-IN",
    "files": [
      {
        "filename": "article-1.md",
        "language": "hi",
        "path": "/path/to/file.md",
        "size_bytes": 12345,
        "title": "Article Title"
      }
    ]
  }
]
```

### GET /files/{language}

List files for a specific language.

**Parameters**
| Name | Type | Description |
|------|------|-------------|
| language | string | Language folder name (e.g., "hi", "eng") |

**Response**

```json
[
  {
    "filename": "article-1.md",
    "language": "hi",
    "path": "/path/to/file.md",
    "size_bytes": 12345,
    "title": "Article Title"
  }
]
```

### GET /files/{language}/{filename}/content

Get the raw content of a markdown file.

**Response**

```json
{
  "content": "# Markdown content...",
  "filename": "article-1.md",
  "language": "hi"
}
```

---

## Parsing

### POST /parse

Parse a markdown file into TTS-optimized chunks.

**Request Body**

```json
{
  "language": "hi",
  "filename": "article-1.md",
  "max_chunk_size": 2000
}
```

**Response**

```json
{
  "filename": "article-1.md",
  "language": "hi",
  "title": "Article Title",
  "chunks": [
    {
      "id": 0,
      "type": "h1",
      "text": "Article Title",
      "raw_text": "# Article Title",
      "char_count": 13,
      "pause_after_ms": 800,
      "loudness_boost": 1.3
    },
    {
      "id": 1,
      "type": "paragraph",
      "text": "Content paragraph...",
      "raw_text": "Content paragraph...",
      "char_count": 245,
      "pause_after_ms": 300,
      "loudness_boost": 1.0
    }
  ],
  "total_chunks": 25,
  "total_characters": 5432,
  "estimated_duration_seconds": 180.5
}
```

**Chunk Types**
| Type | Description | Loudness Boost | Pause After |
|------|-------------|----------------|-------------|
| h1 | Level 1 heading | 1.3 | 800ms |
| h2 | Level 2 heading | 1.2 | 600ms |
| h3 | Level 3 heading | 1.1 | 400ms |
| paragraph | Regular paragraph | 1.0 | 300ms |
| bullet | Bullet point | 1.0 | 200ms |
| code | Code block | 1.0 | 300ms |
| blockquote | Block quote | 1.0 | 300ms |

---

## TTS Generation

### POST /tts/generate

Start TTS generation for a document.

**Request Body**

```json
{
  "file_path": "hi/article-1.md",
  "settings": {
    "target_language_code": "hi-IN",
    "speaker": "shubh",
    "pace": 1.1,
    "speech_sample_rate": 48000,
    "model": "bulbul:v3",
    "temperature": 0.6,
    "enable_preprocessing": true,
    "heading_loudness_boost": 1.2,
    "pause_after_heading_ms": 500,
    "pause_after_bullet_ms": 300
  },
  "chunks_to_generate": null
}
```

**Settings Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| target_language_code | string | "hi-IN" | Target language for TTS |
| speaker | string | "shubh" | Voice speaker ID |
| pace | float | 1.1 | Speech pace (0.5-2.0) |
| speech_sample_rate | int | 48000 | Audio sample rate |
| model | string | "bulbul:v3" | Sarvam AI model |
| temperature | float | 0.6 | Voice variation (0-1) |
| enable_preprocessing | bool | true | Enable text preprocessing |
| heading_loudness_boost | float | 1.2 | Volume boost for headings |
| pause_after_heading_ms | int | 500 | Pause duration after headings |
| pause_after_bullet_ms | int | 300 | Pause duration after bullets |

**Response**

```json
{
  "job_id": "uuid-string",
  "filename": "article-1.md",
  "total_chunks": 25,
  "completed_chunks": 25,
  "status": "completed",
  "results": [
    {
      "chunk_id": 0,
      "success": true,
      "audio_base64": "base64-encoded-audio...",
      "duration_ms": 2500,
      "error": null
    }
  ],
  "output_path": null,
  "error": null
}
```

### GET /tts/status/{job_id}

Get the status of a TTS generation job.

**Response**
Same as POST /tts/generate response.

### GET /tts/preview/{job_id}/{chunk_id}

Get audio preview for a specific chunk.

**Response**
Returns WAV audio file.

### POST /tts/export

Export the generated audio as MP3 or WAV.

**Request Body**

```json
{
  "job_id": "uuid-string",
  "filename": "output.mp3",
  "format": "mp3"
}
```

**Response**

```json
{
  "success": true,
  "output_path": "/path/to/output.mp3",
  "file_size_bytes": 1234567,
  "duration_seconds": 180.5,
  "error": null
}
```

### GET /tts/download/{job_id}

Download the exported audio file.

**Query Parameters**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| format | string | "mp3" | Output format (mp3 or wav) |

**Response**
Returns the audio file for download.

---

## Settings

### GET /settings/defaults

Get default TTS settings.

**Response**

```json
{
  "target_language_code": "hi-IN",
  "speaker": "shubh",
  "pace": 1.1,
  "speech_sample_rate": 48000,
  "model": "bulbul:v3",
  "temperature": 0.6,
  "enable_preprocessing": true,
  "heading_loudness_boost": 1.2,
  "pause_after_heading_ms": 500,
  "pause_after_bullet_ms": 300
}
```

### GET /settings/speakers

Get list of available TTS speakers.

**Response**

```json
{
  "speakers": [
    { "id": "shubh", "name": "Shubh", "gender": "male" },
    { "id": "arvind", "name": "Arvind", "gender": "male" },
    { "id": "meera", "name": "Meera", "gender": "female" },
    { "id": "pavithra", "name": "Pavithra", "gender": "female" },
    { "id": "maitreyi", "name": "Maitreyi", "gender": "female" },
    { "id": "amol", "name": "Amol", "gender": "male" },
    { "id": "amartya", "name": "Amartya", "gender": "male" }
  ]
}
```

### GET /settings/languages

Get list of available TTS languages.

**Response**

```json
{
  "languages": [
    { "code": "hi-IN", "name": "Hindi" },
    { "code": "en-IN", "name": "English (India)" },
    { "code": "gu-IN", "name": "Gujarati" },
    { "code": "bn-IN", "name": "Bengali" },
    { "code": "kn-IN", "name": "Kannada" },
    { "code": "ml-IN", "name": "Malayalam" },
    { "code": "mr-IN", "name": "Marathi" },
    { "code": "od-IN", "name": "Odia" },
    { "code": "pa-IN", "name": "Punjabi" },
    { "code": "ta-IN", "name": "Tamil" },
    { "code": "te-IN", "name": "Telugu" }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "detail": "Invalid request parameters"
}
```

### 404 Not Found

```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error message"
}
```
