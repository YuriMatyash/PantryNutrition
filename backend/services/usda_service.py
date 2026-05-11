"""USDA FoodData Central service wrapper."""

import os
from typing import Optional

import requests


class USDAConfigError(Exception):
    """Raised when USDA configuration is missing."""


class USDAServiceError(Exception):
    """Raised when USDA service request fails."""


class USDAService:
    BASE_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

    def __init__(self) -> None:
        self.api_key = os.getenv("USDA_API_KEY", "")

    def _ensure_config(self) -> None:
        if not self.api_key:
            raise USDAConfigError("USDA is not configured. Missing USDA_API_KEY in backend/.env.")

    def _extract_nutrients(self, nutrients: list[dict]) -> dict:
        by_number = {}
        for nutrient in nutrients:
            key = str(nutrient.get("nutrientNumber", ""))
            if key:
                by_number[key] = nutrient.get("value", 0)

        return {
            "calories": float(by_number.get("208", 0) or 0),
            "protein_g": float(by_number.get("203", 0) or 0),
            "carbs_g": float(by_number.get("205", 0) or 0),
            "fat_g": float(by_number.get("204", 0) or 0),
            "fiber_g": float(by_number.get("291", 0) or 0),
            "sugar_g": float(by_number.get("269", 0) or 0),
            "sodium_mg": float(by_number.get("307", 0) or 0),
        }

    def search_best_match(self, ingredient_name: str) -> Optional[dict]:
        self._ensure_config()
        params = {
            "api_key": self.api_key,
            "query": ingredient_name,
            "pageSize": 10,
        }

        try:
            response = requests.get(self.BASE_URL, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise USDAServiceError(f"USDA request failed: {exc}")

        foods = data.get("foods", [])
        if not foods:
            return None

        # Prefer non-branded/generic foods.
        preferred = sorted(
            foods,
            key=lambda f: 1 if str(f.get("dataType", "")).lower() == "branded" else 0,
        )
        best = preferred[0]

        return {
            "fdc_id": best.get("fdcId"),
            "description": best.get("description", ingredient_name),
            "data_type": best.get("dataType", ""),
            "per_100g": self._extract_nutrients(best.get("foodNutrients", [])),
        }
