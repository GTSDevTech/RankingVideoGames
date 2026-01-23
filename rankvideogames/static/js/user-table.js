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

  // primera pasada
  applyFilters();
})();
