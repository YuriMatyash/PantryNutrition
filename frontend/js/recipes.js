function renderSavedRecipes(recipes) {
  const container = document.getElementById("saved-recipes");
  if (!recipes.length) {
    container.innerHTML = '<div class="empty-state">No saved recipes yet. <a href="generate.html">Generate your first recipe</a>.</div>';
    return;
  }

  container.innerHTML = recipes.map((recipe) => {
    const total = recipe.nutrition?.total || {};
    const tags = (recipe.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join(" ");
    return `
      <div class="card recipe-card">
        <h3>${recipe.title}</h3>
        <p>${tags}</p>
        <p>Servings: ${recipe.servings}</p>
        <p>Calories: ${total.calories || 0} | Protein: ${total.protein_g || 0}g | Carbs: ${total.carbs_g || 0}g | Fat: ${total.fat_g || 0}g</p>
        <div class="button-row">
          <button data-open-id="${recipe.id}">View Recipe</button>
          <button data-delete-id="${recipe.id}" class="danger">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("button[data-open-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const recipeId = button.getAttribute("data-open-id");
      window.location.href = `recipe_detail.html?recipe_id=${recipeId}`;
    });
  });

  container.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const recipeId = button.getAttribute("data-delete-id");
      if (!window.confirm("Delete this recipe?")) return;
      await deleteRecipe(recipeId);
    });
  });
}

async function loadSavedRecipes(userId) {
  const recipes = await apiGet(`/api/users/${userId}/recipes`);
  renderSavedRecipes(recipes);
}

async function deleteRecipe(recipeId) {
  const user = getCurrentUser();
  const messageEl = document.getElementById("message");
  try {
    await apiDelete(`/api/recipes/${recipeId}?user_id=${user.user_id}`);
    messageEl.textContent = "Recipe deleted.";
    await loadSavedRecipes(user.user_id);
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

(function initRecipesPage() {
  const container = document.getElementById("saved-recipes");
  if (!container) return;

  const user = requireLogin();
  if (!user) return;

  loadSavedRecipes(user.user_id);
})();
