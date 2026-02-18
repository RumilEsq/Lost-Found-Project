document.addEventListener("DOMContentLoaded", async () => {
  const itemsPage = document.getElementById("itemsPageContent");
  if (itemsPage) setTimeout(() => itemsPage.classList.add("show"), 50);

  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  const unclaimedGrid = document.getElementById("unclaimedGrid");
  const claimedGrid = document.getElementById("claimedGrid");
  const noUnclaimedDiv = document.getElementById("noUnclaimed");
  const noClaimedDiv = document.getElementById("noClaimed");

  const imageModal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImg");
  const captionText = document.getElementById("caption");
  const closeImageBtn = document.querySelector(".close-btn");

  const contactModal = document.getElementById("contactModal");
  const contactCloseBtn = document.querySelector(".close-contact");
  const contactName = document.getElementById("contactName");
  const contactEmail = document.getElementById("contactEmail");
  const contactPhone = document.getElementById("contactPhone");
  const copyEmailBtn = document.getElementById("copyEmailBtn");
  const copyPhoneBtn = document.getElementById("copyPhoneBtn");

  const claimConfirmModal = document.getElementById("claimConfirmModal");
  const confirmClaimBtn = document.getElementById("confirmClaimBtn");
  const cancelClaimBtn = document.getElementById("cancelClaimBtn");

  const searchInput = document.getElementById("searchItem");
  const monthFilter = document.getElementById("monthFilter");
  const dayFilter = document.getElementById("dayFilter");
  const yearFilter = document.getElementById("yearFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const typeFilter = document.getElementById("typeFilter");

  if (!unclaimedGrid || !claimedGrid) return;

  let allReports = [];
  let currentClaimReport = null;
  let currentUserRole = "guest";

  // -------------------
  // Fetch current user role
  async function getUserRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return "guest";
    return session.user.user_metadata && session.user.user_metadata.role
      ? session.user.user_metadata.role
      : "user"; // default non-admin
  }

  // -------------------
  // Fetch reports
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
    renderReports(allReports);
  }

  // -------------------
  // Show contact modal
  function showContactModal(report) {
    contactName.textContent = report.reporter_name;
    contactEmail.textContent = report.reporter_email;
    contactPhone.textContent = report.reporter_phone;
    contactModal.style.display = "flex";
  }

  // -------------------
  // Render reports
  async function renderReports(filteredReports) {
    const { data: { session } } = await supabase.auth.getSession();
    currentUserRole = session
      ? (session.user.user_metadata && session.user.user_metadata.role
          ? session.user.user_metadata.role
          : "user")
      : "guest";

    unclaimedGrid.innerHTML = '<h2 style="grid-column:1/-1;color:#fff;">Unclaimed Items</h2>';
    claimedGrid.innerHTML = '<h2 style="grid-column:1/-1;color:#666;">Claimed Items</h2>';

    let hasUnclaimed = false;
    let hasClaimed = false;

    filteredReports.forEach(report => {
      if (!report.approved) return;

      const card = document.createElement("div");
      card.classList.add("item-card");

      let claimButtonText = "Claim";
      let claimButtonDisabled = false;

      if (report.claimed) {
        claimButtonText = "Claimed";
        claimButtonDisabled = true;
      } else if (report.claim_requested) {
        claimButtonText = "Pending Claim Approval";
        claimButtonDisabled = true;
      }

      card.innerHTML = `
        <div class="card-left">
          ${report.photo_url ? `<img src="${report.photo_url}" alt="${report.item_name}">` : `<div class="no-photo">No Photo</div>`}
        </div>
        <div class="card-right">
          <h3>${report.item_name}</h3>
          <p><strong>Type:</strong> ${report.type}</p>
          <p><strong>Category:</strong> ${report.category}</p>
          <p><strong>Location:</strong> ${report.location}</p>
          <p><strong>Date:</strong> ${report.date}</p>
          <button class="claim-btn" data-id="${report.id}" ${claimButtonDisabled ? "disabled" : ""}>${claimButtonText}</button>
        </div>
      `;

      const imgElement = card.querySelector("img");
      const claimBtn = card.querySelector(".claim-btn");

      // -------------------
      // Clicks for image / contact
      card.addEventListener("click", e => {
        if (e.target === claimBtn) return;
        if (imgElement && e.target === imgElement) {
          imageModal.style.display = "flex";
          modalImg.src = report.photo_url;
          captionText.textContent = `${report.item_name} - ${report.category}`;
        } else {
          showContactModal(report);
        }
      });

      // -------------------
      // Non-admin claim requests
      if (!report.claimed && !report.claim_requested && currentUserRole !== "admin") {
        claimBtn.disabled = false;
        claimBtn.addEventListener("click", e => {
          e.stopPropagation();
          currentClaimReport = report;
          claimConfirmModal.style.display = "flex";
          claimConfirmModal.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }

      // -------------------
      // Admin: mark claimed directly
      if (currentUserRole === "admin" && !report.claimed) {
        claimBtn.disabled = false;
        claimBtn.addEventListener("click", async e => {
          e.stopPropagation();
          const { error } = await supabase
            .from("reports")
            .update({ claimed: true, claim_requested: false, claim_requester_email: null })
            .eq("id", report.id);

          if (error) alert("Failed to mark as claimed: " + error.message);
          await loadAndRenderReports();
        });
      }

      // -------------------
      if (report.claimed) {
        claimedGrid.appendChild(card);
        hasClaimed = true;
      } else {
        unclaimedGrid.appendChild(card);
        hasUnclaimed = true;
      }
    });

    noUnclaimedDiv.style.display = hasUnclaimed ? "none" : "block";
    noClaimedDiv.style.display = hasClaimed ? "none" : "block";
  }

  // -------------------
  // Filters
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

  // -------------------
  // Modals handlers
  closeImageBtn.addEventListener("click", () => (imageModal.style.display = "none"));
  imageModal.addEventListener("click", e => { if (e.target === imageModal) imageModal.style.display = "none"; });

  contactCloseBtn.addEventListener("click", () => (contactModal.style.display = "none"));
  contactModal.addEventListener("click", e => { if (e.target === contactModal) contactModal.style.display = "none"; });

  copyEmailBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(contactEmail.textContent);
    alert("Email copied!");
  });

  copyPhoneBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(contactPhone.textContent);
    alert("Phone copied!");
  });

  // -------------------
  // Claim confirm modal
  confirmClaimBtn.addEventListener("click", async () => {
    if (!currentClaimReport) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please login first");
      claimConfirmModal.style.display = "none";
      return;
    }

    const userEmail = session.user.email;

    // ----- FRONTEND IMMEDIATE UPDATE -----
    currentClaimReport.claim_requested = true;

    const cardBtn = document.querySelector(`.item-card button.claim-btn[data-id='${currentClaimReport.id}']`);
    if (cardBtn) {
      cardBtn.textContent = "Pending Claim Approval";
      cardBtn.disabled = true;
    }

    // ----- DATABASE UPDATE -----
    const { error } = await supabase
      .from("reports")
      .update({ claim_requested: true, claim_requester_email: userEmail })
      .eq("id", currentClaimReport.id);

    if (error) {
      alert("Failed to request claim: " + error.message);
      currentClaimReport.claim_requested = false;
      if (cardBtn) {
        cardBtn.textContent = "Claim";
        cardBtn.disabled = false;
      }
    }

    // **DO NOT reload reports for non-admins** to prevent reverting
    // Admins still reload via their direct claim buttons

    currentClaimReport = null;
    claimConfirmModal.style.display = "none";
  });

  cancelClaimBtn.addEventListener("click", () => {
    currentClaimReport = null;
    claimConfirmModal.style.display = "none";
  });

  claimConfirmModal.addEventListener("click", e => {
    if (e.target === claimConfirmModal) {
      currentClaimReport = null;
      claimConfirmModal.style.display = "none";
    }
  });

  // -------------------
  // Initial load
  await getUserRole();
  await loadAndRenderReports();
});
