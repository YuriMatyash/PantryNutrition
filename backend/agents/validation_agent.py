"""Recipe validation agent."""


class ValidationAgent:
    ALLOWED_UNITS = {"g", "ml", "unit"}

    def validate_recipe(self, recipe: dict) -> dict:
        if not recipe.get("title"):
            raise ValueError("Recipe title is required.")
        if not recipe.get("ingredients"):
            raise ValueError("Recipe ingredients are required.")
        if not recipe.get("instructions"):
            raise ValueError("Recipe instructions are required.")

        servings = recipe.get("servings", 1)
        if not isinstance(servings, int) or servings <= 0:
            raise ValueError("Recipe servings must be a positive integer.")

        for ingredient in recipe["ingredients"]:
            unit = str(ingredient.get("unit", "")).strip().lower()
            if unit not in self.ALLOWED_UNITS:
                raise ValueError(f"Invalid ingredient unit: {unit}")

        return recipe
