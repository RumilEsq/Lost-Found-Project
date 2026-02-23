document.addEventListener("DOMContentLoaded", function () {
  if (!window.supabase) {
    alert("Supabase library NOT loaded!");
    return;
  }

  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  // ===== LOGIN FORM =====
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!email || !password) {
        alert("Email and password required");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert("Login failed: " + error.message);
        return;
      }

      const loginModal = document.getElementById("loginSuccessModal");
      const loginBox = loginModal.querySelector(".login-success-box");
      const closeBtn = document.getElementById("closeLoginSuccess");
      const loginUserEmail = document.getElementById("loginUserEmail");

      loginUserEmail.textContent = email;
      loginModal.style.display = "flex";
      setTimeout(() => loginBox.classList.add("show"), 50);

      closeBtn.onclick = () => {
        loginBox.classList.remove("show");
        setTimeout(() => {
          loginModal.style.display = "none";
          window.location.href = "Dashboard.html";
        }, 300);
      };

      loginModal.onclick = (e) => {
        if (e.target === loginModal) {
          loginBox.classList.remove("show");
          setTimeout(() => {
            loginModal.style.display = "none";
            window.location.href = "Dashboard.html";
          }, 300);
        }
      };
    });
  }

  // ===== SIGNUP FORM WITH STUDENT ID =====
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      try {
        const fullname = document.getElementById("fullname").value.trim();
        const studentInput = document.getElementById("studentID");
        const studentID = studentInput ? studentInput.value.trim() : "";
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!fullname || !studentID || !email || !password || !confirmPassword) {
          alert("All fields are required");
          return;
        }

        if (password !== confirmPassword) {
          alert("Passwords do not match");
          return;
        }

        // Validate Student ID format: CA + 9 digits
        const studentIdPattern = /^CA\d{9}$/;
        if (!studentIdPattern.test(studentID)) {
          alert("Invalid Student ID format. Example: CA202410405");
          return;
        }

        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullname, student_id: studentID } }
        });

        if (error) {
          alert("Signup failed: " + error.message);
          return;
        }

        // Insert into students table
        const { error: insertError } = await supabase.from("students").insert([
          { full_name: fullname, email: email, student_id: studentID }
        ]);

        if (insertError) {
          console.error("Failed to insert student into table:", insertError);
          alert("Signup succeeded, but failed to save student info. Contact admin.");
          return;
        }

        // Show success modal
        const loginCard = document.querySelector(".signup-card");
        const modal = document.getElementById("loginSuccessModal");
        const userEmailSpan = document.getElementById("loginUserEmail");

        loginCard.style.animation = "fadeOut 0.5s forwards";

        setTimeout(() => {
          modal.style.display = "flex";
          userEmailSpan.textContent = email;
          modal.querySelector(".login-success-box").classList.add("show");
        }, 500);

        document.getElementById("closeLoginSuccess").onclick = () => {
          loginCard.style.animation = "";
          modal.querySelector(".login-success-box").classList.remove("show");
          setTimeout(() => {
            modal.style.display = "none";
            window.location.href = "Dashboard.html";
          }, 300);
        };

      } catch (err) {
        console.error("Signup JS error:", err);
        alert("An unexpected error occurred. Check console.");
      }
    });
  }
});
