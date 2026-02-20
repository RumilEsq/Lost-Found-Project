document.addEventListener("DOMContentLoaded", function () {
  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  const resetForm = document.getElementById("resetPasswordForm");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirm-password");
  const passwordError = document.getElementById("passwordError");
  const confirmError = document.getElementById("confirmError");

  if (resetForm) {
    resetForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      passwordError.style.display = "none";
      confirmError.style.display = "none";

      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;

      if (password.length < 6) {
        passwordError.style.display = "block";
        return;
      }

      if (password !== confirmPassword) {
        confirmError.style.display = "block";
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        alert("Error resetting password: " + error.message);
      } else {
        alert("Password reset successful! Please login with your new password.");
        window.location.href = "login.html";
      }
    });
  }
});