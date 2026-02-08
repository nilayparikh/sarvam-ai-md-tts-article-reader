"""
Markdown Parser Service

Parses markdown documents into structured chunks optimized for TTS.
Handles headings, paragraphs, bullet points with appropriate settings.
"""
import re
from pathlib import Path
from typing import Optional
from models.schemas import (
    ChunkType,
    ContentChunk,
    ParsedDocument,
)
from config import get_settings


class MarkdownParser:
    """
    Parses markdown files into TTS-optimized chunks.

    Features:
    - Structure-aware parsing (headings, paragraphs, bullets)
    - Smart chunking respecting semantic boundaries
    - Configurable max chunk size (default 2000 chars)
    - Loudness and pause settings per chunk type
    """

    def __init__(self, max_chunk_size: int = 2000):
        self.max_chunk_size = max_chunk_size
        self.settings = get_settings()

        # Regex patterns for markdown elements
        self.patterns = {
            'h1': re.compile(r'^#\s+(.+)$', re.MULTILINE),
            'h2': re.compile(r'^##\s+(.+)$', re.MULTILINE),
            'h3': re.compile(r'^###\s+(.+)$', re.MULTILINE),
            'h4': re.compile(r'^####\s+(.+)$', re.MULTILINE),
            'bullet': re.compile(r'^[\*\-\+]\s+(.+)$', re.MULTILINE),
            'numbered': re.compile(r'^\d+\.\s+(.+)$', re.MULTILINE),
            'code_block': re.compile(r'```[\s\S]*?```', re.MULTILINE),
            'inline_code': re.compile(r'`[^`]+`'),
            'bold': re.compile(r'\*\*([^*]+)\*\*'),
            'italic': re.compile(r'\*([^*]+)\*'),
            'link': re.compile(r'\[([^\]]+)\]\([^)]+\)'),
            'image': re.compile(r'!\[([^\]]*)\]\([^)]+\)'),
            'blockquote': re.compile(r'^>\s+(.+)$', re.MULTILINE),
            'horizontal_rule': re.compile(r'^---+$|^\*\*\*+$|^___+$', re.MULTILINE),
        }

    def parse_file(self, file_path: str | Path, language: str = "hi") -> ParsedDocument:
        """
        Parse a markdown file into a structured document with chunks.

        Args:
            file_path: Path to the markdown file
            language: Language code (hi, eng, guj)

        Returns:
            ParsedDocument with chunks ready for TTS
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        content = file_path.read_text(encoding='utf-8')
        filename = file_path.name

        # Parse into chunks
        chunks = self._parse_content(content)

        # Extract title (first H1)
        title = None
        for chunk in chunks:
            if chunk.type == ChunkType.HEADING_H1:
                title = chunk.text
                break

        # Calculate totals
        total_chars = sum(c.char_count for c in chunks)

        # Estimate duration (rough: ~150 words per minute, ~5 chars per word)
        estimated_duration = (total_chars / 5) / 150 * 60

        return ParsedDocument(
            filename=filename,
            language=language,
            title=title,
            chunks=chunks,
            total_chunks=len(chunks),
            total_characters=total_chars,
            estimated_duration_seconds=estimated_duration
        )

    def parse_content(self, content: str, filename: str = "uploaded.md", language: str = "hi") -> ParsedDocument:
        """
        Parse markdown content directly (without file).

        Args:
            content: Markdown content string
            filename: Virtual filename for the document
            language: Language code (hi, eng, guj)

        Returns:
            ParsedDocument with chunks ready for TTS
        """
        # Parse into chunks
        chunks = self._parse_content(content)

        # Extract title (first H1)
        title = None
        for chunk in chunks:
            if chunk.type == ChunkType.HEADING_H1:
                title = chunk.text
                break

        # Calculate totals
        total_chars = sum(c.char_count for c in chunks)

        # Estimate duration (rough: ~150 words per minute, ~5 chars per word)
        estimated_duration = (total_chars / 5) / 150 * 60

        return ParsedDocument(
            filename=filename,
            language=language,
            title=title,
            chunks=chunks,
            total_chunks=len(chunks),
            total_characters=total_chars,
            estimated_duration_seconds=estimated_duration
        )

    def _parse_content(self, content: str) -> list[ContentChunk]:
        """
        Parse markdown content into chunks.

        Strategy:
        1. Split by double newlines to get blocks
        2. Identify block types (heading, paragraph, bullet, etc.)
        3. Clean markdown syntax for TTS
        4. Split long content respecting sentence boundaries
        """
        chunks: list[ContentChunk] = []
        chunk_id = 0

        # Remove code blocks first (we'll skip them or add placeholder)
        content_no_code = self.patterns['code_block'].sub('[Code block skipped]', content)

        # Split into blocks by double newlines
        blocks = re.split(r'\n\s*\n', content_no_code)

        for block in blocks:
            block = block.strip()
            if not block:
                continue

            # Identify block type and process
            block_chunks = self._process_block(block, chunk_id)

            for chunk in block_chunks:
                chunks.append(chunk)
                chunk_id += 1

        return chunks

    def _process_block(self, block: str, start_id: int) -> list[ContentChunk]:
        """Process a single block of content."""
        chunks: list[ContentChunk] = []
        current_id = start_id

        # Check for headings
        for level, (pattern_key, chunk_type) in enumerate([
            ('h1', ChunkType.HEADING_H1),
            ('h2', ChunkType.HEADING_H2),
            ('h3', ChunkType.HEADING_H3),
        ], start=1):
            match = self.patterns[pattern_key].match(block)
            if match:
                text = self._clean_for_tts(match.group(1))
                chunks.append(self._create_heading_chunk(
                    current_id, text, block, chunk_type
                ))
                return chunks

        # Check for bullet points (may have multiple in one block)
        if self.patterns['bullet'].search(block) or self.patterns['numbered'].search(block):
            lines = block.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                bullet_match = self.patterns['bullet'].match(line)
                numbered_match = self.patterns['numbered'].match(line)

                if bullet_match:
                    text = self._clean_for_tts(bullet_match.group(1))
                    chunks.append(self._create_bullet_chunk(current_id, text, line))
                    current_id += 1
                elif numbered_match:
                    text = self._clean_for_tts(numbered_match.group(1))
                    chunks.append(self._create_bullet_chunk(current_id, text, line))
                    current_id += 1
            return chunks

        # Check for blockquote
        if self.patterns['blockquote'].match(block):
            lines = block.split('\n')
            quote_text = ' '.join(
                self.patterns['blockquote'].match(line).group(1) if self.patterns['blockquote'].match(line) else line
                for line in lines if line.strip()
            )
            text = self._clean_for_tts(quote_text)
            chunks.extend(self._create_paragraph_chunks(current_id, text, block))
            return chunks

        # Default: paragraph
        text = self._clean_for_tts(block)
        chunks.extend(self._create_paragraph_chunks(current_id, text, block))

        return chunks

    def _create_heading_chunk(
        self,
        chunk_id: int,
        text: str,
        raw_text: str,
        chunk_type: ChunkType
    ) -> ContentChunk:
        """Create a heading chunk with appropriate settings."""
        settings = get_settings()

        if chunk_type == ChunkType.HEADING_H1:
            loudness = settings.heading_h1_loudness_boost
            pause = settings.pause_after_h1_ms
        elif chunk_type == ChunkType.HEADING_H2:
            loudness = settings.heading_h2_loudness_boost
            pause = settings.pause_after_h2_ms
        else:
            loudness = settings.heading_h3_loudness_boost
            pause = settings.pause_after_h3_ms

        return ContentChunk(
            id=chunk_id,
            type=chunk_type,
            text=text,
            raw_text=raw_text,
            char_count=len(text),
            pause_after_ms=pause,
            loudness_boost=loudness
        )

    def _create_bullet_chunk(
        self,
        chunk_id: int,
        text: str,
        raw_text: str
    ) -> ContentChunk:
        """Create a bullet point chunk."""
        return ContentChunk(
            id=chunk_id,
            type=ChunkType.BULLET,
            text=text,
            raw_text=raw_text,
            char_count=len(text),
            pause_after_ms=self.settings.pause_after_bullet_ms,
            loudness_boost=1.0
        )

    def _create_paragraph_chunks(
        self,
        start_id: int,
        text: str,
        raw_text: str
    ) -> list[ContentChunk]:
        """
        Create paragraph chunks, splitting if necessary.

        Respects max_chunk_size while trying to split at sentence boundaries.
        """
        chunks: list[ContentChunk] = []
        current_id = start_id

        if len(text) <= self.max_chunk_size:
            chunks.append(ContentChunk(
                id=current_id,
                type=ChunkType.PARAGRAPH,
                text=text,
                raw_text=raw_text,
                char_count=len(text),
                pause_after_ms=self.settings.pause_after_paragraph_ms,
                loudness_boost=1.0
            ))
            return chunks

        # Need to split - try sentence boundaries first
        sentences = self._split_into_sentences(text)
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # If single sentence exceeds limit, split by characters
            if len(sentence) > self.max_chunk_size:
                if current_chunk:
                    chunks.append(ContentChunk(
                        id=current_id,
                        type=ChunkType.PARAGRAPH,
                        text=current_chunk.strip(),
                        raw_text=current_chunk.strip(),
                        char_count=len(current_chunk.strip()),
                        pause_after_ms=self.settings.pause_after_paragraph_ms,
                        loudness_boost=1.0
                    ))
                    current_id += 1
                    current_chunk = ""

                # Split long sentence
                for i in range(0, len(sentence), self.max_chunk_size):
                    part = sentence[i:i + self.max_chunk_size]
                    chunks.append(ContentChunk(
                        id=current_id,
                        type=ChunkType.PARAGRAPH,
                        text=part,
                        raw_text=part,
                        char_count=len(part),
                        pause_after_ms=self.settings.pause_after_paragraph_ms,
                        loudness_boost=1.0
                    ))
                    current_id += 1
                continue

            # Check if adding sentence exceeds limit
            test_chunk = f"{current_chunk} {sentence}".strip()
            if len(test_chunk) > self.max_chunk_size:
                if current_chunk:
                    chunks.append(ContentChunk(
                        id=current_id,
                        type=ChunkType.PARAGRAPH,
                        text=current_chunk.strip(),
                        raw_text=current_chunk.strip(),
                        char_count=len(current_chunk.strip()),
                        pause_after_ms=self.settings.pause_after_paragraph_ms,
                        loudness_boost=1.0
                    ))
                    current_id += 1
                current_chunk = sentence
            else:
                current_chunk = test_chunk

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(ContentChunk(
                id=current_id,
                type=ChunkType.PARAGRAPH,
                text=current_chunk.strip(),
                raw_text=current_chunk.strip(),
                char_count=len(current_chunk.strip()),
                pause_after_ms=self.settings.pause_after_paragraph_ms,
                loudness_boost=1.0
            ))

        return chunks

    def _split_into_sentences(self, text: str) -> list[str]:
        """
        Split text into sentences.

        Handles:
        - Standard punctuation (. ! ?)
        - Hindi Purna Viram (।)
        - Abbreviations and numbers
        """
        # Pattern for sentence endings
        # Includes period, exclamation, question mark, and Hindi purna viram
        pattern = r'(?<=[.!?।])\s+'
        sentences = re.split(pattern, text)
        return [s.strip() for s in sentences if s.strip()]

    def _clean_for_tts(self, text: str) -> str:
        """
        Clean markdown syntax for TTS reading.

        Removes/converts:
        - Bold/italic markers
        - Links (keeps text)
        - Images (mentions alt text)
        - Inline code (reads as is)
        - Special characters
        """
        # Remove bold markers
        text = self.patterns['bold'].sub(r'\1', text)

        # Remove italic markers
        text = self.patterns['italic'].sub(r'\1', text)

        # Replace links with just the text
        text = self.patterns['link'].sub(r'\1', text)

        # Replace images with alt text or skip
        text = self.patterns['image'].sub(lambda m: m.group(1) if m.group(1) else '', text)

        # Remove inline code backticks
        text = self.patterns['inline_code'].sub(lambda m: m.group(0)[1:-1], text)

        # Remove horizontal rules
        text = self.patterns['horizontal_rule'].sub('', text)

        # Clean up multiple spaces
        text = re.sub(r'\s+', ' ', text)

        # Clean up special markdown characters
        text = text.replace('\\', '')

        return text.strip()


def create_parser(max_chunk_size: Optional[int] = None) -> MarkdownParser:
    """Factory function to create a parser instance."""
    settings = get_settings()
    size = max_chunk_size or settings.max_chunk_size
    return MarkdownParser(max_chunk_size=size)
