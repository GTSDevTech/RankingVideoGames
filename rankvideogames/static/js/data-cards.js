document.addEventListener("DOMContentLoaded", () => {
  const cards = Array.from(document.querySelectorAll(".boss-card"));
  if (!cards.length) return;

  const expanders = document.querySelectorAll(".js-expander");
  const collapsers = document.querySelectorAll(".js-collapser");

  function collapseAll() {
    cards.forEach(c => {
      c.classList.remove("is-expanded");
      c.classList.add("is-collapsed");
      c.classList.remove("is-inactive");
      c.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "false");
      c.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "true");
    });
  }

  function expandCard(card) {
    cards.forEach(c => {
      if (c !== card) {
        c.classList.remove("is-expanded");
        c.classList.add("is-collapsed");
        c.classList.add("is-inactive");
        c.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "false");
        c.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "true");
      }
    });

    card.classList.remove("is-collapsed");
    card.classList.add("is-expanded");
    card.classList.remove("is-inactive");

    card.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "true");
    card.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "false");
  }

  expanders.forEach(el => {
    const handler = () => {
      const card = el.closest(".boss-card");
      if (!card) return;
      if (card.classList.contains("is-collapsed")) expandCard(card);
      else collapseAll();
    };

    el.addEventListener("click", handler);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    });
  });

  collapsers.forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      collapseAll();
    });
  });

  // ===== FILE PICKER =====
  const input = document.getElementById("updateFileInput");
  const preview = document.getElementById("fileNamePreview");
  const submitBtn = document.getElementById("btnSubmitCsv");

  if (input && preview && submitBtn) {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];

      if (!file) {
        preview.textContent = "Ningún archivo seleccionado";
        submitBtn.disabled = true;
        return;
      }

      preview.textContent = file.name;

      submitBtn.disabled = false;
    });
  }

  // ===== MODAL collections =====
  const modal = document.getElementById("collectionsModal");
  const openBtns = document.querySelectorAll(".js-open-collections");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  openBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal();
      }
    });
  });

  modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});

 const fromEl = document.getElementById("yearFrom");
  const toEl = document.getElementById("yearTo");

  if (window.mdb && fromEl && toEl) {
    const dpFrom = new mdb.Datepicker(fromEl, {
      format: "yyyy",
      startView: "years",
      minView: "years",
    });

    const dpTo = new mdb.Datepicker(toEl, {
      format: "yyyy",
      startView: "years",
      minView: "years",
    });

    // Optional: auto-correct range (si from > to)
    const normalize = () => {
      const y1 = parseInt(fromEl.value, 10);
      const y2 = parseInt(toEl.value, 10);
      if (!Number.isNaN(y1) && !Number.isNaN(y2) && y1 > y2) {
        // swap
        const tmp = fromEl.value;
        fromEl.value = toEl.value;
        toEl.value = tmp;
      }
    };

    fromEl.addEventListener("change", normalize);
    toEl.addEventListener("change", normalize);
  }