document.addEventListener("DOMContentLoaded", async function () {
  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please login first");
      window.location.href = "login.html";
      return;
    }

    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle();

    if (adminError) {
      console.error("Admin check error:", adminError);
      alert("Error checking admin status. Please ensure the admin_users table exists in your database.");
      window.location.href = "Dashboard.html";
      return;
    }

    if (!adminCheck) {
      alert("Access denied. Admin only.");
      window.location.href = "Dashboard.html";
      return;
    }

    loadStats();
    loadReports();
    loadUsers();
    loadAdminUsers();

    const navButtons = document.querySelectorAll(".admin-nav button");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
        document.getElementById(btn.dataset.section).classList.add("active");
      });
    });

    document.getElementById("addAdminForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("adminEmail").value.trim();
      
      if (!email) {
        alert("Please enter an email");
        return;
      }

      const { error } = await supabase
        .from("admin_users")
        .insert([{ email: email }]);

      if (error) {
        alert("Error adding admin: " + error.message);
      } else {
        alert("Admin added successfully");
        document.getElementById("adminEmail").value = "";
        loadAdminUsers();
      }
    });

  } catch (error) {
    console.error("Admin error:", error);
    alert("Error loading admin panel: " + error.message);
    window.location.href = "Dashboard.html";
  }

  async function loadStats() {
    try {
      const { data: reports, error } = await supabase.from("reports").select("*");

      if (error) {
        console.error("Stats error:", error);
        return;
      }

      if (reports) {
        document.getElementById("totalReports").textContent = reports.length;
        document.getElementById("pendingReports").textContent = reports.filter(r => !r.claimed).length;
        document.getElementById("claimedItems").textContent = reports.filter(r => r.claimed).length;
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function loadReports() {
    try {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      const tbody = document.getElementById("reportsTable");
      
      if (error) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">Error loading reports: ' + error.message + '</td></tr>';
        return;
      }

      if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">No reports found</td></tr>';
        return;
      }

      tbody.innerHTML = reports.map(report => `
        <tr>
          <td>${report.photo_url ? `<img src="${report.photo_url}" alt="${report.item_name}">` : '<div style="width:60px;height:60px;background:#e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">No photo</div>'}</td>
          <td><strong>${report.item_name}</strong><br><small style="color:#666;">${report.location}</small></td>
          <td><span style="padding:4px 8px;background:${report.type === 'lost' ? '#fef3c7' : '#d1fae5'};border-radius:4px;font-size:11px;text-transform:uppercase;">${report.type}</span></td>
          <td>${report.category}</td>
          <td>${report.reporter_name}<br><small style="color:#666;">${report.reporter_email}</small></td>
          <td>${new Date(report.date).toLocaleDateString()}</td>
          <td><span style="padding:4px 8px;background:${report.claimed ? '#d1fae5' : '#fef3c7'};border-radius:4px;font-size:11px;">${report.claimed ? 'Claimed' : 'Active'}</span></td>
          <td>
            <div class="admin-actions">
              <button class="btn-view" onclick="viewReport('${report.id}')">View</button>
              <button class="btn-delete" onclick="deleteReport('${report.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  }

  async function loadUsers() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">User management requires admin API access</td></tr>';
  }

  async function loadAdminUsers() {
    try {
      const { data: admins, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      const tbody = document.getElementById("adminUsersTable");
      
      if (error) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #666;">Error: ' + error.message + '</td></tr>';
        return;
      }

      if (!admins || admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #666;">No admin users</td></tr>';
        return;
      }

      tbody.innerHTML = admins.map(admin => `
        <tr>
          <td>${admin.email}</td>
          <td>${new Date(admin.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn-delete" onclick="removeAdmin('${admin.id}')">Remove</button>
          </td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Error loading admin users:", error);
    }
  }

  window.viewReport = async function(reportId) {
    try {
      const { data: report, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) {
        alert("Error loading report: " + error.message);
        return;
      }

      if (report) {
        alert(`Item: ${report.item_name}\nType: ${report.type}\nCategory: ${report.category}\nLocation: ${report.location}\nDescription: ${report.description}\nReporter: ${report.reporter_name}\nEmail: ${report.reporter_email}\nPhone: ${report.reporter_phone}\nDate: ${report.date}`);
      }
    } catch (error) {
      console.error("Error viewing report:", error);
      alert("Error viewing report: " + error.message);
    }
  };

  window.deleteReport = async function(reportId) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        alert("Error deleting report: " + error.message);
      } else {
        alert("Report deleted successfully");
        loadReports();
        loadStats();
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Error deleting report: " + error.message);
    }
  };

  window.removeAdmin = async function(adminId) {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", adminId);

      if (error) {
        alert("Error removing admin: " + error.message);
      } else {
        alert("Admin removed successfully");
        loadAdminUsers();
      }
    } catch (error) {
      console.error("Error removing admin:", error);
      alert("Error removing admin: " + error.message);
    }
  };
});