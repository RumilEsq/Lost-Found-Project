document.addEventListener("DOMContentLoaded", async function () {

  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);

  const session = await requireAuth();
  if (!session) return;

  document.body.classList.add("show");

  const reportContainer = document.querySelector(".report-animate");
  if (reportContainer) {
    setTimeout(() => {
      reportContainer.classList.add("show");
    }, 200);
  }

  let reportType = "lost";
  const lostBtn = document.getElementById("lostBtn");
  const foundBtn = document.getElementById("foundBtn");

  if (lostBtn && foundBtn) {
    lostBtn.addEventListener("click", () => {
      reportType = "lost";
      lostBtn.classList.add("active");
      foundBtn.classList.remove("active");
    });
    foundBtn.addEventListener("click", () => {
      reportType = "found";
      foundBtn.classList.add("active");
      lostBtn.classList.remove("active");
    });
  }

  const submitBtn = document.getElementById("submitReport");
  const reportForm = document.getElementById("reportForm");
  const successModal = document.getElementById("successModal");
  const successOkBtn = document.getElementById("successOkBtn");

  if (submitBtn && reportForm) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const itemName = document.getElementById("itemName").value.trim();
      const category = document.getElementById("category").value;
      const description = document.getElementById("description").value.trim();
      const location = document.getElementById("location").value.trim();
      const date = document.getElementById("date").value;
      const locationDetails = document.getElementById("locationDetails").value.trim();
      const reporterName = document.getElementById("reporterName").value.trim();
      const reporterEmail = document.getElementById("reporterEmail").value.trim();
      const reporterPhone = document.getElementById("reporterPhone").value.trim();
      const photoFile = document.getElementById("photo").files[0];

      if (!itemName || !category || !location || !date || !reporterName || !reporterEmail || !reporterPhone) {
        alert("Please fill in all required fields.");
        return;
      }

      if (photoFile && photoFile.size > 5 * 1024 * 1024) {
        alert("Photo size must be less than 5MB");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, photoFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("reports")
            .getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        } else {
          console.error("Photo upload error:", uploadError.message);
        }
      }

      const { error } = await supabase
        .from("reports")
        .insert([{
          type: reportType,
          item_name: itemName,
          category,
          description,
          location,
          date,
          location_details: locationDetails,
          reporter_name: reporterName,
          reporter_email: reporterEmail,
          reporter_phone: reporterPhone,
          photo_url: photoUrl,
          user_id: session.user.id
        }]);

      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";

      if (error) {
        console.error("Failed to submit report:", error.message);
        alert("Error submitting report: " + error.message);
      } else {
        successModal.classList.add("show");
      }
    });
  }

  if (successOkBtn) {
    successOkBtn.addEventListener("click", () => {
      successModal.classList.remove("show");
      reportForm.reset();
      reportType = "lost";
      lostBtn.classList.add("active");
      foundBtn.classList.remove("active");
      window.location.href = "items.html";
    });
  }

});