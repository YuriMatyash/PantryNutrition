let isGenerating = false;

function setGenerateStatus(text, loading = false) {
  const statusEl = document.getElementById("generate-status");
  if (!statusEl) return;
  statusEl.innerHTML = text
    ? loading
      ? `<span class="spinner"></span><span>${text}</span>`
      : `<span>${text}</span>`
    : "";
}

function setGenerateButtonState(isLoading) {
  const button = document.getElementById("generate-btn");
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? "Generating..." : "Generate Recipe";
}

function renderGeneratedRecipe(recipe) {
  const container = document.getElementById("generated-recipe");
  const total = recipe.nutrition?.total || {};

  container.innerHTML = `
    <div class="card">
      <h3>${recipe.title}</h3>
      <p>Servings: ${recipe.servings}</p>
      <p>Calories: ${total.calories || 0}, Protein: ${total.protein_g || 0}g, Carbs: ${total.carbs_g || 0}g, Fat: ${total.fat_g || 0}g</p>
      <div class="button-row">
        <a class="button-link" href="recipe_detail.html?recipe_id=${recipe.id}">View Recipe</a>
        <a class="button-link" href="recipes.html">Go to Saved Recipes</a>
      </div>
    </div>
  `;
}

async function checkPantryHelp(userId) {
  const helpEl = document.getElementById("pantry-help");
  if (!helpEl) return;
  try {
    const pantry = await apiGet(`/api/users/${userId}/pantry`);
    if (!pantry.items || pantry.items.length === 0) {
      helpEl.innerHTML = 'Your pantry is empty. <a href="pantry.html">Add pantry ingredients first</a>.';
    }
  } catch {
    // keep silent here, main generate flow will report errors on submit
  }
}

async function handleGenerate(event) {
  event.preventDefault();
  if (isGenerating) return;

  const user = getCurrentUser();
  const messageEl = document.getElementById("message");

  isGenerating = true;
  setGenerateButtonState(true);
  setGenerateStatus("Generating recipe...", true);
  messageEl.textContent = "";

  const payload = {
    meal_type: document.getElementById("meal_type").value,
    preference: document.getElementById("preference").value,
    use_only_pantry: document.getElementById("use_only_pantry").value === "true",
    message: document.getElementById("message_input").value,
  };

  try {
    setGenerateStatus("Contacting AI...", true);
    const response = await apiPost(`/api/users/${user.user_id}/recipes/generate`, payload);
    setGenerateStatus("Calculating nutrition...", true);
    renderGeneratedRecipe(response.recipe);
    setGenerateStatus("Recipe generated and saved.", false);
    messageEl.textContent = "Recipe generated and saved.";
  } catch (error) {
    setGenerateStatus("Generation failed.", false);
    messageEl.textContent = error.message;
  } finally {
    isGenerating = false;
    setGenerateButtonState(false);
  }
}

(function initGeneratePage() {
  const form = document.getElementById("generate-form");
  if (!form) return;
  const user = requireLogin();
  if (!user) return;
  form.addEventListener("submit", handleGenerate);
  checkPantryHelp(user.user_id);
})();
