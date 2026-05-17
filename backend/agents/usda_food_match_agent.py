"""Deterministic USDA food match selector."""

import re


class USDAFoodMatchAgent:
    DATA_TYPE_RANK = {"foundation": 0, "sr legacy": 1, "survey (fndds)": 2, "branded": 3}
    NOISY_WORDS = {"roll", "spread", "sauce", "soup", "baby", "formula", "restaurant", "fast", "prepared", "product"}

    def _tokenize(self, text: str) -> set[str]:
        return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if token}

    def _looks_brand_query(self, query: str) -> bool:
        return len(self._tokenize(query)) >= 2 and all(len(t) <= 5 for t in self._tokenize(query))

    def _score_food(self, query: str, food: dict, has_generic: bool) -> tuple[float, list[str]]:
        q = query.strip().lower()
        description = str(food.get("description", "")).lower().strip()
        data_type = str(food.get("data_type", "")).lower().strip()

        score = 0.0
        reasons = []

        score += (4 - self.DATA_TYPE_RANK.get(data_type, 4)) * 20
        if data_type == "branded" and has_generic:
            score -= 35
            reasons.append("branded_penalty")

        q_tokens = self._tokenize(q)
        d_tokens = self._tokenize(description)
        overlap = len(q_tokens & d_tokens)
        score += overlap * 15
        if overlap == 0:
            score -= 25

        if q in description:
            score += 20
        if len(description) > 70:
            score -= 12

        if any(word in d_tokens for word in self.NOISY_WORDS):
            score -= 18
            reasons.append("noisy_description_penalty")

        if q == "chicken":
            if "chicken breast" in description or "roasted chicken" in description or "chicken, cooked" in description:
                score += 20
            if "chicken roll" in description:
                score -= 30
                reasons.append("chicken_roll_penalty")

        if q == "milk":
            if "milk" in description and data_type != "branded":
                score += 18
            if data_type == "branded" and not self._looks_brand_query(q):
                score -= 20

        if q == "cheddar cheese":
            if "cheese, cheddar" in description or "cheddar cheese" in description:
                score += 24

        if q in {"egg", "eggs"} and "egg" in description and "whole" in description:
            score += 20

        return score, reasons

    def choose_best_match(self, query: str, foods: list[dict]) -> dict:
        if not foods:
            return {"match": None, "confidence": 0.0, "reason": "no_candidates", "warning": "No USDA candidates returned."}

        has_generic = any(str(f.get("data_type", "")).lower().strip() != "branded" for f in foods)
        scored = []
        for food in foods:
            score, reasons = self._score_food(query, food, has_generic)
            scored.append((score, food, reasons))
        scored.sort(key=lambda item: item[0], reverse=True)

        best_score, best_food, reasons = scored[0]
        warning = None
        if best_score < 25:
            warning = f"USDA match confidence is low for '{query}'."
        elif str(best_food.get("data_type", "")).lower() == "branded" and not self._looks_brand_query(query):
            warning = f"Used branded USDA match for '{query}'."

        return {
            "match": best_food if best_score >= 8 else None,
            "confidence": round(best_score, 1),
            "reason": ", ".join(reasons) if reasons else "scored_by_overlap_and_data_type",
            "warning": warning,
        }
