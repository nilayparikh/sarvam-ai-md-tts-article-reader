# Sarvam AI Playground

This repository contains a collection of playground projects and experiments with **Sarvam AI** APIs.

> [!WARNING]
> **Experimental Project**: These are experiments and fun projects. They are not intended for production use and may contain bugs or breaking changes.
>
> 🚀 **Updates & Future**: I am developing this into a handy tool for any Indic language TTS (supporting Sarvam AI and a **free local Hindi TTS** that runs without an API key).
>
> Follow for updates: [**X (Twitter)**](https://x.com/nilayparikh) | [**LinkedIn**](https://www.linkedin.com/in/niparikh/)

## Playground Vision: The AI Article Reader Experiment

The goal of this fun initiative is to experiment with building an **AI Article Reader** capable of transforming structured content into audio. This is a work-in-progress to see how well we can handle:

- **Headings & Subheadings**: Providing natural pauses and emphasis for structure.
- **Lists & Numbered Lists**: Narrating items in a way that preserves the list context.
- **Phrases & Paragraphs**: Handling long-form content with human-like prosody.
- **Dialect Support**: Supporting multiple Indian languages (Hindi, Gujarati, etc.) with regional nuances.

---

## 🚀 Projects

### 🎙️ English to Hindi Speech Lab (`eng_hi_speech`)

A playground implementation that tries to parse structured Markdown articles and converts them into Hindi speech using Sarvam AI's `bulbul:v3` model.

**Demo Article:** This experiment features the translation of [**"Beyond the Transformer: Google’s “Nested Learning” and the Physics of Intelligence"**](https://blog.nilayparikh.com/beyond-the-transformer-googles-nested-learning-and-the-physics-of-intelligence-610f143c945a) by [Nilay Parikh](https://blog.nilayparikh.com/).

**Key Features (Experimental):**

- Markdown parsing to maintain article structure.
- Real-time TTS generation progress tracking.
- Modern React-based UI with "Glassmorphism" design.
- Throttled API handling and robust backend logging.

[Explore Example 1: English-Hindi Speech Pipeline](./eng_hi_speech/README.md)

---

## 🎥 Demos & Samples

### 📺 Video Demonstration

<video src="./eng_hi_speech/docs/assets/video/sarvam_ai_article_tts.mp4" controls width="100%" type="video/mp4"></video>

### 🎙️ Audio Sample (Playground Output)

<audio src="./eng_hi_speech/docs/assets/audio/artilce-1a_20260208_210622.mp3" controls></audio>

---

## Connect

Follow **@nilayparikh** for updates:

- **X (Twitter)**: [@nilayparikh](https://x.com/nilayparikh)
- **LinkedIn**: [niparikh](https://www.linkedin.com/in/niparikh/)
