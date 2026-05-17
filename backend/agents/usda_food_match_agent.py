"""USDA food match agent.

Deterministic selector for choosing the best USDA food candidate from search results.
Designed so future versions can replace scoring with an OpenAI-based selector.
"""

import re


class USDAFoodMatchAgent:
    DATA_TYPE_RANK = {
        "foundation": 0,
        "sr legacy": 1,
        "survey (fndds)": 2,
        "branded": 3,
    }

    def _tokenize(self, text: str) -> set[str]:
        return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if token}

    def _score_food(self, query: str, food: dict) -> tuple[float, list[str]]:
        description = str(food.get("description", "")).strip().lower()
        data_type = str(food.get("data_type", "")).strip().lower()

        score = 0.0
        reasons: list[str] = []

        # Data type preference
        rank = self.DATA_TYPE_RANK.get(data_type, 4)
        score += max(0, 4 - rank) * 20
        reasons.append(f"data_type_rank={rank}")

        query_tokens = self._tokenize(query)
        desc_tokens = self._tokenize(description)
        overlap = len(query_tokens & desc_tokens)
        score += overlap * 12

        # Exact/close match preference
        if query.strip().lower() == description:
            score += 35
            reasons.append("exact_description")
        elif query.strip().lower() in description:
            score += 22
            reasons.append("query_in_description")

        # Generic/simple preference
        if len(description) <= 40:
            score += 6
        if any(word in description for word in ["brand", "flavor", "ready", "frozen", "microwave", "packet"]):
            score -= 10
            reasons.append("packaged_penalty")

        # Query-specific boosters
        q = query.strip().lower()
        if q in {"egg", "eggs"} and "egg" in description and "whole" in description:
            score += 30
            reasons.append("egg_whole_boost")
        if q == "cheddar cheese" and ("cheese, cheddar" in description or "cheddar cheese" in description):
            score += 30
            reasons.append("cheddar_boost")
        if q == "milk" and "milk" in description and "chocolate" not in description:
            score += 22
            reasons.append("generic_milk_boost")

        # Penalize unrelated noisy descriptions
        if overlap == 0:
            score -= 25
            reasons.append("no_token_overlap_penalty")

        return score, reasons

    def choose_best_match(self, query: str, foods: list[dict]) -> dict:
        if not foods:
            return {"match": None, "confidence": 0.0, "warning": "No USDA candidates returned.", "reason": "no_candidates"}

        scored: list[tuple[float, dict, list[str]]] = []
        for food in foods:
            score, reasons = self._score_food(query, food)
            scored.append((score, food, reasons))

        scored.sort(key=lambda x: x[0], reverse=True)
        best_score, best_food, reasons = scored[0]

        warning = None
        if best_score < 18:
            warning = f"USDA match confidence is low for '{query}'."
        elif str(best_food.get("data_type", "")).lower() == "branded":
            warning = f"Used branded USDA match for '{query}'."

        return {
            "match": best_food if best_score >= 8 else None,
            "confidence": round(best_score, 2),
            "warning": warning,
            "reason": ", ".join(reasons[:4]),
        }
