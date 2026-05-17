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
    DEFAULT_TIMEOUT_SECONDS = 20
    DEFAULT_PAGE_SIZE = 10
    DEFAULT_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]

    def __init__(self) -> None:
        self.api_key = os.getenv("USDA_API_KEY", "")

    def _ensure_config(self) -> None:
        if not self.api_key:
            raise USDAConfigError("USDA is not configured. Missing USDA_API_KEY in backend/.env.")

    def _safe_response_preview(self, response: requests.Response) -> str:
        """Return a tiny sanitized snippet for local backend debugging only."""
        text = (response.text or "").replace(self.api_key, "[REDACTED]")
        return text[:200]

    def _status_error_message(self, status_code: int) -> str:
        if status_code in (401, 403):
            return "USDA API key was rejected. Check USDA_API_KEY."
        if status_code == 404:
            return "USDA endpoint returned 404. Check endpoint URL or request method."
        if status_code == 429:
            return "USDA rate limit reached. Try again later."
        return f"USDA request failed with status {status_code}."

    def _extract_nutrients(self, nutrients: list[dict]) -> dict:
        values = {
            "calories": 0.0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
            "fiber_g": 0.0,
            "sugar_g": 0.0,
            "sodium_mg": 0.0,
        }

        number_map = {
            "208": "calories",
            "203": "protein_g",
            "205": "carbs_g",
            "204": "fat_g",
            "291": "fiber_g",
            "269": "sugar_g",
            "307": "sodium_mg",
        }
        id_map = {
            1008: "calories",
            1003: "protein_g",
            1005: "carbs_g",
            1004: "fat_g",
            1079: "fiber_g",
            2000: "sugar_g",
            1093: "sodium_mg",
        }
        name_map = {
            "energy": "calories",
            "calories": "calories",
            "protein": "protein_g",
            "carbohydrate": "carbs_g",
            "carbohydrate, by difference": "carbs_g",
            "fat": "fat_g",
            "total lipid (fat)": "fat_g",
            "fiber": "fiber_g",
            "fiber, total dietary": "fiber_g",
            "sugars": "sugar_g",
            "sugars, total including nlea": "sugar_g",
            "sodium": "sodium_mg",
            "sodium, na": "sodium_mg",
        }

        for nutrient in nutrients:
            raw_value = nutrient.get("value")
            if raw_value in (None, ""):
                continue
            try:
                value = float(raw_value)
            except (TypeError, ValueError):
                continue

            target = None
            nutrient_number = str(nutrient.get("nutrientNumber", "")).strip()
            if nutrient_number and nutrient_number in number_map:
                target = number_map[nutrient_number]

            if target is None:
                nutrient_id = nutrient.get("nutrientId")
                try:
                    nutrient_id_int = int(nutrient_id)
                except (TypeError, ValueError):
                    nutrient_id_int = None
                if nutrient_id_int in id_map:
                    target = id_map[nutrient_id_int]

            if target is None:
                nutrient_name = str(nutrient.get("nutrientName", "")).strip().lower()
                for key, mapped in name_map.items():
                    if key in nutrient_name:
                        target = mapped
                        break

            if target is not None:
                values[target] = value

        return values

    def _perform_search(self, ingredient_name: str, method: str) -> dict:
        query = ingredient_name.strip()
        if method == "POST":
            params = {"api_key": self.api_key}
            payload = {
                "query": query,
                "pageSize": self.DEFAULT_PAGE_SIZE,
                "dataType": self.DEFAULT_DATA_TYPES,
            }
            response = requests.post(
                self.BASE_URL,
                params=params,
                json=payload,
                timeout=self.DEFAULT_TIMEOUT_SECONDS,
            )
        else:
            params = {
                "api_key": self.api_key,
                "query": query,
                "pageSize": self.DEFAULT_PAGE_SIZE,
                "dataType": self.DEFAULT_DATA_TYPES,
            }
            response = requests.get(self.BASE_URL, params=params, timeout=self.DEFAULT_TIMEOUT_SECONDS)

        if response.status_code >= 400:
            print(
                "[USDAService]"
                f" method={method} status={response.status_code} preview={self._safe_response_preview(response)!r}"
            )
            raise USDAServiceError(self._status_error_message(response.status_code))

        try:
            return response.json()
        except ValueError as exc:
            raise USDAServiceError("USDA response was not valid JSON.") from exc

    def _rank_foods(self, foods: list[dict]) -> list[dict]:
        rank = {"foundation": 0, "sr legacy": 1, "survey (fndds)": 2, "branded": 3}
        return sorted(foods, key=lambda food: rank.get(str(food.get("dataType", "")).strip().lower(), 4))

    def search_foods(self, ingredient_name: str) -> list[dict]:
        self._ensure_config()
        last_error: Optional[USDAServiceError] = None

        for method in ("POST", "GET"):
            try:
                data = self._perform_search(ingredient_name, method)
                return data.get("foods", [])
            except requests.Timeout:
                last_error = USDAServiceError("USDA request timed out.")
            except requests.RequestException:
                last_error = USDAServiceError("USDA request failed due to network or connection issue.")
            except USDAServiceError as exc:
                last_error = exc

        raise last_error or USDAServiceError("USDA request failed.")

    def search_best_match(self, ingredient_name: str) -> Optional[dict]:
        foods = self.search_foods(ingredient_name)
        if not foods:
            return None

        best = self._rank_foods(foods)[0]
        return {
            "fdc_id": best.get("fdcId"),
            "description": best.get("description", ingredient_name),
            "data_type": best.get("dataType", ""),
            "per_100g": self._extract_nutrients(best.get("foodNutrients", [])),
        }
