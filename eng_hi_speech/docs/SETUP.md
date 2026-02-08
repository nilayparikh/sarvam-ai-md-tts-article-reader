# Setup and Development Guide

This guide covers setting up the development environment and running the TTS application.

## Prerequisites

- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **UV** - Python package manager
- **Sarvam AI API Key** - For TTS generation

## Installation

### 1. Clone and Navigate

```powershell
cd Y:\.sources\blogs\servam_ai\eng_hi_speech
```

### 2. Backend Setup

```powershell
# Navigate to backend
cd src/backend

# Create virtual environment with UV
uv venv

# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
uv pip install -e .

# Or install from pyproject.toml
uv pip install -r pyproject.toml
```

### 3. Configure Environment

```powershell
# Copy example env file
Copy-Item .env.example .env

# Edit .env and add your Sarvam AI API key
notepad .env
```

Set these values in `.env`:

```env
SARVAM_API_KEY=your-actual-api-key
```

### 4. Frontend Setup

```powershell
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**

```powershell
cd src/backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**

```powershell
cd src/frontend
npm run dev
```

Access the application at: http://localhost:5173

### Production Build

**Backend:**

```powershell
cd src/backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**

```powershell
cd src/frontend
npm run build
npm run preview
```

## Adding Content

### Add New Language

1. Create folder in `pipeline/translate/`

   ```powershell
   mkdir pipeline/translate/ta  # Tamil
   ```

2. Add markdown files to the folder

3. The app will auto-discover new languages

### Markdown Format

For best TTS results, structure your markdown:

```markdown
# Main Title

Introduction paragraph explaining the topic.

## Section Heading

Content under the section. Keep paragraphs focused.

- Bullet point 1
- Bullet point 2
- Bullet point 3

### Subsection

More detailed content here.
```

## Testing

### Backend Tests

```powershell
cd src/backend
uv run pytest tests/ -v
```

### Frontend Tests

```powershell
cd src/frontend

# Unit tests
npm test

# E2E tests (requires backend running)
npx playwright install
npm run test:e2e
```

## Troubleshooting

### Common Issues

**"SARVAM_API_KEY not configured"**

- Check `.env` file exists in `src/backend/`
- Verify API key is correct
- Restart the backend server

**"No files found in translate directory"**

- Verify `pipeline/translate/` has language folders
- Add `.md` files to language folders
- Check file permissions

**"Failed to connect to backend"**

- Ensure backend is running on port 8000
- Check terminal for backend errors
- Verify CORS settings in `config.py`

**"Audio generation failed"**

- Check Sarvam AI API key validity
- Verify internet connection
- Check chunk size (max 2000 characters)

### Debug Mode

Enable debug logging:

```python
# In main.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

## API Key

Get your Sarvam AI API key:

1. Visit https://sarvam.ai
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy to your `.env` file

## File Structure

```
eng_hi_speech/
├── docs/                    # Documentation
│   ├── README.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── SETUP.md
├── pipeline/
│   ├── translate/          # Source markdown files
│   │   ├── eng/
│   │   ├── hi/
│   │   └── guj/
│   └── speech/            # Generated audio output
├── src/
│   ├── backend/
│   │   ├── main.py        # FastAPI app
│   │   ├── config.py      # Configuration
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── tests/         # Backend tests
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx    # Main component
│       │   ├── components/
│       │   ├── services/  # API client
│       │   └── store/     # Zustand store
│       └── tests/         # E2E tests
└── run.ps1               # Quick start script
```
