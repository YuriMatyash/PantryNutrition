function renderNavbar() {
  const mount = document.getElementById("top-nav");
  if (!mount) return;

  const user = getCurrentUser ? getCurrentUser() : null;
  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

  const loggedInLinks = [
    { href: "pantry.html", label: "Pantry" },
    { href: "generate.html", label: "Generate" },
    { href: "recipes.html", label: "Recipes" },
  ];

  const loggedOutLinks = [
    { href: "login.html", label: "Login" },
    { href: "register.html", label: "Register" },
  ];

  const links = user ? loggedInLinks : loggedOutLinks;

  mount.innerHTML = `
    <nav class="navbar">
      <a class="brand" href="${user ? "pantry.html" : "index.html"}">Pantry Recipe Agent</a>
      <div class="nav-links">
        ${links
          .map(
            (link) =>
              `<a class="nav-link ${page === link.href ? "active" : ""}" href="${link.href}">${link.label}</a>`
          )
          .join("")}
      </div>
      <div class="nav-right">
        ${user ? `<span class="nav-user">${user.username}</span><button id="nav-logout-btn" type="button">Logout</button>` : ""}
      </div>
    </nav>
  `;

  if (user) {
    const logoutBtn = document.getElementById("nav-logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
  }
}

document.addEventListener("DOMContentLoaded", renderNavbar);
