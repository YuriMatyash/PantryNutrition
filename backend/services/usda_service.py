"""USDA FoodData Central service wrapper."""

import os

import requests


class USDAConfigError(Exception):
    """Raised when USDA configuration is missing."""


class USDAServiceError(Exception):
    """Raised when USDA service request fails."""


class USDAService:
    BASE_URL = "https://api.nal.usda.gov/fdc/v1"
    SEARCH_URL = f"{BASE_URL}/foods/search"
    DEFAULT_TIMEOUT_SECONDS = 20
    DEFAULT_PAGE_SIZE = 10

    def __init__(self) -> None:
        self.api_key = os.getenv("USDA_API_KEY", "")
        self.app_env = os.getenv("APP_ENV", "local").lower()

    def _is_local(self) -> bool:
        return self.app_env == "local"

    def _ensure_config(self) -> None:
        if not self.api_key:
            raise USDAConfigError("USDA is not configured. Missing USDA_API_KEY in backend/.env.")

    def _local_log(self, message: str) -> None:
        if self._is_local():
            print(f"[USDAService] {message}")

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
        number_map = {"208": "calories", "203": "protein_g", "205": "carbs_g", "204": "fat_g", "291": "fiber_g", "269": "sugar_g", "307": "sodium_mg"}
        id_map = {1008: "calories", 1003: "protein_g", 1005: "carbs_g", 1004: "fat_g", 1079: "fiber_g", 2000: "sugar_g", 1093: "sodium_mg"}

        for nutrient in nutrients:
            raw_value = nutrient.get("value")
            if raw_value in (None, ""):
                continue
            try:
                value = float(raw_value)
            except (TypeError, ValueError):
                continue

            target = number_map.get(str(nutrient.get("nutrientNumber", "")).strip())
            if target is None:
                try:
                    nutrient_id = int(nutrient.get("nutrientId"))
                except (TypeError, ValueError):
                    nutrient_id = None
                if nutrient_id is not None:
                    target = id_map.get(nutrient_id)

            if target is None:
                name = str(nutrient.get("nutrientName", "")).strip().lower()
                if "energy" in name or "calorie" in name:
                    target = "calories"
                elif "protein" in name:
                    target = "protein_g"
                elif "carbohydrate" in name:
                    target = "carbs_g"
                elif "lipid" in name or name == "fat":
                    target = "fat_g"
                elif "fiber" in name:
                    target = "fiber_g"
                elif "sugar" in name:
                    target = "sugar_g"
                elif "sodium" in name:
                    target = "sodium_mg"

            if target:
                values[target] = value

        return values

    def extract_nutrients_from_food(self, food: dict) -> dict:
        return self._extract_nutrients(food.get("food_nutrients", []))

    def _request_get(self, query: str) -> requests.Response:
        headers = {"Accept": "application/json"}
        params = {"api_key": self.api_key, "query": query, "pageSize": self.DEFAULT_PAGE_SIZE}
        return requests.get(self.SEARCH_URL, headers=headers, params=params, timeout=self.DEFAULT_TIMEOUT_SECONDS)

    def _request_post(self, query: str) -> requests.Response:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        params = {"api_key": self.api_key}
        payload = {"query": query, "pageSize": self.DEFAULT_PAGE_SIZE}
        return requests.post(self.SEARCH_URL, headers=headers, params=params, json=payload, timeout=self.DEFAULT_TIMEOUT_SECONDS)

    def _parse_response(self, response: requests.Response) -> dict:
        content_type = response.headers.get("Content-Type", "")
        if "application/json" not in content_type.lower():
            raise USDAServiceError(f"USDA returned non-JSON response with status {response.status_code}.")
        try:
            return response.json()
        except ValueError as exc:
            raise USDAServiceError(f"USDA returned non-JSON response with status {response.status_code}.") from exc

    def _normalize_foods(self, raw_foods: list[dict]) -> list[dict]:
        foods = []
        for food in raw_foods[: self.DEFAULT_PAGE_SIZE]:
            foods.append(
                {
                    "fdc_id": food.get("fdcId"),
                    "description": food.get("description", ""),
                    "data_type": food.get("dataType", ""),
                    "food_nutrients": food.get("foodNutrients", []) or [],
                }
            )
        return foods

    def search_foods(self, ingredient_name: str) -> list[dict]:
        self._ensure_config()
        query = ingredient_name.strip()
        if not query:
            return []

        last_error: USDAServiceError | None = None

        for method in ("GET", "POST"):
            try:
                response = self._request_get(query) if method == "GET" else self._request_post(query)
                content_type = response.headers.get("Content-Type", "")
                self._local_log(f"query='{query}' method={method} status={response.status_code} content_type='{content_type}'")

                if response.status_code >= 400:
                    raise USDAServiceError(self._status_error_message(response.status_code))

                payload = self._parse_response(response)
                foods = self._normalize_foods(payload.get("foods", []))
                self._local_log(f"query='{query}' candidates={len(foods)}")
                return foods
            except requests.Timeout:
                last_error = USDAServiceError("USDA request timed out.")
            except requests.RequestException:
                last_error = USDAServiceError("USDA request failed due to network or connection issue.")
            except USDAServiceError as exc:
                last_error = exc

        raise last_error or USDAServiceError("USDA request failed.")
