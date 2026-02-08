"""
Configuration settings for the TTS backend application.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Sarvam AI Configuration
    sarvam_api_key: str = Field(default="", env="SARVAM_API_KEY")
    sarvam_base_url: str = Field(default="https://api.sarvam.ai", env="SARVAM_BASE_URL")
    
    # TTS Defaults
    default_sample_rate: int = Field(default=48000, env="DEFAULT_SAMPLE_RATE")
    default_speaker: str = Field(default="shubh", env="DEFAULT_SPEAKER")
    default_pace: float = Field(default=1.1, env="DEFAULT_PACE")
    default_temperature: float = Field(default=0.6, env="DEFAULT_TEMPERATURE")
    default_model: str = Field(default="bulbul:v3", env="DEFAULT_MODEL")
    
    # Chunking Configuration
    max_chunk_size: int = Field(default=2000, env="MAX_CHUNK_SIZE")
    max_sentence_length: int = Field(default=500, env="MAX_SENTENCE_LENGTH")
    
    # Paths
    translate_path: str = Field(default="../../pipeline/translate", env="TRANSLATE_PATH")
    speech_output_path: str = Field(default="../../pipeline/speech", env="SPEECH_OUTPUT_PATH")
    
    # CORS
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:3000", env="CORS_ORIGINS")
    
    # TTS Enhancement Settings
    heading_h1_loudness_boost: float = 1.3
    heading_h2_loudness_boost: float = 1.2
    heading_h3_loudness_boost: float = 1.1
    
    pause_after_h1_ms: int = 800
    pause_after_h2_ms: int = 600
    pause_after_h3_ms: int = 400
    pause_after_paragraph_ms: int = 300
    pause_after_bullet_ms: int = 200
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
    
    @property
    def translate_dir(self) -> Path:
        """Get absolute path to translate directory."""
        base = Path(__file__).parent
        return (base / self.translate_path).resolve()
    
    @property
    def speech_output_dir(self) -> Path:
        """Get absolute path to speech output directory."""
        base = Path(__file__).parent
        return (base / self.speech_output_path).resolve()
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
