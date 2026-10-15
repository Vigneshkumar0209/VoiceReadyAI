import json
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Read the key from backend/.env (this file is never uploaded to GitHub)
ENV_PATH = Path(__file__).resolve().parent.parent / ".env.example"
load_dotenv(ENV_PATH, encoding="utf-8-sig")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        f"GEMINI_API_KEY is missing. Looked for: {ENV_PATH} (file exists: {ENV_PATH.exists()})"
    )

client = genai.Client(api_key=api_key)
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")


def _is_busy(e: Exception) -> bool:
    return any(k in str(e) for k in ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE"))


def _parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", (text or "").strip(), flags=re.M)
    return json.loads(text.strip())


def ask_json(system: str, user: str, max_tokens: int = 1500) -> dict:
    """Send a prompt to Gemini and get back a Python dictionary (JSON)."""
    config = types.GenerateContentConfig(
        system_instruction=system + "\nReturn ONLY valid JSON.",
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )
    for attempt in range(4):
        try:
            resp = client.models.generate_content(
                model=MODEL, contents=user, config=config
            )
            return _parse_json(resp.text)
        except Exception as e:
            if _is_busy(e) and attempt < 3:
                time.sleep(5 * (attempt + 1))  # wait, then retry
                continue
            raise


def transcribe_audio(audio: bytes, mime_type: str, prompt: str, max_tokens: int = 2000) -> dict:
    """Send an audio recording to Gemini and get the transcript back as JSON."""
    config = types.GenerateContentConfig(
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )
    contents = [prompt, types.Part.from_bytes(data=audio, mime_type=mime_type)]
    for attempt in range(4):
        try:
            resp = client.models.generate_content(
                model=MODEL, contents=contents, config=config
            )
            return _parse_json(resp.text)
        except Exception as e:
            if _is_busy(e) and attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise