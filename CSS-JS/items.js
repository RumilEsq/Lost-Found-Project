document.addEventListener("DOMContentLoaded", async () => {

  // --- Inject claimed badge styles dynamically ---
  const style = document.createElement("style");
  style.textContent = `
    .item-card.claimed {
      position: relative;
      opacity: 0.7;
    }
    .item-card.claimed::after {
      content: "CLAIMED";
      position: absolute;
      top: 10px;
      right: 10px;
      background: #ef4444;
      color: #fff;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10;
    }
    .item-card.claimed button {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;
  document.head.appendChild(style);

  const itemsPage = document.getElementById("itemsPageContent");
  if (itemsPage) setTimeout(() => itemsPage.classList.add("show"), 50);

  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  const foundColumn = document.getElementById("foundColumn");
  const lostColumn = document.getElementById("lostColumn");

  const imageModal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");
  const captionText = document.getElementById("caption");
  const closeImageBtn = document.querySelector(".close-btn");

  const contactModal = document.getElementById("contactModal");
  const contactCloseBtn = document.querySelector(".close-contact");
  const contactName = document.getElementById("contactName");
  const contactEmail = document.getElementById("contactEmail");
  const copyEmailBtn = document.getElementById("copyEmailBtn");

  const proofModal = document.getElementById("proofModal");
  const proofCloseBtn = document.getElementById("proofCloseBtn");
  const proofCancelBtn = document.getElementById("proofCancelBtn");
  const proofSubmitBtn = document.getElementById("proofSubmitBtn");
  const proofFile = document.getElementById("proofFile");
  const proofModalTitle = document.getElementById("proofModalTitle");
  const proofModalDesc = document.getElementById("proofModalDesc");

  const searchInput = document.getElementById("searchItem");
  const monthFilter = document.getElementById("monthFilter");
  const dayFilter = document.getElementById("dayFilter");
  const yearFilter = document.getElementById("yearFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const typeFilter = document.getElementById("typeFilter");

  let allReports = [];
  let currentActionReport = null;
  let currentActionType = null;
  let currentUserEmail = null;
  let currentSession = null;

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;
    if (session) currentUserEmail = session.user.email;
    return session;
  }

  async function isAdmin(session) {
    if (!session) return false;
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", session.user.email)
      .maybeSingle();
    return !!data;
  }

  async function loadAndRenderReports() {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading items:", error.message);
      return;
    }

    allReports = reports || [];
    allReports.sort((a, b) => (a.claimed === b.claimed) ? 0 : a.claimed ? 1 : -1);
    renderReports(allReports);
  }

  function showContactModal(report) {
    contactName.textContent = report.reporter_name;
    contactEmail.textContent = report.reporter_email;
    contactModal.style.display = "flex";
  }

  async function renderReports(filteredReports) {
    const session = await getSession();
    const adminUser = await isAdmin(session);

    foundColumn.innerHTML = `<div class="column-header column-header-found">Found Items</div>`;
    lostColumn.innerHTML = `<div class="column-header column-header-lost">Lost Items</div>`;

    let hasFound = false;
    let hasLost = false;

    filteredReports.forEach(report => {
      if (!report.approved) return;

      const card = document.createElement("div");
      card.classList.add("item-card");
      if (report.claimed) card.classList.add("claimed"); // <-- mark fully claimed

      let actionBtn = "";

      if (report.type === "found") {
        if (report.claimed) {
          actionBtn = `<button class="claim-btn" disabled>Claimed</button>`;
        } else if (report.claim_requested) {
          actionBtn = `<button class="claim-btn" disabled>Pending Approval</button>`;
        } else {
          actionBtn = `<button class="claim-btn action-btn" data-id="${report.id}" data-action="claim">Claim This Item</button>`;
        }
      } else if (report.type === "lost") {
        if (report.claimed) {
          actionBtn = `<button class="found-it-btn" disabled>Returned to Owner</button>`;
        } else if (report.claim_requested) {
          actionBtn = `<button class="found-it-btn" disabled>Pending Verification</button>`;
        } else {
          actionBtn = `<button class="found-it-btn action-btn" data-id="${report.id}" data-action="found">I Found This</button>`;
        }
      }

      card.innerHTML = `
        <div class="card-left">
          ${report.photo_url
            ? `<img src="${report.photo_url}" alt="${report.item_name}" class="card-img">`
            : `<div class="no-photo">No Photo</div>`}
        </div>
        <div class="card-right">
          <h3>${report.item_name}</h3>
          <p><strong>Category:</strong> ${report.category}</p>
          <p><strong>Location:</strong> ${report.location}</p>
          <p><strong>Date:</strong> ${report.date}</p>
          ${adminUser && !report.claimed ? `<button class="claim-btn admin-mark-btn" data-id="${report.id}" style="background:#f59e0b;margin-top:6px;">Mark as Claimed</button>` : ""}
          ${actionBtn}
        </div>
      `;

      const imgEl = card.querySelector(".card-img");
      if (imgEl) {
        imgEl.addEventListener("click", e => {
          e.stopPropagation();
          imageModal.style.display = "flex";
          modalImg.src = report.photo_url;
          captionText.textContent = `${report.item_name} - ${report.category}`;
        });
      }

      card.addEventListener("click", e => {
        if (e.target.classList.contains("action-btn") || e.target.classList.contains("admin-mark-btn")) return;
        if (e.target.classList.contains("card-img")) return;
        showContactModal(report);
      });

      const actionBtnEl = card.querySelector(".action-btn");
      if (actionBtnEl) {
        actionBtnEl.addEventListener("click", e => {
          e.stopPropagation();
          if (!session) {
            alert("Please login first to perform this action.");
            return;
          }
          currentActionReport = report;
          currentActionType = actionBtnEl.dataset.action;
          proofFile.value = "";

          const infoPhoto = document.getElementById("proofInfoPhoto");
          const infoNoPhoto = document.getElementById("proofInfoNoPhoto");
          if (report.photo_url) {
            infoPhoto.src = report.photo_url;
            infoPhoto.style.display = "block";
            infoNoPhoto.style.display = "none";
          } else {
            infoPhoto.style.display = "none";
            infoNoPhoto.style.display = "flex";
          }

          document.getElementById("proofInfoName").textContent = report.item_name;
          document.getElementById("proofInfoCategory").textContent = report.category;
          document.getElementById("proofInfoLocation").textContent = report.location;
          document.getElementById("proofInfoDate").textContent = report.date;
          document.getElementById("proofInfoDescription").textContent = report.description || "No description provided";
          document.getElementById("proofInfoReporterName").textContent = report.reporter_name;
          document.getElementById("proofInfoEmail").textContent = report.reporter_email;

          const fbEl = document.getElementById("proofInfoFacebook");
          if (report.reporter_facebook) {
            fbEl.innerHTML = `<a href="${report.reporter_facebook}" target="_blank" style="color:#60a5fa;">View Profile</a>`;
          } else {
            fbEl.textContent = "Not provided";
          }

          document.getElementById("proofModalTitle").textContent = "Item Details";
          document.getElementById("proofUploadTitle").textContent = currentActionType === "claim" ? "Claim This Item" : "I Found This Item";
          document.getElementById("proofModalDesc").textContent = currentActionType === "claim"
            ? "Please upload a photo as proof that this item belongs to you (e.g. photo with the item, receipt, or any identifying proof)."
            : "Please upload a photo as proof that you found this item so the owner can verify and contact you.";

          proofModal.classList.add("show");
        });
      }

      const adminMarkBtn = card.querySelector(".admin-mark-btn");
      if (adminMarkBtn) {
        adminMarkBtn.addEventListener("click", async e => {
          e.stopPropagation();
          if (!confirm("Mark this item as claimed?")) return;

          const { error } = await supabase
            .from("reports")
            .update({ claimed: true, claim_requested: false })
            .eq("id", report.id);

          if (error) {
            alert("Failed: " + error.message);
          } else {
            await loadAndRenderReports();
          }
        });
      }

      if (report.type === "found") {
        foundColumn.appendChild(card);
        hasFound = true;
      } else {
        lostColumn.appendChild(card);
        hasLost = true;
      }
    });

    if (!hasFound) {
      const empty = document.createElement("p");
      empty.style.cssText = "color:#aaa;text-align:center;padding:30px;font-style:italic;";
      empty.textContent = "No found items yet.";
      foundColumn.appendChild(empty);
    }

    if (!hasLost) {
      const empty = document.createElement("p");
      empty.style.cssText = "color:#aaa;text-align:center;padding:30px;font-style:italic;";
      empty.textContent = "No lost items yet.";
      lostColumn.appendChild(empty);
    }
  }

  function filterReports() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedMonth = monthFilter.value;
    const selectedDay = dayFilter.value;
    const selectedYear = yearFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedType = typeFilter.value;

    const filtered = allReports.filter(report => {
      const matchesSearch =
        report.item_name.toLowerCase().includes(searchTerm) ||
        (report.description && report.description.toLowerCase().includes(searchTerm)) ||
        report.location.toLowerCase().includes(searchTerm);

      const reportDate = new Date(report.date);
      const reportMonth = String(reportDate.getMonth() + 1).padStart(2, "0");
      const reportDay = String(reportDate.getDate()).padStart(2, "0");
      const reportYear = String(reportDate.getFullYear());

      const matchesMonth = !selectedMonth || reportMonth === selectedMonth;
      const matchesDay = !selectedDay || reportDay === selectedDay;
      const matchesYear = !selectedYear || reportYear === selectedYear;
      const matchesCategory = !selectedCategory || report.category === selectedCategory;
      const matchesType = !selectedType || report.type === selectedType;

      return matchesSearch && matchesMonth && matchesDay && matchesYear && matchesCategory && matchesType;
    });

    renderReports(filtered);
  }

  searchInput.addEventListener("input", filterReports);
  monthFilter.addEventListener("change", filterReports);
  dayFilter.addEventListener("change", filterReports);
  yearFilter.addEventListener("change", filterReports);
  categoryFilter.addEventListener("change", filterReports);
  typeFilter.addEventListener("change", filterReports);

  closeImageBtn.addEventListener("click", () => (imageModal.style.display = "none"));
  imageModal.addEventListener("click", e => { if (e.target === imageModal) imageModal.style.display = "none"; });

  contactCloseBtn.addEventListener("click", () => (contactModal.style.display = "none"));
  contactModal.addEventListener("click", e => { if (e.target === contactModal) contactModal.style.display = "none"; });

  copyEmailBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(contactEmail.textContent).then(() => {
      copyEmailBtn.textContent = "Copied!";
      setTimeout(() => { copyEmailBtn.textContent = "Copy Email"; }, 2000);
    });
  });

  proofCloseBtn.addEventListener("click", () => proofModal.classList.remove("show"));
  proofCancelBtn.addEventListener("click", () => proofModal.classList.remove("show"));

  proofSubmitBtn.addEventListener("click", async () => {
    if (!currentActionReport) return;

    const file = proofFile.files[0];
    if (!file) {
      alert("Please upload a proof photo.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    proofSubmitBtn.disabled = true;
    proofSubmitBtn.textContent = "Submitting...";

    const fileExt = file.name.split(".").pop();
    const fileName = `proof_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, file);

    if (uploadError) {
      alert("Failed to upload proof photo: " + uploadError.message);
      proofSubmitBtn.disabled = false;
      proofSubmitBtn.textContent = "Submit";
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("reports").getPublicUrl(fileName);
    const proofUrl = publicUrlData.publicUrl;

    const { error } = await supabase
      .from("reports")
      .update({
        claim_requested: true,
        claim_requester_email: currentUserEmail,
        proof_url: proofUrl
      })
      .eq("id", currentActionReport.id);

    proofSubmitBtn.disabled = false;
    proofSubmitBtn.textContent = "Submit";

    if (error) {
      alert("Failed to submit: " + error.message);
    } else {
      proofModal.classList.remove("show");
      alert(currentActionType === "claim"
        ? "Claim request submitted. The admin will review and approve it."
        : "Your finding has been submitted. The admin will notify the owner.");
      currentActionReport = null;
      currentActionType = null;
      await loadAndRenderReports();
    }
  });

  await getSession();
  await loadAndRenderReports();
});
