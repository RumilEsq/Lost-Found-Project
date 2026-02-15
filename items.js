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

  const searchInput = document.getElementById("searchItem");
  const monthFilter = document.getElementById("monthFilter");
  const dayFilter = document.getElementById("dayFilter");
  const yearFilter = document.getElementById("yearFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const typeFilter = document.getElementById("typeFilter");

  if (!unclaimedGrid || !claimedGrid) return;

  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error loading items:", error.message);
    return;
  }

  let allReports = reports || [];

  function showContactModal(report) {
    contactName.textContent = report.reporter_name;
    contactEmail.textContent = report.reporter_email;
    contactPhone.textContent = report.reporter_phone;
    contactModal.style.display = "flex";
  }

  function renderReports(filteredReports) {
    unclaimedGrid.innerHTML = '<h2 style="grid-column:1/-1;color:#fff;">Unclaimed Items</h2>';
    claimedGrid.innerHTML = '<h2 style="grid-column:1/-1;color:#ccc;">Claimed Items</h2>';
    
    let hasUnclaimed = false;
    let hasClaimed = false;

    filteredReports.forEach(report => {
      const card = document.createElement("div");
      card.classList.add("item-card");

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
          <button class="claim-btn" ${report.claimed ? 'disabled' : ''}>${report.claimed ? "Claimed" : "Claim"}</button>
        </div>
      `;

      const imgElement = card.querySelector("img");
      const claimBtn = card.querySelector(".claim-btn");

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

      if (claimBtn && !report.claimed) {
        claimBtn.addEventListener("click", async e => {
          e.stopPropagation();
          
          if (!confirm("Are you sure you want to claim this item?")) return;
          
          const { error } = await supabase
            .from("reports")
            .update({ claimed: true })
            .eq("id", report.id);
            
          if (error) {
            alert("Failed to claim item: " + error.message);
            return;
          }

          claimBtn.textContent = "Claimed";
          claimBtn.disabled = true;
          claimBtn.style.background = "#888";
          claimBtn.style.cursor = "not-allowed";

          setTimeout(() => {
            claimedGrid.appendChild(card);
            hasClaimed = true;
            noClaimedDiv.style.display = "none";

            const unclaimedCards = unclaimedGrid.querySelectorAll(".item-card");
            if (unclaimedCards.length === 0) {
              noUnclaimedDiv.style.display = "block";
            }
          }, 300);
        });
      }

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

  function filterReports() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedMonth = monthFilter.value;
    const selectedDay = dayFilter.value;
    const selectedYear = yearFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedType = typeFilter.value;

    const filtered = allReports.filter(report => {
      const matchesSearch = report.item_name.toLowerCase().includes(searchTerm) ||
                          report.description.toLowerCase().includes(searchTerm) ||
                          report.location.toLowerCase().includes(searchTerm);
      
      const reportDate = new Date(report.date);
      const reportMonth = String(reportDate.getMonth() + 1).padStart(2, '0');
      const reportDay = String(reportDate.getDate()).padStart(2, '0');
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

  renderReports(allReports);

  closeImageBtn.addEventListener("click", () => (imageModal.style.display = "none"));
  imageModal.addEventListener("click", e => {
    if (e.target === imageModal) imageModal.style.display = "none";
  });

  contactCloseBtn.addEventListener("click", () => (contactModal.style.display = "none"));
  contactModal.addEventListener("click", e => {
    if (e.target === contactModal) contactModal.style.display = "none";
  });

  copyEmailBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(contactEmail.textContent);
    alert("Email copied!");
  });

  copyPhoneBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(contactPhone.textContent);
    alert("Phone copied!");
  });
});