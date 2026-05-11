function getCurrentUser() {
  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");
  if (!userId) return null;
  return { user_id: userId, username: username || "" };
}

function saveUserSession(user) {
  localStorage.setItem("user_id", user.user_id);
  localStorage.setItem("username", user.username);
}

function logout() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const messageEl = document.getElementById("message");
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await apiPost("/api/register", { username, password });
    saveUserSession(result);
    messageEl.textContent = "Registered successfully. Redirecting...";
    window.location.href = "pantry.html";
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const messageEl = document.getElementById("message");
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await apiPost("/api/login", { username, password });
    saveUserSession(result);
    messageEl.textContent = "Login successful. Redirecting...";
    window.location.href = "pantry.html";
  } catch (error) {
    messageEl.textContent = error.message;
  }
}

(function initAuthPages() {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }
})();
