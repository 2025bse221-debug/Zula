import { supabase } from "./supabaseClient.js";

// Get elements from signin.html
const signinForm = document.getElementById("signinForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const rememberMe = document.getElementById("rememberMe");
const forgotPassword = document.getElementById("forgotPassword");
const message = document.getElementById("message");
const signinButton = signinForm.querySelector('button[type="submit"]');


// Display messages to the user
function showMessage(text, type = "") {
    message.textContent = text;
    message.className = type ? `message ${type}` : "message";
}


// Show or hide the password
togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "Show";
    }
});


// Sign in using Supabase Authentication
signinForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.", "error");
        return;
    }

    signinButton.disabled = true;
    signinButton.textContent = "Signing In...";

    try {
        showMessage("Verifying your account. Please wait...");

        // Authenticate the user
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        const user = data.user;

        // Retrieve the user's profile and role
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            await supabase.auth.signOut();
            throw new Error(
                "Your profile was not found. Please contact the administrator."
            );
        }

        // Redirect according to the role stored in the database
        if (profile.role === "student") {
            window.location.href = "studentDashboard.html";

        } else if (profile.role === "event_manager") {
            window.location.href = "eventManagerDashboard.html";

        } else if (profile.role === "admin") {
            window.location.href = "adminDashboard.html";

        } else {
            await supabase.auth.signOut();
            throw new Error(
                "Your account role is not recognized. Please contact the administrator."
            );
        }

    } catch (error) {
        console.error("Sign-in error:", error);

        showMessage(
            error.message || "Sign-in failed. Please try again.",
            "error"
        );

    } finally {
        signinButton.disabled = false;
        signinButton.textContent = "Sign In →";
    }
});


// Send a password-reset email
forgotPassword.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showMessage(
            "Please enter your email address first, then click Forgot password."
        );
        emailInput.focus();
        return;
    }

    try {
        forgotPassword.textContent = "Sending...";

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/resetPassword.html"
        });

        if (error) {
            throw error;
        }

        showMessage(
            "If an account exists for this email, a password-reset link will be sent. Check your inbox."
        );

    } catch (error) {
        console.error("Password reset error:", error);

        showMessage(
            error.message || "Unable to request a password reset. Please try again.",
            "error"
        );

    } finally {
        forgotPassword.textContent = "Forgot password?";
    }
});
