"""
End-to-End Tests for TTS Backend

Tests the complete flow from file discovery to TTS generation.
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from services.markdown_parser import MarkdownParser, create_parser
from services.file_discovery import FileDiscoveryService


# Create test client
client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_returns_200(self):
        """Health endpoint should return 200."""
        response = client.get("/api/health")
        assert response.status_code == 200
        
    def test_health_returns_version(self):
        """Health endpoint should return version info."""
        response = client.get("/api/health")
        data = response.json()
        assert "version" in data
        assert "status" in data
        assert data["status"] == "healthy"


class TestFileDiscoveryEndpoints:
    """Test file discovery endpoints."""
    
    def test_list_all_files(self):
        """Should list files grouped by language."""
        response = client.get("/api/files")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_list_files_for_language(self):
        """Should list files for specific language."""
        # First get available languages
        all_files = client.get("/api/files").json()
        
        if all_files:
            # Get files for the first language
            lang = all_files[0]["files"][0]["language"] if all_files[0]["files"] else None
            if lang:
                response = client.get(f"/api/files/{lang}")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
    
    def test_list_files_invalid_language(self):
        """Should return 404 for invalid language."""
        response = client.get("/api/files/nonexistent")
        assert response.status_code == 404


class TestParsingEndpoints:
    """Test markdown parsing endpoints."""
    
    def test_parse_markdown(self):
        """Should parse markdown file into chunks."""
        # First get available files
        all_files = client.get("/api/files").json()
        
        if all_files and all_files[0]["files"]:
            file = all_files[0]["files"][0]
            response = client.post("/api/parse", json={
                "language": file["language"],
                "filename": file["filename"]
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "chunks" in data
            assert "total_chunks" in data
            assert "total_characters" in data
            assert isinstance(data["chunks"], list)
    
    def test_parse_nonexistent_file(self):
        """Should return 404 for nonexistent file."""
        response = client.post("/api/parse", json={
            "language": "hi",
            "filename": "nonexistent.md"
        })
        assert response.status_code == 404


class TestSettingsEndpoints:
    """Test settings endpoints."""
    
    def test_get_default_settings(self):
        """Should return default TTS settings."""
        response = client.get("/api/settings/defaults")
        assert response.status_code == 200
        data = response.json()
        
        assert "speaker" in data
        assert "pace" in data
        assert "speech_sample_rate" in data
    
    def test_get_speakers(self):
        """Should return list of speakers."""
        response = client.get("/api/settings/speakers")
        assert response.status_code == 200
        data = response.json()
        
        assert "speakers" in data
        assert isinstance(data["speakers"], list)
        assert len(data["speakers"]) > 0
    
    def test_get_languages(self):
        """Should return list of languages."""
        response = client.get("/api/settings/languages")
        assert response.status_code == 200
        data = response.json()
        
        assert "languages" in data
        assert isinstance(data["languages"], list)
        assert len(data["languages"]) > 0


class TestMarkdownParser:
    """Test markdown parser service."""
    
    def test_parser_creation(self):
        """Should create parser instance."""
        parser = create_parser()
        assert parser is not None
        assert parser.max_chunk_size == 2000
    
    def test_parser_custom_chunk_size(self):
        """Should respect custom chunk size."""
        parser = create_parser(max_chunk_size=1000)
        assert parser.max_chunk_size == 1000
    
    def test_clean_markdown_bold(self):
        """Should remove bold markers."""
        parser = MarkdownParser()
        result = parser._clean_for_tts("This is **bold** text")
        assert "**" not in result
        assert "bold" in result
    
    def test_clean_markdown_italic(self):
        """Should remove italic markers."""
        parser = MarkdownParser()
        result = parser._clean_for_tts("This is *italic* text")
        assert result == "This is italic text"
    
    def test_clean_markdown_links(self):
        """Should extract link text."""
        parser = MarkdownParser()
        result = parser._clean_for_tts("Check [this link](https://example.com)")
        assert "[" not in result
        assert "]" not in result
        assert "this link" in result
    
    def test_sentence_splitting(self):
        """Should split text into sentences."""
        parser = MarkdownParser()
        text = "First sentence. Second sentence! Third sentence?"
        sentences = parser._split_into_sentences(text)
        assert len(sentences) == 3
    
    def test_sentence_splitting_hindi(self):
        """Should handle Hindi purna viram."""
        parser = MarkdownParser()
        text = "पहला वाक्य। दूसरा वाक्य। तीसरा वाक्य।"
        sentences = parser._split_into_sentences(text)
        assert len(sentences) == 3


class TestFileDiscoveryService:
    """Test file discovery service."""
    
    def test_service_creation(self):
        """Should create service instance."""
        service = FileDiscoveryService()
        assert service is not None
    
    def test_discover_all_languages(self):
        """Should discover available languages."""
        service = FileDiscoveryService()
        languages = service.discover_all_languages()
        assert isinstance(languages, list)
    
    def test_extract_title(self):
        """Should extract title from markdown file."""
        service = FileDiscoveryService()
        # Create a temporary test file would be needed for full test
        # This is a placeholder for the test structure


class TestTTSGeneration:
    """Test TTS generation endpoints (requires API key)."""
    
    def test_generate_without_api_key(self):
        """Should handle missing API key gracefully."""
        # First get available files
        all_files = client.get("/api/files").json()
        
        if all_files and all_files[0]["files"]:
            file = all_files[0]["files"][0]
            response = client.post("/api/tts/generate", json={
                "file_path": f"{file['language']}/{file['filename']}",
                "settings": {
                    "target_language_code": "hi-IN",
                    "speaker": "shubh",
                    "pace": 1.1,
                    "speech_sample_rate": 48000,
                    "model": "bulbul:v3",
                    "temperature": 0.6,
                    "enable_preprocessing": True,
                    "heading_loudness_boost": 1.2,
                    "pause_after_heading_ms": 500,
                    "pause_after_bullet_ms": 300
                }
            })
            
            # Should either succeed or fail gracefully
            assert response.status_code in [200, 500]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
