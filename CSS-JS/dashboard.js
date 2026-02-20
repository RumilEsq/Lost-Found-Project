document.addEventListener("DOMContentLoaded", async function () {
  if (!window.supabase) {
    console.error("Supabase library NOT loaded!");
    return;
  }

  const supabaseClient = supabase.createClient(config.supabase.url, config.supabase.anonKey);

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const signupDiv = document.getElementById("signupSection");
    const navbar = document.getElementById("navbarLinks");

    if (session && session.user) {
      if (signupDiv) signupDiv.style.display = "none";

      const isAdmin = await checkIfAdmin(supabaseClient, session.user.email);

      if (navbar) {
        if (isAdmin) {
          navbar.innerHTML = `<a href="../html/admin.html">Admin</a> | <a href="../html/items.html">Gallery</a> | <a href="#" id="logoutBtn">Logout</a>`;
        } else {
          navbar.innerHTML = `<a href="../html/items.html">Gallery</a> | <a href="#" id="logoutBtn">Logout</a>`;
        }

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = "../html/login.html";
          });
        }
      }
    } else {
      if (signupDiv) signupDiv.style.display = "block";
      if (navbar) {
        navbar.innerHTML = `<a href="../html/login.html">Login</a> | <a href="../html/signup.html">Sign Up</a> | <a href="../html/items.html">Gallery</a>`;
      }
    }

    await loadStats(supabaseClient);
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }

  const fadeElements = document.querySelectorAll(".fade-in-element");
  fadeElements.forEach((el, index) => {
    el.style.opacity = 0;
    el.style.transform = "translateY(20px)";
    setTimeout(() => {
      el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
      el.style.opacity = 1;
      el.style.transform = "translateY(0)";
    }, index * 150);
  });

  const navigateWithFade = (url) => {
    document.body.style.transition = "opacity 0.8s ease-in-out";
    document.body.style.opacity = 0;
    setTimeout(() => { window.location.href = url; }, 800);
  };

  const browseBtn = document.getElementById("browseItemsBtn");
  if (browseBtn) {
    browseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      navigateWithFade("../html/items.html");
    });
  }
});

async function checkIfAdmin(supabase, userEmail) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();
    return !error && !!data;
  } catch (error) {
    return false;
  }
}

async function loadStats(supabase) {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('*');

    if (reports) {
      const claimedCount = reports.filter(r => r.claimed).length;
      const unclaimedCount = reports.filter(r => !r.claimed && r.approved).length;

      document.getElementById('recovered-count').textContent = claimedCount;
      document.getElementById('total-reports').textContent = reports.length;
      document.getElementById('unclaimed-count').textContent = unclaimedCount;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}