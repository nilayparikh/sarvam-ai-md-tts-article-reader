# English-Hindi Speech TTS Application

A comprehensive Text-to-Speech application that converts multilingual markdown documents to high-quality speech using Sarvam AI.

## 🎯 Features

- **Smart Markdown Parsing**: Intelligently parses markdown structure (headings, paragraphs, bullet points)
- **Chunking Strategy**: Respects 2000 character limit while maintaining semantic boundaries
- **Multi-Language Support**: Auto-discovers files from translate folder (English, Hindi, Gujarati)
- **High-Quality Audio**: 48kHz sample rate with adjustable settings
- **Structure-Aware TTS**: Different loudness/pace for headings vs content
- **Modern UI**: Glass-morphism design with MUI components (70:30 split layout)
- **Preview & Export**: Real-time audio preview and MP3 export

## 🏗️ Architecture

```
eng_hi_speech/
├── src/
│   ├── backend/          # Python FastAPI backend
│   │   ├── main.py       # FastAPI application
│   │   ├── services/
│   │   │   ├── markdown_parser.py
│   │   │   ├── tts_service.py
│   │   │   └── file_discovery.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── tests/
│   │       └── test_e2e.py
│   └── frontend/         # React + MUI frontend
│       ├── src/
│       │   ├── components/
│       │   ├── services/
│       │   └── App.tsx
│       └── package.json
├── pipeline/
│   ├── translate/        # Source markdown files
│   │   ├── eng/
│   │   ├── hi/
│   │   └── guj/
│   └── speech/          # Generated MP3 output
└── docs/                # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- UV package manager

### Backend Setup

```bash
cd src/backend
uv venv
uv pip install -r requirements.txt
# Set your Sarvam AI API key
export SARVAM_API_KEY="your-api-key"
uv run uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd src/frontend
npm install
npm run dev
```

## 📖 API Documentation

### Endpoints

| Method | Endpoint                | Description                       |
| ------ | ----------------------- | --------------------------------- |
| GET    | `/api/files`            | List all available markdown files |
| GET    | `/api/files/{language}` | List files for specific language  |
| POST   | `/api/parse`            | Parse markdown and return chunks  |
| POST   | `/api/tts/generate`     | Generate TTS for chunks           |
| GET    | `/api/tts/preview/{id}` | Preview generated audio           |
| POST   | `/api/tts/export`       | Export full MP3                   |

### TTS Settings

```json
{
  "target_language_code": "hi-IN",
  "speaker": "shubh",
  "pace": 1.1,
  "speech_sample_rate": 48000,
  "model": "bulbul:v3",
  "temperature": 0.6,
  "heading_loudness_boost": 1.2,
  "pause_after_heading_ms": 500,
  "pause_after_bullet_ms": 300
}
```

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  📄 Sarvam TTS Document Reader                          │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│  [Language Selector] [File List]  │  ⚙️ Settings        │
│                                   │                     │
│  ┌─────────────────────────────┐  │  Speaker: [____]    │
│  │                             │  │  Pace: [1.1]        │
│  │  Rendered Markdown          │  │  Sample Rate: 48k   │
│  │  Preview                    │  │  Temperature: [0.6] │
│  │                             │  │                     │
│  │  # Heading                  │  │  [Generate TTS] 🎵  │
│  │  Paragraph text...          │  │                     │
│  │  • Bullet point             │  │  ┌───────────────┐  │
│  │                             │  │  │ Audio Preview │  │
│  └─────────────────────────────┘  │  │ ▶️ 00:00/02:30 │  │
│                                   │  └───────────────┘  │
│  70%                              │  30%                │
└───────────────────────────────────┴─────────────────────┘
```

## 📊 Chunking Strategy

The parser follows these rules for optimal TTS:

1. **Headings**: Extracted separately with boosted loudness
2. **Paragraphs**: Split at sentence boundaries, max 2000 chars
3. **Bullet Points**: Each bullet as separate chunk with pause
4. **Code Blocks**: Skipped or read as "code block"
5. **Bold/Italic**: Preserved for emphasis detection

### Chunk Types

| Type      | Max Length | Pause After | Loudness |
| --------- | ---------- | ----------- | -------- |
| H1        | 500        | 800ms       | +30%     |
| H2        | 500        | 600ms       | +20%     |
| H3        | 500        | 400ms       | +10%     |
| Paragraph | 2000       | 300ms       | Normal   |
| Bullet    | 1000       | 200ms       | Normal   |

## 🔧 Configuration

### Environment Variables

```env
SARVAM_API_KEY=your-api-key
SARVAM_BASE_URL=https://api.sarvam.ai
MAX_CHUNK_SIZE=2000
DEFAULT_SAMPLE_RATE=48000
DEFAULT_SPEAKER=shubh
```

## 🧪 Testing

```bash
# Run E2E tests
cd src/backend
uv run pytest tests/ -v

# Run frontend tests
cd src/frontend
npm test
```

## 📝 License

MIT License
