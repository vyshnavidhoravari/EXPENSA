
const supabaseClient = window.expensaSupabase;

const resetForm = document.getElementById("resetForm");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const resetButton = document.getElementById("resetButton");
const resetMessage = document.getElementById("resetMessage");

function showResetMessage(message, isError = false) {
    resetMessage.textContent = message;
    resetMessage.style.color = isError ? "#dc2626" : "#26765b";
}

resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (newPassword.value.length < 8) {
        showResetMessage("Password must contain at least 8 characters.", true);
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        showResetMessage("Passwords do not match.", true);
        return;
    }

    resetButton.disabled = true;
    resetButton.textContent = "Updating...";

    try {
        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            throw new Error("Recovery session missing or expired. Request a new reset link.");
        }

        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword.value
        });

        if (error) throw error;

        showResetMessage("Password updated successfully! Redirecting to login...");

        resetForm.reset();

        setTimeout(() => {
            window.location.replace("auth.html");
        }, 2000);

    } catch (error) {
        console.error("Password reset error:", error);
        showResetMessage(error.message || "Unable to update password.", true);
    } finally {
        resetButton.disabled = false;
        resetButton.textContent = "Update Password";
    }
});
