# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Interface                              │
│                        (React + MUI + TypeScript)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐    │
│  │   File Selector     │     │         Settings Panel              │    │
│  │   - Language List   │     │   - Speaker Selection               │    │
│  │   - File Browser    │     │   - Pace/Temperature                │    │
│  └─────────────────────┘     │   - Advanced Settings               │    │
│                              │   - Generate Button                 │    │
│  ┌─────────────────────┐     │   - Audio Preview                   │    │
│  │  Markdown Viewer    │     │   - Download Button                 │    │
│  │  - Rendered MD      │     └─────────────────────────────────────┘    │
│  │  - Chunk Stats      │                                                │
│  └─────────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend                                │
│                           (Python 3.11+)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │  File Discovery  │  │ Markdown Parser  │  │    TTS Service       │   │
│  │  Service         │  │ Service          │  │                      │   │
│  │                  │  │                  │  │  ┌────────────────┐  │   │
│  │  - Scan dirs     │  │  - Parse MD      │  │  │ Sarvam AI API  │  │   │
│  │  - Extract meta  │  │  - Chunk text    │  │  │ Integration    │  │   │
│  │  - List files    │  │  - Clean syntax  │  │  └────────────────┘  │   │
│  └──────────────────┘  └──────────────────┘  │                      │   │
│                                              │  - Generate audio    │   │
│  ┌──────────────────────────────────────────┐│  - Concatenate       │   │
│  │           Configuration                   ││  - Export MP3       │   │
│  │  - Environment variables                  │└──────────────────────┘   │
│  │  - Default settings                       │                           │
│  └──────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Sarvam AI API                                   │
│                   (External TTS Service)                                 │
│                                                                          │
│  - Text-to-Speech conversion                                             │
│  - Multiple speakers & languages                                         │
│  - High-quality audio (up to 48kHz)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (React + MUI)

The frontend is built with:

- **React 18** - UI framework
- **Material-UI 5** - Component library
- **TypeScript** - Type safety
- **Zustand** - State management
- **Axios** - HTTP client
- **Vite** - Build tool

Key components:

- `App.tsx` - Main application container
- `Header.tsx` - Navigation and status
- `FileSelector.tsx` - Language and file selection
- `MarkdownViewer.tsx` - Document preview
- `SettingsPanel.tsx` - TTS configuration and generation

### Backend (FastAPI)

The backend is built with:

- **FastAPI** - Web framework
- **Pydantic** - Data validation
- **httpx** - Async HTTP client
- **pydub** - Audio processing
- **UV** - Package management

Key services:

- `file_discovery.py` - Scans translate directory for files
- `markdown_parser.py` - Parses and chunks markdown
- `tts_service.py` - Handles TTS generation

## Data Flow

### File Discovery Flow

```
1. Frontend loads → GET /api/files
2. Backend scans translate/ directory
3. Groups files by language folder
4. Extracts titles from markdown
5. Returns LanguageFiles[]
```

### Parsing Flow

```
1. User selects file → POST /api/parse
2. Backend reads markdown content
3. Parser identifies structure:
   - Headings (H1-H3)
   - Paragraphs
   - Bullet points
   - Code blocks (skipped)
4. Splits into chunks (max 2000 chars)
5. Assigns pause/loudness per chunk type
6. Returns ParsedDocument
```

### TTS Generation Flow

```
1. User clicks Generate → POST /api/tts/generate
2. Backend parses document (if not cached)
3. For each chunk:
   a. Adjust settings (pace for headings)
   b. Call Sarvam AI API
   c. Store audio in memory
   d. Report progress
4. When complete:
   a. Concatenate audio segments
   b. Apply loudness adjustments
   c. Insert pauses between chunks
   d. Export as MP3
5. Return download URL
```

## Chunking Strategy

The parser uses intelligent chunking to optimize TTS quality:

### Rules

1. **Headings** - Always separate chunks
   - H1: Max 500 chars, 800ms pause, +30% loudness
   - H2: Max 500 chars, 600ms pause, +20% loudness
   - H3: Max 500 chars, 400ms pause, +10% loudness

2. **Paragraphs** - Split at sentence boundaries
   - Max 2000 chars per chunk
   - Respects sentence endings (. ! ? ।)
   - 300ms pause between chunks

3. **Bullet Points** - Each bullet is separate
   - Max 1000 chars
   - 200ms pause after each

4. **Code Blocks** - Skipped or replaced
   - Converted to "[Code block skipped]"

### Example

Input:

```markdown
# Main Title

This is a paragraph with multiple sentences. It continues here.

- First bullet
- Second bullet

## Subheading

More content...
```

Output chunks:
| ID | Type | Text | Pause | Loudness |
|----|------|------|-------|----------|
| 0 | h1 | "Main Title" | 800ms | 1.3 |
| 1 | paragraph | "This is a paragraph..." | 300ms | 1.0 |
| 2 | bullet | "First bullet" | 200ms | 1.0 |
| 3 | bullet | "Second bullet" | 200ms | 1.0 |
| 4 | h2 | "Subheading" | 600ms | 1.2 |
| 5 | paragraph | "More content..." | 300ms | 1.0 |

## Audio Processing

### Generation

1. Call Sarvam AI for each chunk
2. Receive base64-encoded WAV audio
3. Store in memory with chunk ID

### Post-processing

1. Decode base64 to AudioSegment
2. Apply loudness boost (dB calculation)
3. Concatenate in order
4. Insert silence for pauses
5. Export to MP3 (192kbps)

### Formula

```
dB_boost = 20 * (loudness_boost - 1.0)
```

Example: 1.3 boost = +2.3 dB increase

## Error Handling

### Frontend

- API errors displayed in alerts
- Loading states for all async operations
- Graceful degradation when backend unavailable

### Backend

- HTTP status codes for API errors
- Detailed error messages in responses
- Automatic retry for transient failures

## Security Considerations

1. **API Key** - Stored server-side only
2. **File Access** - Restricted to translate directory
3. **CORS** - Configured for specific origins
4. **Input Validation** - Pydantic models for all inputs
