function renderNavbar() {
  const mount = document.getElementById("top-nav");
  if (!mount) return;

  const user = getCurrentUser ? getCurrentUser() : null;
  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

  const leftLinks = user
    ? [
        { href: "index.html", label: "Home" },
        { href: "pantry.html", label: "Pantry" },
        { href: "generate.html", label: "Generate" },
        { href: "recipes.html", label: "Recipes" },
      ]
    : [{ href: "index.html", label: "Home" }];

  const rightLinks = user
    ? []
    : [
        { href: "login.html", label: "Login" },
        { href: "register.html", label: "Register" },
      ];

  mount.innerHTML = `
    <nav class="app-navbar">
      <div class="nav-left">
        <a class="nav-brand" href="index.html">PantryAI</a>
        <div class="nav-links">
          ${leftLinks
            .map(
              (link) =>
                `<a class="nav-link ${page === link.href ? "active" : ""}" href="${link.href}">${link.label}</a>`
            )
            .join("")}
        </div>
      </div>
      <div class="nav-right">
        ${
          user
            ? `<span class="nav-user">${user.username}</span><button id="nav-logout-btn" class="nav-logout-btn" type="button">Logout</button>`
            : rightLinks
                .map(
                  (link) =>
                    `<a class="nav-link ${page === link.href ? "active" : ""}" href="${link.href}">${link.label}</a>`
                )
                .join("")
        }
      </div>
    </nav>
  `;

  if (user) {
    const logoutBtn = document.getElementById("nav-logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
  }
}

document.addEventListener("DOMContentLoaded", renderNavbar);
