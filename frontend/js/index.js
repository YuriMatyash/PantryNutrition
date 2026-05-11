(function initHomeCtas() {
  const ctaContainer = document.getElementById("home-cta");
  if (!ctaContainer) return;

  const user = getCurrentUser();
  if (!user) {
    ctaContainer.innerHTML = `
      <a class="button-link" href="register.html">Get Started</a>
      <a class="button-link secondary" href="login.html">Login</a>
    `;
    return;
  }

  ctaContainer.innerHTML = `
    <a class="button-link" href="pantry.html">Go to Pantry</a>
    <a class="button-link" href="generate.html">Generate Recipe</a>
    <a class="button-link secondary" href="recipes.html">View Saved Recipes</a>
  `;
})();
