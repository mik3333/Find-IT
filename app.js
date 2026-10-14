// Grab the main login form and all related controls
const form = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("toggle-password");
const forgotPassword = document.getElementById("forgot-password");
const message = document.getElementById("form-message");
const demoAccounts = [
  { email: "admin@findit.test", password: "FindIT-admin-2026", role: "admin" },
  { email: "user@findit.test", password: "FindIT-user-2026", role: "user" },
];

// Toggle the password field between hidden and visible state
passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
});

// Show a placeholder note when the user clicks "Forgot password"
forgotPassword.addEventListener("click", () => {
  message.textContent = "Password recovery is not connected in this prototype.";
});

// Clear any previous feedback when the user types again
form.addEventListener("input", () => {
  message.textContent = "";
});

// Demo-only credential check; production sign-in requires a backend.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = passwordInput.value;

  const account = demoAccounts.find(
    (demoAccount) => email === demoAccount.email && password === demoAccount.password,
  );

  if (!account) {
    message.textContent = "Email or password is incorrect. Check the demo accounts below.";
    return;
  }

  sessionStorage.setItem("findit.currentUser", email);
  sessionStorage.setItem("findit.currentRole", account.role);
  window.location.href = "home.html";
});
