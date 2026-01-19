let activeCard = null;


document.addEventListener("DOMContentLoaded", () => {
  /* ====== TILT (TU CÓDIGO, INTACTO) ====== */
  const cards = document.querySelectorAll(".game-card.js-tilt");
  if (!cards.length) return;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  cards.forEach((card) => {
    const container = card;

    const coverImg = card.querySelector(".js-tilt-cover img");
    const title = card.querySelector(".js-tilt-title");
    const meta = card.querySelector(".js-tilt-meta");
    const actions = card.querySelector(".js-tilt-actions");

    const popEls = [coverImg, title, meta, actions].filter(Boolean);

    function onMove(e) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const midX = rect.width / 2;
      const midY = rect.height / 2;

      const rotateY = clamp((midX - x) / 20, -12, 12);
      const rotateX = clamp((y - midY) / 20, -12, 12);

      card.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    }

    function onEnter() {
      card.classList.add("is-tilting");
      card.style.transition = "none";
      popEls.forEach((el) => (el.style.transition = "transform .25s ease"));
    }

    function onLeave() {
      card.classList.remove("is-tilting");
      card.style.transition = "transform .35s ease";
      card.style.transform = "rotateY(0deg) rotateX(0deg)";
      popEls.forEach((el) => (el.style.transform = "translateZ(0)"));
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
  });

  /* ====== MODAL + CLIP (NUEVO) ====== */
  const modal = document.getElementById("gameModal");
  const panel = modal?.querySelector(".game-modal__panel");
  if (!modal || !panel) {
    // Si esto pasa, el modal no está en el DOM (normalmente porque está fuera del block/body)
    return;
  }

  const modalTitle = document.getElementById("modalTitle");
  const modalCover = document.getElementById("modalCover");
  const modalCoverFallback = document.getElementById("modalCoverFallback");

  const modalPlatforms = document.getElementById("modalPlatforms");
  const modalGenres = document.getElementById("modalGenres");

  const modalIgdbId = document.getElementById("modalIgdbId");
  const modalRelease = document.getElementById("modalRelease");
  const modalRating = document.getElementById("modalRating");
  const modalRatingCount = document.getElementById("modalRatingCount");
  const modalDevelopers = document.getElementById("modalDevelopers");
  const modalPublishers = document.getElementById("modalPublishers");

  const splitPipes = (s) =>
    (s || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

  const safeText = (v, fallback = "—") => {
    if (v === undefined || v === null) return fallback;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "nan") return fallback;
    return s;
  };

  const formatRating = (v) => {
    const s = String(v ?? "").trim();
    if (!s || s.toLowerCase() === "nan") return "—";
    const n = Number(s);
    return Number.isFinite(n) ? n.toFixed(1) : "—";
  };

const makePills = (container, items, emptyText, extraClass = "") => {
  container.innerHTML = "";
  if (!items.length) {
    const span = document.createElement("span");
    span.className = `meta-pill ${extraClass}`.trim();
    span.textContent = emptyText;
    container.appendChild(span);
    return;
  }

  items.forEach((txt) => {
    const span = document.createElement("span");
    span.className = `meta-pill ${extraClass}`.trim();
    span.textContent = txt;
    container.appendChild(span);
  });
};

  const getField = (card, key) => {
    const el = card.querySelector(`.game-hidden [data-field="${key}"]`);
    return el ? el.textContent.trim() : "";
  };

  const openModalFromCard = (card) => {

    activeCard = card;
    activeCard.classList.add("is-modal-open");
    activeCard.classList.remove("is-tilting");
    activeCard.style.transform = "";
    
    modal.classList.add("is-open");

    const name = getField(card, "name") || "Game";
    const cover = getField(card, "cover");

    const platforms = splitPipes(getField(card, "platforms"));
    const genres = splitPipes(getField(card, "genres"));

    modalTitle.textContent = name;

    modalIgdbId.textContent = safeText(getField(card, "id"));
    const rel = getField(card, "release");
    modalRelease.textContent = rel === "1970-01-01" ? "—" : safeText(rel);

    modalDevelopers.textContent = safeText(getField(card, "developers"));
    modalPublishers.textContent = safeText(getField(card, "publishers"));
    modalRating.textContent = formatRating(getField(card, "rating"));
    modalRatingCount.textContent = safeText(getField(card, "rating_count"));

    if (cover) {
      modalCover.style.display = "block";
      modalCover.src = cover;
      modalCover.alt = name;
      modalCoverFallback.style.display = "none";
    } else {
      modalCover.removeAttribute("src");
      modalCover.style.display = "none";
      modalCoverFallback.style.display = "flex";
      modalCoverFallback.style.alignItems = "center";
      modalCoverFallback.style.justifyContent = "center";
      modalCoverFallback.style.height = "100%";
    }

    makePills(modalPlatforms, platforms, "Unknown platform");            
    makePills(modalGenres, genres, "Unknown genre", "meta-genre"); 

    // clip origin
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    panel.style.setProperty("--clip-x", `${cx}px`);
    panel.style.setProperty("--clip-y", `${cy}px`);
    panel.style.setProperty("--clip-r", `0px`);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    // reflow
    panel.getBoundingClientRect();
    panel.style.setProperty("--clip-r", `140vmax`);

// bloquea scroll DESPUÉS de abrir
document.documentElement.style.overflow = "hidden";

  };

  const closeModal = () => {
    if (!modal.classList.contains("is-open")) return;

    panel.style.setProperty("--clip-r", `0px`);
    modal.setAttribute("aria-hidden", "true");

    const onEnd = (e) => {
      if (e.propertyName !== "clip-path") return;
      modal.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      if (activeCard){
      activeCard.classList.remove("is-modal-open");
      activeCard = null;
    }
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  };

  // Evitar abrir si fue un “drag”
  let downX = 0,
    downY = 0,
    pointerDownCard = null;

  document.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".game-card.js-game-open");
    if (!card) return;
    pointerDownCard = card;
    downX = e.clientX;
    downY = e.clientY;
  });

  document.addEventListener("pointerup", (e) => {
    if (!pointerDownCard) return;

    const dx = Math.abs(e.clientX - downX);
    const dy = Math.abs(e.clientY - downY);

    const card = pointerDownCard;
    pointerDownCard = null;

    if (dx > 8 || dy > 8) return; // era movimiento, no click
    openModalFromCard(card);
  });

  // cerrar con backdrop/botón
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  // cerrar con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});
