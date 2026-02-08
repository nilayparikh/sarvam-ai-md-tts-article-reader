"""
File Discovery Service

Automatically discovers markdown files in the translate folder
and organizes them by language.
"""
from pathlib import Path
from typing import Optional
import os

from models.schemas import FileInfo, LanguageFiles, LanguageCode
from config import get_settings


# Language folder to code mapping
LANGUAGE_MAP = {
    "hi": ("Hindi", LanguageCode.HINDI),
    "eng": ("English", LanguageCode.ENGLISH),
    "guj": ("Gujarati", LanguageCode.GUJARATI),
    "bn": ("Bengali", LanguageCode.BENGALI),
    "kn": ("Kannada", LanguageCode.KANNADA),
    "ml": ("Malayalam", LanguageCode.MALAYALAM),
    "mr": ("Marathi", LanguageCode.MARATHI),
    "od": ("Odia", LanguageCode.ODIA),
    "pa": ("Punjabi", LanguageCode.PUNJABI),
    "ta": ("Tamil", LanguageCode.TAMIL),
    "te": ("Telugu", LanguageCode.TELUGU),
}


class FileDiscoveryService:
    """
    Service to discover and list markdown files from the translate folder.
    
    Directory structure expected:
    translate/
    ├── hi/           # Hindi files
    │   ├── article-1.md
    │   └── article-2.md
    ├── eng/          # English files
    │   └── article-1.md
    └── guj/          # Gujarati files
        └── article-1.md
    """
    
    def __init__(self, translate_path: Optional[Path] = None):
        settings = get_settings()
        self.translate_path = translate_path or settings.translate_dir
    
    def discover_all_languages(self) -> list[LanguageFiles]:
        """
        Discover all languages and their files.
        
        Returns:
            List of LanguageFiles, one per language folder found
        """
        result: list[LanguageFiles] = []
        
        if not self.translate_path.exists():
            return result
        
        # Iterate through language folders
        for item in sorted(self.translate_path.iterdir()):
            if item.is_dir():
                lang_key = item.name.lower()
                
                if lang_key in LANGUAGE_MAP:
                    lang_name, lang_code = LANGUAGE_MAP[lang_key]
                else:
                    # Unknown language, use folder name
                    lang_name = item.name.title()
                    lang_code = LanguageCode.HINDI  # Default fallback
                
                files = self._discover_files_in_folder(item, lang_key)
                
                if files:  # Only include languages with files
                    result.append(LanguageFiles(
                        language=lang_name,
                        language_code=lang_code.value if isinstance(lang_code, LanguageCode) else lang_code,
                        files=files
                    ))
        
        return result
    
    def discover_files_for_language(self, language: str) -> list[FileInfo]:
        """
        Discover files for a specific language.
        
        Args:
            language: Language folder name (e.g., "hi", "eng", "guj")
            
        Returns:
            List of FileInfo for the language
        """
        lang_path = self.translate_path / language.lower()
        
        if not lang_path.exists():
            return []
        
        return self._discover_files_in_folder(lang_path, language)
    
    def _discover_files_in_folder(self, folder: Path, language: str) -> list[FileInfo]:
        """Discover markdown files in a folder."""
        files: list[FileInfo] = []
        
        for file_path in sorted(folder.glob("*.md")):
            if file_path.is_file():
                # Try to extract title from file
                title = self._extract_title(file_path)
                
                files.append(FileInfo(
                    filename=file_path.name,
                    language=language,
                    path=str(file_path),
                    size_bytes=file_path.stat().st_size,
                    title=title
                ))
        
        return files
    
    def _extract_title(self, file_path: Path) -> Optional[str]:
        """
        Extract title from markdown file (first H1 heading).
        
        Args:
            file_path: Path to the markdown file
            
        Returns:
            Title string or None if not found
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('# '):
                        return line[2:].strip()
                    # Stop after first 20 lines to avoid reading whole file
                    if f.tell() > 2000:
                        break
        except Exception:
            pass
        
        return None
    
    def get_file_content(self, file_path: str) -> str:
        """
        Get the content of a markdown file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            File content as string
        """
        path = Path(file_path)
        
        # Security check: ensure file is within translate directory
        try:
            path.resolve().relative_to(self.translate_path.resolve())
        except ValueError:
            raise ValueError(f"Access denied: File must be within translate directory")
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        return path.read_text(encoding='utf-8')
    
    def ensure_speech_output_dir(self) -> Path:
        """
        Ensure the speech output directory exists.
        
        Returns:
            Path to the speech output directory
        """
        settings = get_settings()
        output_dir = settings.speech_output_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir


def create_file_discovery_service(translate_path: Optional[Path] = None) -> FileDiscoveryService:
    """Factory function to create a FileDiscoveryService instance."""
    return FileDiscoveryService(translate_path)
