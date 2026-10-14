// Grab the main login form and all related controls
const form = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("toggle-password");
const forgotPassword = document.getElementById("forgot-password");
const message = document.getElementById("form-message");

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

// Prevent form submission and show a prototype-only message instead of real login logic
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  message.textContent = "This is a visual prototype. No account was checked and no sign-in occurred.";
});
