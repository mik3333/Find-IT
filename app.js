import { passwordProblem } from "./shared/password-policy.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("toggle-password");
const forgotPassword = document.getElementById("forgot-password");
const passwordHelp = document.getElementById("password-help");
const formOptions = document.querySelector(".form-options");
const demoNote = document.getElementById("demo-note");
const modeToggle = document.getElementById("auth-mode-toggle");
const submitLabel = document.getElementById("submit-label");
const heading = document.getElementById("login-title");
const eyebrow = document.getElementById("form-eyebrow");
const subtitle = document.getElementById("form-subtitle");
const message = document.getElementById("form-message");
let isRegistering = false;

// Switch one form between sign-in and account creation.
modeToggle.addEventListener("click", () => {
  isRegistering = !isRegistering;
  form.reset();
  message.textContent = "";
  passwordInput.setCustomValidity("");
  heading.textContent = isRegistering ? "Create your account" : "Log in to FIND IT";
  eyebrow.textContent = isRegistering ? "CREATE AN ACCOUNT" : "WELCOME BACK";
  subtitle.textContent = isRegistering
    ? "Join your community and help bring lost things home."
    : "Pick up where your search left off.";
  submitLabel.textContent = isRegistering ? "Create account" : "Log in";
  modeToggle.textContent = isRegistering
    ? "Already have an account? Log in"
    : "New to FIND IT? Create an account";
  passwordInput.autocomplete = isRegistering ? "new-password" : "current-password";
  passwordInput.maxLength = isRegistering ? 128 : 1024;
  passwordHelp.hidden = !isRegistering;
  formOptions.hidden = isRegistering;
  forgotPassword.hidden = isRegistering;
  demoNote.hidden = isRegistering;
});

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
});

forgotPassword.addEventListener("click", () => {
  message.textContent = "Password recovery is not connected yet.";
});

form.addEventListener("input", () => {
  message.textContent = "";
  passwordInput.setCustomValidity(
    isRegistering ? passwordProblem(passwordInput.value) || "" : "",
  );
});

// The server checks the password too and saves only a secure hash.
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordInput.setCustomValidity(
    isRegistering ? passwordProblem(passwordInput.value) || "" : "",
  );
  if (!form.reportValidity()) return;

  const submitButton = form.querySelector(".submit-button");
  submitButton.disabled = true;
  try {
    const response = await fetch(isRegistering ? "/api/register" : "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      message.textContent = result.error || "Could not sign in. Please try again.";
      return;
    }
    window.location.href = "home.html";
  } catch (error) {
    console.error("Could not reach the account server.", error);
    message.textContent = "Could not reach the server. Check your connection and try again.";
  } finally {
    submitButton.disabled = false;
  }
});
