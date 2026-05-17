"""Nutrition lookup agent with mock and USDA modes."""

import os

from agents.usda_food_match_agent import USDAFoodMatchAgent
from services.usda_service import USDAConfigError, USDAService, USDAServiceError


class NutritionLookupAgent:
    MOCK_NUTRITION_PER_100G = {
        "egg": {"calories": 155, "protein_g": 13, "carbs_g": 1.1, "fat_g": 11},
        "rice": {"calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3},
        "milk": {"calories": 61, "protein_g": 3.2, "carbs_g": 4.8, "fat_g": 3.3},
    }

    def __init__(self) -> None:
        self.usda_service = USDAService()
        self.food_match_agent = USDAFoodMatchAgent()
        self.app_env = os.getenv("APP_ENV", "local").lower()

    def _is_local(self) -> bool:
        return self.app_env == "local"

    def _local_log(self, message: str) -> None:
        if self._is_local():
            print(f"[NutritionLookupAgent] {message}")

    def _mock_lookup(self, item: dict) -> dict:
        name = item["name"]
        nutrition = self.MOCK_NUTRITION_PER_100G.get(name, {"calories": 90, "protein_g": 3.0, "carbs_g": 12.0, "fat_g": 2.0})
        return {"name": name, "matched_usda_food": f"Mock food: {name}", "usda_food_id": None, "amount": item["amount"], "unit": item["unit"], "per_100g": nutrition, "data_type": "mock", "warning": None}

    def _candidate_queries(self, name: str) -> list[str]:
        q = name.strip().lower()
        candidates = [q]
        if q == "noam cheese":
            candidates.extend(["cheese", "semi hard cheese", "cheddar cheese"])
        if q == "cheddar cheese":
            candidates.extend(["cheese, cheddar", "cheddar"])
        if q == "chicken breast":
            candidates.append("chicken")
        tokens = [t for t in q.split() if t not in {"noam", "brand", "local"}]
        simplified = " ".join(tokens).strip()
        if simplified and simplified not in candidates:
            candidates.append(simplified)
        return candidates

    def _best_match_for_query(self, query: str) -> dict:
        foods = self.usda_service.search_foods(query)
        selection = self.food_match_agent.choose_best_match(query, foods)
        match = selection.get("match")
        if not match:
            return {"query": query, "selection": selection, "match": None, "nutrients": None, "warnings": []}

        nutrients, extraction_warnings = self.usda_service.extract_nutrients_from_food(match)
        return {
            "query": query,
            "selection": selection,
            "match": match,
            "nutrients": nutrients,
            "warnings": extraction_warnings,
        }

    def lookup_ingredients(self, ingredients: list[dict]) -> list[dict]:
        use_mock_usda = os.getenv("USE_MOCK_USDA", "false").lower() == "true"
        results: list[dict] = []

        for item in ingredients:
            if use_mock_usda:
                results.append(self._mock_lookup(item))
                continue

            name = item["name"]
            try:
                attempts = []
                for query in self._candidate_queries(name):
                    attempt = self._best_match_for_query(query)
                    attempts.append(attempt)
                    if attempt["match"] and float(attempt["selection"].get("confidence", 0)) >= 30:
                        break

                attempts.sort(key=lambda a: float(a["selection"].get("confidence", 0) if a.get("selection") else 0), reverse=True)
                best = attempts[0]

                if not best.get("match"):
                    warning = best.get("selection", {}).get("warning") or f"No reasonable USDA match found for '{name}'."
                    results.append({"name": name, "matched_usda_food": None, "usda_food_id": None, "amount": item["amount"], "unit": item["unit"], "per_100g": None, "data_type": None, "warning": warning})
                    continue

                selection = best["selection"]
                match = best["match"]
                warnings = []
                if selection.get("warning"):
                    warnings.append(selection["warning"])
                warnings.extend(best.get("warnings", []))
                if best.get("query") != name.strip().lower():
                    warnings.append(f"Used fallback USDA query '{best['query']}' for ingredient '{name}'.")
                warning = " ".join(warnings) if warnings else None

                self._local_log(
                    f"ingredient='{name}' chosen='{match.get('description', '')}' data_type='{match.get('data_type', '')}' confidence={selection.get('confidence')}"
                )

                results.append({
                    "name": name,
                    "matched_usda_food": match.get("description"),
                    "usda_food_id": match.get("fdc_id"),
                    "amount": item["amount"],
                    "unit": item["unit"],
                    "per_100g": best.get("nutrients"),
                    "data_type": match.get("data_type"),
                    "warning": warning,
                })
            except USDAConfigError:
                raise
            except USDAServiceError as exc:
                results.append({"name": name, "matched_usda_food": None, "usda_food_id": None, "amount": item["amount"], "unit": item["unit"], "per_100g": None, "data_type": None, "warning": f"USDA lookup failed for '{name}': {exc}"})

        return results
