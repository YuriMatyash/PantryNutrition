function renderGeneratedRecipe(recipe) {
  const container = document.getElementById("generated-recipe");
  const total = recipe.nutrition?.total || {};
  const ingredients = (recipe.ingredients || []).map((i) => `<li>${i.name}: ${i.amount} ${i.unit}</li>`).join("");
  const instructions = (recipe.instructions || []).map((s) => `<li>${s}</li>`).join("");

  container.innerHTML = `
    <h3>${recipe.title}</h3>
    <p><strong>Servings:</strong> ${recipe.servings}</p>
    <p><strong>Calories:</strong> ${total.calories || 0} | <strong>Protein:</strong> ${total.protein_g || 0}g | <strong>Carbs:</strong> ${total.carbs_g || 0}g | <strong>Fat:</strong> ${total.fat_g || 0}g</p>
    <h4>Ingredients</h4><ul>${ingredients}</ul>
    <h4>Instructions</h4><ol>${instructions}</ol>
  `;
}

function renderSavedRecipes(recipes) {
  const container = document.getElementById("saved-recipes");
  if (!recipes.length) {
    container.innerHTML = "<p>No saved recipes yet.</p>";
    return;
  }

  container.innerHTML = recipes.map((recipe) => {
    const total = recipe.nutrition?.total || {};
    return `
      <div class="recipe-card">
        <h3>${recipe.title}</h3>
        <p>Servings: ${recipe.servings}</p>
        <p>Calories: ${total.calories || 0}, Protein: ${total.protein_g || 0}g, Carbs: ${total.carbs_g || 0}g, Fat: ${total.fat_g || 0}g</p>
        <button data-delete-id="${recipe.id}">Delete</button>
      </div>
    `;
  }).join("");

  container.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const recipeId = button.getAttribute("data-delete-id");
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

async function handleGenerate(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const messageEl = document.getElementById("message");

  const payload = {
    meal_type: document.getElementById("meal_type").value,
    preference: document.getElementById("preference").value,
    use_only_pantry: document.getElementById("use_only_pantry").value === "true",
    message: document.getElementById("message_input").value,
  };

  try {
    const response = await apiPost(`/api/users/${user.user_id}/recipes/generate`, payload);
    renderGeneratedRecipe(response.recipe);
    messageEl.textContent = "Recipe generated and saved.";
    await loadSavedRecipes(user.user_id);
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

(function initRecipesPage() {
  const form = document.getElementById("generate-form");
  if (!form) return;

  const user = requireLogin();
  if (!user) return;

  document.getElementById("user-info").textContent = `Logged in as: ${user.username}`;
  form.addEventListener("submit", handleGenerate);
  loadSavedRecipes(user.user_id);
})();
