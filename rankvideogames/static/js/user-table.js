(() => {
  const search = document.getElementById("searchInput");
  const segBtns = Array.from(document.querySelectorAll(".user-seg__btn"));
  const cards = () => Array.from(document.querySelectorAll("#results .user-card"));

  let activeGender = "all";

  function normalize(s){
    return (s || "").toLowerCase().trim();
  }

  function applyFilters() {
    const q = normalize(search?.value);

    cards().forEach(card => {
      const gender = card.dataset.gender || "all";
      const username = normalize(card.dataset.username);
      const email = normalize(card.dataset.email);

      const genderOk = activeGender === "all" || gender === activeGender;
      const searchOk = !q || username.includes(q) || email.includes(q);

      card.style.display = (genderOk && searchOk) ? "" : "none";
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".user-seg__btn");
    if (!btn) return;

    segBtns.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    activeGender = btn.dataset.gender || "all";
    applyFilters();
  });

  search?.addEventListener("input", applyFilters);
  applyFilters();
})();


(() => {
  const root = document.querySelector("[data-admin-tabs]");
  if (!root) return;

  const inner = root.querySelector(".admin-tabs__inner");
  const indicator = root.querySelector(".admin-tab-indicator");
  const active = root.querySelector(".admin-tab.is-active");

  function placeIndicator(el){
    if (!el || !indicator || !inner) return;
    const r = el.getBoundingClientRect();
    const p = inner.getBoundingClientRect();

    indicator.style.width = `${r.width}px`;
    indicator.style.transform = `translateX(${r.left - p.left}px)`;
  }

  placeIndicator(active);

  window.addEventListener("resize", () => {
    placeIndicator(root.querySelector(".admin-tab.is-active"));
  });

  inner.addEventListener("mouseover", (e) => {
    const el = e.target.closest(".admin-tab");
    if (!el || el.classList.contains("is-disabled")) return;
    placeIndicator(el);
  });

  inner.addEventListener("mouseleave", () => {
    placeIndicator(root.querySelector(".admin-tab.is-active"));
  });
})();
