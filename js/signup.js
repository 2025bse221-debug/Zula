import { supabase } from "./supabaseClient.js";

// Get the elements from your existing signup.html
const signupForm = document.getElementById("signupForm");

const role = document.getElementById("role");
const fullName = document.getElementById("fullname");
const email = document.getElementById("email");
const studentNumber = document.getElementById("studentNumber");
const association = document.getElementById("association");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const terms = document.getElementById("terms");
const message = document.getElementById("message");

const studentGroup = document.getElementById("studentGroup");
const managerGroup = document.getElementById("managerGroup");

// Display the correct fields for each account type
function updateAccountFields() {
    if (role.value === "student") {
        studentGroup.classList.remove("hidden");
        managerGroup.classList.add("hidden");

        studentNumber.required = true;
        association.required = false;
        association.value = "";
    } else {
        studentGroup.classList.add("hidden");
        managerGroup.classList.remove("hidden");

        studentNumber.required = false;
        association.required = true;
        studentNumber.value = "";
    }

    message.textContent = "";
    message.className = "message";
}

role.addEventListener("change", updateAccountFields);

// Display registration messages
function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
}

// Register the user with Supabase
signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Read the values entered by the user
    const nameValue = fullName.value.trim();
    const emailValue = email.value.trim();
    const studentNumberValue = studentNumber.value.trim();
    const associationValue = association.value.trim();
    const passwordValue = password.value;
    const confirmPasswordValue = confirmPassword.value;
    const selectedRole = role.value;

    // Check that the passwords match
    if (passwordValue !== confirmPasswordValue) {
        showMessage("Your passwords do not match.", "error");
        return;
    }

    // Check the password length
    if (passwordValue.length < 8) {
        showMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    // Check the agreement
    if (!terms.checked) {
        showMessage("Please agree to the registration terms.", "error");
        return;
    }

    // Check the fields required for each role
    if (selectedRole === "student" && !studentNumberValue) {
        showMessage("Please enter your student number.", "error");
        return;
    }

    if (selectedRole === "manager" && !associationValue) {
        showMessage(
            "Please enter your association or organization.",
            "error"
        );
        return;
    }

    // Prevent repeated submissions
    const submitButton = signupForm.querySelector(
        'button[type="submit"]'
    );

    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Creating Account...";

    try {
        showMessage("Creating your account. Please wait...", "success");

        // Always request the student role initially.
        // Event Manager privileges require administrator approval.
        const { data, error } = await supabase.auth.signUp({
            email: emailValue,
            password: passwordValue,

            options: {
                data: {
                    full_name: nameValue,

                    student_number:
                        selectedRole === "student"
                            ? studentNumberValue
                            : null,

                    association:
                        selectedRole === "manager"
                            ? associationValue
                            : null,

                    requested_role: selectedRole
                }
            }
        });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error(
                "Registration did not return a user. Please try again."
            );
        }

        // Students do not need an Event Manager approval request.
        if (selectedRole === "student") {
            showMessage(
                data.session
                    ? "Your account has been created successfully! You can now sign in."
                    : "Registration submitted successfully! Please check your email if confirmation is required.",
                "success"
            );

            signupForm.reset();
            updateAccountFields();

            return;
        }

        /*
         * Event Manager registration:
         *
         * The profile trigger should create the user's profile.
         * The profile role must remain student until approval.
         *
         * Only create the request if this browser has an authenticated
         * session, because the request table requires authentication.
         */

        if (!data.session) {
            showMessage(
                "Your account has been created, but your Event Manager request has not yet been submitted. Please confirm your email, sign in, and submit the request again. Do not register a second time.",
                "error"
            );

            return;
        }

        // Confirm that the authenticated user is the new account.
        const { data: authData, error: authError } =
            await supabase.auth.getUser();

        if (authError) {
            throw authError;
        }

        if (!authData.user || authData.user.id !== data.user.id) {
            throw new Error(
                "We could not verify your account. Please sign in and try again."
            );
        }

        // Confirm the profile exists and has not been granted manager access.
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", data.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            throw new Error(
                "Your account was created, but your profile was not found. Please contact the Zula administrator."
            );
        }

        if (profile.role !== "student") {
            throw new Error(
                "Your account role is not in the expected state. Please contact the Zula administrator before continuing."
            );
        }

        // Create the Event Manager approval request.
        const { error: requestError } = await supabase
            .from("event_manager_requests")
            .insert({
                user_id: data.user.id,
                status: "pending"
            });

        if (requestError) {
            // A duplicate request may already exist.
            if (requestError.code === "23505") {
                showMessage(
                    "Your Event Manager request has already been submitted and is awaiting review.",
                    "success"
                );
            } else {
                throw requestError;
            }
        } else {
            showMessage(
                "Your account has been created successfully! Your Event Manager request has been submitted and is awaiting administrator approval. You can sign in as a student while waiting.",
                "success"
            );
        }

        signupForm.reset();
        updateAccountFields();

    } catch (error) {
        console.error("Registration error:", error);

        showMessage(
            error.message ||
                "Registration failed. Please try again.",
            "error"
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

// Set the correct fields when the page first opens
updateAccountFields();
