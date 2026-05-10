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
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def _get_client(self) -> OpenAI:
        if not self.api_key:
            raise OpenAIConfigError(
                "OpenAI is not configured. Missing OPENAI_API_KEY in backend/.env."
            )
        return OpenAI(api_key=self.api_key)

    def generate_recipe_json(self, prompt: str) -> dict:
        client = self._get_client()
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Return strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            if not content:
                raise OpenAIJSONError("OpenAI returned empty content.")
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise OpenAIJSONError(f"OpenAI returned invalid JSON: {exc}")
        except OpenAIConfigError:
            raise
        except OpenAIJSONError:
            raise
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {type(exc).__name__}: {exc}")
