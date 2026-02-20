document.addEventListener("DOMContentLoaded", async function () {
  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", session.user.email)
    .maybeSingle();

  if (!adminCheck) {
    alert("Access denied. Admins only.");
    window.location.href = "Dashboard.html";
    return;
  }

  loadStats();
  loadReports();
  loadUsers();
  loadAdminUsers();

  document.querySelectorAll(".admin-nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
      document.getElementById(btn.dataset.section).classList.add("active");
    });
  });

  document.getElementById("addAdminForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    if (!email) return;

    const { error } = await supabase.from("admin_users").insert([{ email }]);
    if (error) {
      alert("Error adding admin: " + error.message);
    } else {
      document.getElementById("adminEmail").value = "";
      loadAdminUsers();
    }
  });

  async function loadStats() {
    const { data: reports } = await supabase.from("reports").select("*");
    if (!reports) return;
    document.getElementById("totalReports").textContent = reports.length;
    document.getElementById("pendingReports").textContent = reports.filter(r => !r.approved).length;
    document.getElementById("claimedItems").textContent = reports.filter(r => r.claimed).length;
  }

  async function loadReports() {
    const tbody = document.getElementById("reportsTable");
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#666;">Loading...</td></tr>`;

    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#666;">Error: ${error.message}</td></tr>`;
      return;
    }

    if (!reports || reports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#666;">No reports found</td></tr>`;
      return;
    }

    tbody.innerHTML = reports.map(report => `
      <tr>
        <td>
          ${report.photo_url
            ? `<img src="${report.photo_url}" alt="${report.item_name}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">`
            : `<div style="width:60px;height:60px;background:#e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">No photo</div>`}
        </td>
        <td>
          <strong>${report.item_name}</strong><br>
          <small style="color:#666;">${report.location}</small>
          ${report.proof_url ? `<br><a href="${report.proof_url}" target="_blank" style="font-size:11px;color:#2563eb;">View Proof</a>` : ""}
        </td>
        <td><span style="padding:4px 8px;background:${report.type === "lost" ? "#fef3c7" : "#d1fae5"};border-radius:4px;font-size:11px;text-transform:uppercase;">${report.type}</span></td>
        <td>${report.category}</td>
        <td>${report.reporter_name}<br><small style="color:#666;">${report.reporter_email}</small></td>
        <td>${new Date(report.date).toLocaleDateString()}</td>
        <td>
          <span style="padding:4px 8px;background:${report.claimed ? "#d1fae5" : (report.approved ? "#dbeafe" : "#fef3c7")};border-radius:4px;font-size:11px;">
            ${report.claimed ? "Claimed" : (report.approved ? "Active" : "Pending")}
          </span>
        </td>
        <td>
          <div class="admin-actions">
            <button class="btn-view" onclick="viewReport('${report.id}')">View</button>
            ${!report.approved ? `<button class="btn-approve" onclick="approveReport('${report.id}')">Approve</button>` : ""}
            ${report.claim_requested && !report.claimed ? `<button class="btn-approve" onclick="approveClaim('${report.id}')">Approve Claim</button>` : ""}
            ${report.approved && !report.claimed ? `<button style="background:#f59e0b;color:#fff;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px;" onclick="markClaimed('${report.id}')">Mark Claimed</button>` : ""}
            <button class="btn-delete" onclick="deleteReport('${report.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  async function loadUsers() {
    const tbody = document.getElementById("usersTable");

    const { data: reports, error } = await supabase
      .from("reports")
      .select("user_id, reporter_name, reporter_email, created_at")
      .order("created_at", { ascending: true });

    if (error || !reports || reports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#666;">${error ? error.message : "No users found"}</td></tr>`;
      return;
    }

    const usersMap = {};
    reports.forEach(r => {
      const key = r.reporter_email;
      if (!usersMap[key]) {
        usersMap[key] = { email: r.reporter_email, name: r.reporter_name, joined: r.created_at, reportCount: 1 };
      } else {
        usersMap[key].reportCount++;
      }
    });

    const users = Object.values(usersMap);
    document.getElementById("totalUsers").textContent = users.length;

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.email}</td>
        <td>${user.name}</td>
        <td>${new Date(user.joined).toLocaleDateString()}</td>
        <td><span style="background:#dbeafe;padding:3px 8px;border-radius:4px;font-size:12px;">${user.reportCount}</span></td>
        <td><button class="btn-view" onclick="viewUserReports('${user.email}')">View Reports</button></td>
      </tr>
    `).join("");
  }

  async function loadAdminUsers() {
    const tbody = document.getElementById("adminUsersTable");

    const { data: admins, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !admins || admins.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:#666;">${error ? error.message : "No admin users"}</td></tr>`;
      return;
    }

    tbody.innerHTML = admins.map(admin => `
      <tr>
        <td>${admin.email}</td>
        <td>${new Date(admin.created_at).toLocaleDateString()}</td>
        <td><button class="btn-delete" onclick="removeAdmin('${admin.id}')">Remove</button></td>
      </tr>
    `).join("");
  }

  window.viewReport = async function (reportId) {
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error || !report) {
      alert("Could not load report.");
      return;
    }

    document.getElementById("viewModalItemName").textContent = report.item_name;

    const typeEl = document.getElementById("viewModalType");
    typeEl.textContent = report.type.toUpperCase();
    typeEl.style.background = report.type === "lost" ? "#fef3c7" : "#d1fae5";
    typeEl.style.color = report.type === "lost" ? "#92400e" : "#065f46";

    const photoEl = document.getElementById("viewModalPhoto");
    if (report.photo_url) {
      photoEl.src = report.photo_url;
      photoEl.style.display = "block";
    } else {
      photoEl.style.display = "none";
    }

    document.getElementById("viewModalCategory").textContent = report.category;
    document.getElementById("viewModalLocation").textContent = report.location;
    document.getElementById("viewModalDate").textContent = new Date(report.date).toLocaleDateString();
    document.getElementById("viewModalDescription").textContent = report.description || "No description provided";
    document.getElementById("viewModalReporter").textContent = report.reporter_name;
    document.getElementById("viewModalEmail").textContent = report.reporter_email;
    document.getElementById("viewModalClaimRequester").textContent = report.claim_requester_email || "None";

    const proofLink = document.getElementById("viewModalProofLink");
    if (report.proof_url) {
      proofLink.href = report.proof_url;
      proofLink.style.display = "inline-block";
    } else {
      proofLink.style.display = "none";
    }

    document.getElementById("viewReportModal").style.display = "flex";
  };

  window.deleteReport = async function (reportId) {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;

    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) {
      alert("Error deleting report: " + error.message);
    } else {
      loadReports();
      loadStats();
    }
  };

  window.approveReport = async function (reportId) {
    const { error } = await supabase.from("reports").update({ approved: true }).eq("id", reportId);
    if (error) {
      alert("Error approving report: " + error.message);
    } else {
      loadReports();
      loadStats();
    }
  };

  window.approveClaim = async function (reportId) {
    const { error } = await supabase
      .from("reports")
      .update({ claimed: true, claim_requested: false })
      .eq("id", reportId);

    if (error) {
      alert("Error approving claim: " + error.message);
    } else {
      loadReports();
      loadStats();
    }
  };

  window.markClaimed = async function (reportId) {
    if (!confirm("Mark this item as claimed?")) return;

    const { error } = await supabase
      .from("reports")
      .update({ claimed: true, claim_requested: false })
      .eq("id", reportId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      loadReports();
      loadStats();
    }
  };

  window.viewUserReports = async function (email) {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("reporter_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error loading reports: " + error.message);
      return;
    }

    document.getElementById("userReportsTitle").textContent = "Reports by " + email;
    document.getElementById("userReportsList").innerHTML = reports.length === 0
      ? `<p style="color:#666;text-align:center;padding:20px;">No reports found.</p>`
      : reports.map(r => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;display:flex;gap:14px;align-items:flex-start;">
          ${r.photo_url
            ? `<img src="${r.photo_url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
            : `<div style="width:70px;height:70px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;flex-shrink:0;">No photo</div>`}
          <div style="flex:1;">
            <strong style="font-size:15px;">${r.item_name}</strong>
            <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;">
              <span style="padding:2px 8px;background:${r.type === "lost" ? "#fef3c7" : "#d1fae5"};border-radius:4px;font-size:11px;text-transform:uppercase;">${r.type}</span>
              <span style="padding:2px 8px;background:#f3f4f6;border-radius:4px;font-size:11px;">${r.category}</span>
              <span style="padding:2px 8px;background:${r.claimed ? "#d1fae5" : (r.approved ? "#dbeafe" : "#fef3c7")};border-radius:4px;font-size:11px;">${r.claimed ? "Claimed" : (r.approved ? "Active" : "Pending")}</span>
            </div>
            <p style="margin:6px 0 0;font-size:13px;color:#555;">${r.location} - ${new Date(r.date).toLocaleDateString()}</p>
          </div>
        </div>
      `).join("");

    document.getElementById("userReportsModal").style.display = "flex";
  };

  window.removeAdmin = async function (adminId) {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    const { error } = await supabase.from("admin_users").delete().eq("id", adminId);
    if (error) {
      alert("Error removing admin: " + error.message);
    } else {
      loadAdminUsers();
    }
  };

  document.getElementById("viewReportModal").addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
  });

  document.getElementById("userReportsModal").addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
  });
});