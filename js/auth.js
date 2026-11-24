
/* =====================================================
   EXPENSA - REAL SUPABASE AUTHENTICATION
   Registration, login, email verification and recovery
===================================================== */

const $ = (selector) => document.querySelector(selector);

// Supabase client
const supabaseClient = window.expensaSupabase;

// HTML elements
const authForm = $("#authForm");
const loginTab = $("#loginTab");
const signupTab = $("#signupTab");

const formHeading = $("#formHeading");
const formDescription = $("#formDescription");
const submitText = $("#submitText");
const bottomNote = $("#bottomNote");

const nameField = $("#nameField");
const confirmField = $("#confirmField");
const passwordStrength = $("#passwordStrength");

const rememberRow = $("#rememberRow");
const termsRow = $("#termsRow");

const fullName = $("#fullName");
const email = $("#email");
const password = $("#password");
const confirmPassword = $("#confirmPassword");

const acceptTerms = $("#acceptTerms");
const formMessage = $("#formMessage");

const forgotPassword = $("#forgotPassword");
const switchToSignup = $("#switchToSignup");

let currentMode = "login";

// Destination after successful authentication
const dashboardURL = new URL(
    "dashboard.html",
    window.location.href
).toString();

// Destination after password recovery
const recoveryURL = new URL(
  "reset-password.html",
  window.location.href
).toString();

// ==========================================
// 1. CHECK SUPABASE CONNECTION
// ==========================================

if (!supabaseClient) {
  throw new Error(
    "EXPENSA Supabase client is missing. Check supabase-client.js."
  );
}

// ==========================================
// 2. FOOTER YEAR
// ==========================================

const yearElement = $("#authYear");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// ==========================================
// 3. MESSAGE FUNCTIONS
// ==========================================

function showMessage(message, type = "success") {
  formMessage.textContent = message;
  formMessage.className = "form-message";

  if (type === "error") {
    formMessage.classList.add("error");
  }
}

function clearMessage() {
  showMessage("");
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });

  clearMessage();
}

function showFieldError(id, message) {
  const element = $("#" + id);

  if (element) {
    element.textContent = message;
  }
}

function friendlyError(message) {
  const text = String(message || "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (text.includes("user already registered")) {
    return "This email is already registered. Please log in.";
  }

  if (text.includes("email not confirmed")) {
    return "Please verify your email before logging in.";
  }

  if (text.includes("password should be")) {
    return "Your password does not meet the security requirements.";
  }

  if (text.includes("rate limit")) {
    return "Too many attempts. Please wait before trying again.";
  }

  if (text.includes("network")) {
    return "Network problem. Check your internet connection.";
  }

  return "Something went wrong. Please try again.";
}

// ==========================================
// 4. BUTTON LOADING STATE
// ==========================================

function setLoading(isLoading) {
  const button = $("#submitButton");

  button.disabled = isLoading;

  submitText.textContent = isLoading
    ? "Please wait..."
    : currentMode === "signup"
      ? "Create My Account"
      : "Log In";
}

// ==========================================
// 5. SWITCH LOGIN / SIGNUP
// ==========================================

function switchMode(mode) {
  currentMode = mode;

  clearErrors();
  authForm.reset();

  const isSignup = mode === "signup";

  loginTab.classList.toggle("active", !isSignup);
  signupTab.classList.toggle("active", isSignup);

  loginTab.setAttribute("aria-selected", String(!isSignup));
  signupTab.setAttribute("aria-selected", String(isSignup));

  nameField.hidden = !isSignup;
  confirmField.hidden = !isSignup;
  passwordStrength.hidden = !isSignup;

  termsRow.hidden = !isSignup;
  rememberRow.hidden = isSignup;

  forgotPassword.hidden = isSignup;

  password.autocomplete = isSignup
    ? "new-password"
    : "current-password";

  formHeading.textContent = isSignup
    ? "Create your account."
    : "Welcome back.";

  formDescription.textContent = isSignup
    ? "Start building smarter financial habits today."
    : "Sign in to continue your financial journey.";

  submitText.textContent = isSignup
    ? "Create My Account"
    : "Log In";

  bottomNote.innerHTML = isSignup
    ? 'Already have an account? <button type="button" id="switchToLogin">Log in</button>'
    : 'New to EXPENSA? <button type="button" id="switchToSignup">Create an account</button>';

  const loginLink = $("#switchToLogin");
  const signupLink = $("#switchToSignup");

  if (loginLink) {
    loginLink.addEventListener("click", () => {
      switchMode("login");
    });
  }

  if (signupLink) {
    signupLink.addEventListener("click", () => {
      switchMode("signup");
    });
  }
}

loginTab.addEventListener("click", () => switchMode("login"));
signupTab.addEventListener("click", () => switchMode("signup"));

switchToSignup.addEventListener("click", () => {
  switchMode("signup");
});

// ==========================================
// 6. SHOW / HIDE PASSWORD
// ==========================================

document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $("#" + button.dataset.toggle);

    if (!input) return;

    const show = input.type === "password";

    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";

    button.setAttribute(
      "aria-label",
      show ? "Hide password" : "Show password"
    );
  });
});

// ==========================================
// 7. PASSWORD STRENGTH
// ==========================================

function calculatePasswordStrength(value) {
  let score = 0;

  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  return score;
}

password.addEventListener("input", () => {
  if (currentMode !== "signup") return;

  const score = calculatePasswordStrength(password.value);
  const bars = $(".strength-bars");
  const strengthText = $("#strengthText");

  bars.dataset.level = String(score);

  const labels = [
    "Enter a password",
    "Weak password",
    "Fair password",
    "Good password",
    "Strong password"
  ];

  strengthText.textContent = labels[score];
});

// ==========================================
// 8. FORM VALIDATION
// ==========================================

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateForm() {
  clearErrors();

  let valid = true;

  const emailValue = email.value.trim();
  const passwordValue = password.value;

  if (!emailValue) {
    showFieldError("emailError", "Enter your email address.");
    valid = false;
  } else if (!isValidEmail(emailValue)) {
    showFieldError("emailError", "Enter a valid email address.");
    valid = false;
  }

  if (!passwordValue) {
    showFieldError("passwordError", "Enter your password.");
    valid = false;
  } else if (
    currentMode === "signup" &&
    passwordValue.length < 8
  ) {
    showFieldError(
      "passwordError",
      "Password must contain at least 8 characters."
    );
    valid = false;
  }

  if (currentMode === "signup") {
    const nameValue = fullName.value.trim();

    if (!nameValue) {
      showFieldError("nameError", "Enter your full name.");
      valid = false;
    } else if (nameValue.length < 2) {
      showFieldError("nameError", "Enter a valid name.");
      valid = false;
    }

    if (!confirmPassword.value) {
      showFieldError(
        "confirmError",
        "Confirm your password."
      );
      valid = false;
    } else if (passwordValue !== confirmPassword.value) {
      showFieldError(
        "confirmError",
        "Your passwords do not match."
      );
      valid = false;
    }

    if (!acceptTerms.checked) {
      showMessage(
        "Please accept the terms and privacy policy.",
        "error"
      );
      valid = false;
    }
  }

  return valid;
}

// ==========================================
// 9. REAL ACCOUNT REGISTRATION
// ==========================================

async function registerUser() {
  const name = fullName.value.trim();
  const emailAddress = email.value.trim();

  setLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: emailAddress,
      password: password.value,
      options: {
        data: {
          full_name: name
        },
        emailRedirectTo: dashboardURL
      }
    });

    if (error) throw error;

    if (data.session) {
      showMessage(
        "Account created successfully! Opening your dashboard..."
      );

      window.location.replace(dashboardURL);
      return;
    }

    showMessage(
      "Registration successful! Check your email and click the verification link before logging in."
    );

    authForm.reset();

  } catch (error) {
    console.error("Registration error:", error);
    showMessage(friendlyError(error.message), "error");

  } finally {
    setLoading(false);
  }
}

// ==========================================
// 10. REAL USER LOGIN
// ==========================================

async function loginUser() {
  const emailAddress = email.value.trim();

  setLoading(true);

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: emailAddress,
        password: password.value
      });

    if (error) throw error;

    if (!data.session) {
      throw new Error("Unable to create a login session.");
    }

    showMessage("Login successful! Opening your dashboard...");

    window.location.replace(dashboardURL);

  } catch (error) {
    console.error("Login error:", error);
    showMessage(friendlyError(error.message), "error");

  } finally {
    setLoading(false);
  }
}

// ==========================================
// 11. FORM SUBMISSION
// ==========================================

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) return;

  if (currentMode === "signup") {
    await registerUser();
  } else {
    await loginUser();
  }
});

// ==========================================
// 12. FORGOT PASSWORD
// ==========================================

forgotPassword.addEventListener("click", async () => {
  clearErrors();

  const emailAddress = email.value.trim();

  if (!emailAddress || !isValidEmail(emailAddress)) {
    showFieldError(
      "emailError",
      "Enter your registered email address first."
    );

    email.focus();
    return;
  }

  forgotPassword.disabled = true;

  try {
    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        emailAddress,
        {
          redirectTo: recoveryURL
        }
      );

    if (error) throw error;

    showMessage(
      "If an account exists for this email, a password recovery link will be sent."
    );

  } catch (error) {
    console.error("Password recovery error:", error);
    showMessage(friendlyError(error.message), "error");

  } finally {
    forgotPassword.disabled = false;
  }
});

// ==========================================
// 13. CHECK EXISTING SESSION
// ==========================================

async function checkExistingSession() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session) {
      showMessage(
        "You are already signed in. Opening your dashboard..."
      );

      window.location.replace(dashboardURL);
    }

  } catch (error) {
    console.error("Session check error:", error);
  }
}

// ==========================================
// 14. INITIALIZE
// ==========================================

switchMode("login");

checkExistingSession();

console.log("EXPENSA real authentication initialized.");
