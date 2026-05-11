"""Ingredient extraction and cleanup for nutrition pipeline."""


class IngredientExtractorAgent:
    ALLOWED_UNITS = {"g", "ml", "unit"}

    def extract_ingredients(self, recipe: dict) -> list[dict]:
        ingredients = recipe.get("ingredients", [])
        clean: list[dict] = []

        for ingredient in ingredients:
            name = str(ingredient.get("name", "")).strip().lower()
            amount = float(ingredient.get("amount", 0))
            unit = str(ingredient.get("unit", "")).strip().lower()

            if not name:
                raise ValueError("Ingredient is missing a name.")
            if amount <= 0:
                raise ValueError(f"Ingredient '{name}' has invalid amount.")
            if unit not in self.ALLOWED_UNITS:
                raise ValueError(f"Ingredient '{name}' has invalid unit '{unit}'.")

            clean.append({"name": name, "amount": amount, "unit": unit})

        return clean
