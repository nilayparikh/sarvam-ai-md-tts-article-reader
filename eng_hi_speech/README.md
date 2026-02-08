# Sarvam TTS - Experimental Playground

---

### 📺 Video Player

<video src="./docs/assets/video/sarvam_ai_article_tts.mp4" controls width="100%"></video>

### 🎙️ Audio Player

<audio src="./docs/assets/audio/artilce-1a_20260208_210622.mp3" controls></audio>

---

> [!WARNING]
> **NOT FOR PRODUCTION**: This is a playground project for experimentation and fun. Use at your own risk.

A hobbyist Text-to-Speech (TTS) application that converts Hindi markdown documents to speech using the Sarvam AI `bulbul:v3` model.

### 📄 Demo Content

This experiment demonstrates the translation of the paper review:
**["Beyond the Transformer: Google’s “Nested Learning” and the Physics of Intelligence"](https://blog.nilayparikh.com/beyond-the-transformer-googles-nested-learning-and-the-physics-of-intelligence-610f143c945a)**
Published by [**Nilay Parikh**](https://blog.nilayparikh.com/).

## 🌟 Playground Vision

This tool is a playground for testing article-to-speech conversion. It's meant to be a fun way to explore:

- **Article Structure**: Headings, titles, and paragraphs.
- **Lists**: Bullet points and numbered lists with natural pacing.
- **Languages**: Deep support for Hindi and future extensions for dialects like Gujarati.

## Features

- **Markdown Parsing**: Parse markdown files into TTS-optimized chunks
- **File Selection**: Browse and select files from the translate directory
- **File Upload**: Upload markdown files directly for processing
- **Smart Chunking**: Intelligent chunking with max 2000 characters, respecting sentence boundaries
- **TTS Settings**: Configurable speaker, pace, sample rate (48kHz), and more
- **Audio Preview**: Preview generated audio directly in the browser
- **API Statistics**: Detailed summary of API calls, bytes sent/received, response times
- **Save Option**: Optionally save uploaded files to the translate directory

## Project Structure

```
eng_hi_speech/
├── .vscode/                  # VS Code launch and task configurations
│   ├── launch.json           # Debug configurations
│   └── tasks.json            # Build tasks
├── docs/                     # Documentation
│   ├── API.md                # API reference
│   ├── ARCHITECTURE.md       # System architecture
│   ├── README.md             # Detailed documentation
│   └── SETUP.md              # Setup instructions
├── pipeline/
│   ├── speech/               # Generated audio output (MP3/WAV)
│   └── translate/            # Source markdown files
│       ├── eng/
│       ├── guj/
│       └── hi/               # Hindi markdown files
├── src/
│   ├── backend/              # FastAPI Python backend
│   │   ├── models/           # Pydantic models
│   │   ├── services/         # Business logic
│   │   ├── tests/            # Backend tests
│   │   ├── config.py         # Configuration
│   │   ├── main.py           # FastAPI app
│   │   └── pyproject.toml    # Python dependencies
│   └── frontend/             # React TypeScript frontend
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── services/     # API service
│       │   ├── store/        # Zustand state
│       │   └── types.ts      # TypeScript types
│       ├── tests/            # Playwright E2E tests
│       └── package.json      # Node dependencies
└── README.md                 # This file
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [UV](https://github.com/astral-sh/uv) package manager
- Sarvam AI API key

### 1. Clone and Setup Backend

```bash
cd eng_hi_speech/src/backend

# Create virtual environment and install dependencies
uv venv
uv sync

# Configure API key
cp .env.example .env
# Edit .env and add your SARVAM_API_KEY
```

### 2. Setup Frontend

```bash
cd eng_hi_speech/src/frontend

# Install dependencies
npm install
```

### 3. Run the Application

#### Option A: Using VS Code (Recommended)

1. Open the `eng_hi_speech` folder in VS Code
2. Press `F5` or go to Run → Start Debugging
3. Select "Full Stack: Backend + Frontend" to run both servers

#### Option B: Using Terminal

**Terminal 1 - Backend:**

```bash
cd eng_hi_speech/src/backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**

```bash
cd eng_hi_speech/src/frontend
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Usage

### Select File Mode

1. Choose a language from the dropdown (e.g., Hindi)
2. Select a markdown file from the list
3. Preview the parsed content
4. Adjust TTS settings (speaker, pace, etc.)
5. Click "Generate TTS" to create audio
6. Preview and download the generated MP3

### Upload File Mode

1. Click "Upload File" toggle
2. Choose a markdown file from your computer
3. Optionally check "Save to translate directory" to persist the file
4. Generate and download the audio

### API Statistics

After generation completes, the summary card shows:

- Total API calls made
- Characters and bytes sent/received
- Response times
- Success/failure counts

## Configuration

### Backend (.env)

```env
SARVAM_API_KEY=your-api-key-here
SARVAM_BASE_URL=https://api.sarvam.ai

# Paths (relative to workspace root)
TRANSLATE_DIR=../../../pipeline/translate
SPEECH_OUTPUT_DIR=../../../pipeline/speech

# Defaults
DEFAULT_SPEAKER=shubh
DEFAULT_PACE=1.1
DEFAULT_SAMPLE_RATE=48000
DEFAULT_MODEL=bulbul:v3
```

### Available Speakers

| Speaker  | Gender |
| -------- | ------ |
| shubh    | Male   |
| arvind   | Male   |
| meera    | Female |
| pavithra | Female |
| maitreyi | Female |
| amol     | Male   |
| amartya  | Male   |

## Testing

### Backend Tests

```bash
cd eng_hi_speech/src/backend
.venv\Scripts\python.exe -m pytest tests/ -v
```

### Frontend E2E Tests

```bash
cd eng_hi_speech/src/frontend
npx playwright install  # First time only
npx playwright test
```

### Run Tests with UI

```bash
npx playwright test --ui
```

## API Endpoints

| Method | Endpoint                   | Description                     |
| ------ | -------------------------- | ------------------------------- |
| GET    | /api/health                | Health check                    |
| GET    | /api/files                 | List all files by language      |
| GET    | /api/files/{language}      | List files for a language       |
| POST   | /api/files/upload          | Upload a markdown file          |
| POST   | /api/files/write           | Save markdown to translate dir  |
| POST   | /api/parse                 | Parse a markdown file           |
| POST   | /api/parse/content         | Parse markdown content directly |
| POST   | /api/tts/generate          | Generate TTS for a document     |
| GET    | /api/tts/summary/{job_id}  | Get API call statistics         |
| POST   | /api/tts/export            | Export audio as MP3/WAV         |
| GET    | /api/tts/download/{job_id} | Download audio file             |

## Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **httpx** - Async HTTP client
- **pydub** - Audio processing
- **UV** - Fast Python package manager

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI 5** - Component library
- **Vite** - Build tool
- **Zustand** - State management
- **Axios** - HTTP client
- **Playwright** - E2E testing

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

For issues or questions, please open a GitHub issue.
