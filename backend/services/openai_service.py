"""OpenAI service wrapper for recipe JSON generation."""

import json
import os

from openai import OpenAI


class OpenAIConfigError(Exception):
    """Raised when OpenAI configuration is missing."""


class OpenAIJSONError(Exception):
    """Raised when OpenAI response is not valid JSON."""


class OpenAIService:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    def _get_client(self) -> OpenAI:
        if not self.api_key:
            raise OpenAIConfigError(
                "OpenAI is not configured. Missing OPENAI_API_KEY in backend/.env."
            )
        return OpenAI(api_key=self.api_key)

    def generate_recipe_json(self, prompt: str) -> dict:
        client = self._get_client()
        try:
            response = client.responses.create(
                model="gpt-4.1-mini",
                input=prompt,
                text={"format": {"type": "json_object"}},
            )
            content = response.output_text
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise OpenAIJSONError(f"OpenAI returned invalid JSON: {exc}")
        except OpenAIConfigError:
            raise
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {type(exc).__name__}: {exc}")
