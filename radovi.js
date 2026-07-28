const projects = [
  {title:"Arhiv na trgu",cat:"Knjige i monografije",key:"knjige",images:["092925","092937"]},
  {title:"Monografija škole",cat:"Knjige i monografije",key:"knjige",images:["093007","093008","093020"]},
  {title:"Crno-beli spomenar",cat:"Knjige i monografije",key:"knjige",images:["093048","093057"]},
  {title:"Drina plače i pamti",cat:"Knjige i monografije",key:"knjige",images:["093130","093139"]},
  {title:"M1 fascikla",cat:"Fascikle",key:"fascikle",images:["093210","093228"]},
  {title:"Fortuna Foto",cat:"Fascikle",key:"fascikle",images:["093319","093332"]},
  {title:"MD Poliklinika",cat:"Fascikle",key:"fascikle",images:["093348","093355"]},
  {title:"Medikom fascikla",cat:"Fascikle",key:"fascikle",images:["093429","093436"]},
  {title:"Zoom Optic",cat:"Fascikle",key:"fascikle",images:["093444","093452"]},
  {title:"Poslovni savetnik",cat:"Fascikle",key:"fascikle",images:["093501","093507"]},
  {title:"ABD-PROM katalog",cat:"Fascikle",key:"fascikle",images:["093542","093552","093605"]},
  {title:"Global Mont fascikla",cat:"Fascikle",key:"fascikle",images:["093633","093643"]},
  {title:"MD Poliklinika letak",cat:"Flajeri i letci",key:"letci",images:["094017"]},
  {title:"Global Mont poslovna mapa",cat:"Fascikle",key:"fascikle",images:["094003"]},
  {title:"Monterra blok",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094026","094056"]},
  {title:"Uniplast blok",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094112"]},
  {title:"RoyalMedika blok",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094129"]},
  {title:"Prodanović blok",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094201"]},
  {title:"Toplane Srbije",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094211","094215"]},
  {title:"Global Mont rokovnik",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094223"]},
  {title:"DPS Klas sveske",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094229","094238","094245","094251","094302","094312","094317"]},
  {title:"Poslovni savetnik blok",cat:"Rokovnici i blokovi",key:"rokovnici",images:["094323","094328"]},
  {title:"Christyns Agri",cat:"Fascikle",key:"fascikle",images:["094347","094403"]},
  {title:"Đukić dvolisnica",cat:"Brošure i lifleti",key:"katalozi",images:["094414"]},
  {title:"LUX dvolisnica",cat:"Brošure i lifleti",key:"katalozi",images:["094424"]},
  {title:"Melisa magazin",cat:"Časopisi",key:"casopisi",images:["094434"]},
  {title:"Super Protector",cat:"Ambalaža i kutije",key:"ambalaza",images:["094510","094533"]},
  {title:"Biljna apoteka",cat:"Ambalaža i kutije",key:"ambalaza",images:["094539","094547","094607","094614"]},
  {title:"Manastirska ambalaža",cat:"Ambalaža i kutije",key:"ambalaza",images:["094722","094728","094733","094758","094804","094810"]},
  {title:"Bela koza",cat:"Ambalaža i kutije",key:"ambalaza",images:["094838"]},
  {title:"Turistička brošura",cat:"Brošure i lifleti",key:"katalozi",images:["094913","094917"]}
];

const rotations = {"093429":180,"094017":90};
const grid = document.getElementById("portfolioGrid");
const filterButtons = [...document.querySelectorAll("[data-work-filter]")];
const mobileFilter = document.getElementById("portfolioMobileFilter");
const workResultCount = document.getElementById("workResultCount");
const workEmptyState = document.getElementById("workEmptyState");
const modal = document.getElementById("workModal");
const modalImage = document.getElementById("workModalImage");
const modalTitle = document.getElementById("workModalTitle");
const modalDescription = document.getElementById("workModalDescription");
const modalZoom = modal?.querySelector(".work-modal-zoom");
const modalPrev = modal?.querySelector(".work-modal-prev");
const modalNext = modal?.querySelector(".work-modal-next");
let modalProjectIndex = 0;
let modalImageIndex = 0;
let modalOpener = null;
let modalTouchStart = 0;

grid.innerHTML = projects.map((project,index) => {
  const count = project.images.length;
  const id = project.images[0];
  return `<article class="work-card grouped-work-card" data-work-card data-project="${index}" data-categories="${project.key}" data-active="0">
    <span class="work-image">
      <img src="assets/radovi/demo-group/demo-group-${id}.webp" alt="${project.title}" loading="${index < 3 ? "eager" : "lazy"}" style="--work-rotation:${rotations[id] || 0}deg">
      ${count > 1 ? `<button class="group-arrow group-prev" type="button" aria-label="Prethodna fotografija">←</button><button class="group-arrow group-next" type="button" aria-label="Sledeća fotografija">→</button><small class="group-count">1 / ${count}</small>` : ""}
    </span>
    <span class="work-copy"><small>${project.cat.toUpperCase()}</small><strong>${project.title}</strong><span>${count > 1 ? `${count} fotografije projekta` : "Realizovani projekat"}</span></span>
  </article>`;
}).join("");

const workCards = [...document.querySelectorAll("[data-work-card]")];

function applyWorkFilter(filter = "all") {
  const selectedButton = filterButtons.find(button => button.dataset.workFilter === filter)
    || filterButtons.find(button => button.dataset.workFilter === "all");
  const selectedFilter = selectedButton?.dataset.workFilter || "all";
  filterButtons.forEach(button => {
    const active = button === selectedButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (mobileFilter) mobileFilter.value = selectedFilter;
  let visible = 0;
  workCards.forEach(card => {
    const categories = (card.dataset.categories || "").split(/\s+/);
    const show = selectedFilter === "all" || categories.includes(selectedFilter);
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  });
  if (workResultCount) workResultCount.textContent = visible ? `${visible} ${visible === 1 ? "projekat" : "projekata"}` : "Nova kategorija";
  grid.classList.toggle("hidden", visible === 0);
  workEmptyState?.classList.toggle("hidden", visible !== 0);
}

filterButtons.forEach(button => {
  button.addEventListener("click", () => applyWorkFilter(button.dataset.workFilter || "all"));
});
mobileFilter?.addEventListener("change", () => applyWorkFilter(mobileFilter.value || "all"));

const requestedFilter = new URLSearchParams(window.location.search).get("category") || "all";
applyWorkFilter(requestedFilter);

function updateWorkModal() {
  const project = projects[modalProjectIndex];
  const id = project.images[modalImageIndex];
  modalImage.src = `assets/radovi/demo-group/demo-group-${id}.webp`;
  modalImage.alt = project.title;
  modalImage.style.setProperty("--modal-rotation",`${rotations[id] || 0}deg`);
  modalTitle.textContent = project.title;
  modalDescription.textContent = `${project.cat} · Fotografija ${modalImageIndex + 1} od ${project.images.length}`;
  const multiple = project.images.length > 1;
  if (modalPrev) modalPrev.hidden = !multiple;
  if (modalNext) modalNext.hidden = !multiple;
  modal?.classList.remove("is-zoomed");
  modalZoom?.setAttribute("aria-pressed","false");
  if (modalZoom) modalZoom.textContent = "Uvećaj sliku ＋";
}

function openWorkModal(card) {
  if (!modal || !modalImage || !modalTitle || !modalDescription) return;
  modalOpener = card;
  modalProjectIndex = Number(card.dataset.project);
  modalImageIndex = Number(card.dataset.active);
  updateWorkModal();
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modal.querySelector(".work-modal-close")?.focus();
}

function moveWorkModal(direction) {
  const project = projects[modalProjectIndex];
  modalImageIndex = (modalImageIndex + direction + project.images.length) % project.images.length;
  updateWorkModal();
}

grid.addEventListener("click", event => {
  const arrow = event.target.closest(".group-arrow");
  const card = event.target.closest("[data-work-card]");
  if (!card) return;
  const project = projects[Number(card.dataset.project)];
  if (arrow) {
    event.preventDefault();
    event.stopPropagation();
    let active = Number(card.dataset.active);
    active = (active + (arrow.classList.contains("group-next") ? 1 : -1) + project.images.length) % project.images.length;
    card.dataset.active = String(active);
    const id = project.images[active];
    const image = card.querySelector("img");
    image.src = `assets/radovi/demo-group/demo-group-${id}.webp`;
    image.style.setProperty("--work-rotation",`${rotations[id] || 0}deg`);
    card.querySelector(".group-count").textContent = `${active + 1} / ${project.images.length}`;
    return;
  }
  openWorkModal(card);
});

function closeWorkModal() {
  modal?.classList.add("hidden");
  modal?.classList.remove("is-zoomed");
  document.body.style.overflow = "";
  modalOpener?.focus();
}

modal?.querySelector(".work-modal-close")?.addEventListener("click", closeWorkModal);
modal?.addEventListener("click", event => { if (event.target === modal) closeWorkModal(); });
modalPrev?.addEventListener("click", () => moveWorkModal(-1));
modalNext?.addEventListener("click", () => moveWorkModal(1));
modalZoom?.addEventListener("click", () => {
  const zoomed = modal.classList.toggle("is-zoomed");
  modalZoom.setAttribute("aria-pressed",String(zoomed));
  modalZoom.textContent = zoomed ? "Vrati prikaz −" : "Uvećaj sliku ＋";
});
modalImage?.addEventListener("dblclick", () => modalZoom?.click());
modal?.addEventListener("touchstart", event => { modalTouchStart = event.changedTouches[0].clientX; }, {passive:true});
modal?.addEventListener("touchend", event => {
  const distance = event.changedTouches[0].clientX - modalTouchStart;
  if (Math.abs(distance) > 55 && !modal.classList.contains("is-zoomed")) moveWorkModal(distance < 0 ? 1 : -1);
}, {passive:true});
document.addEventListener("keydown", event => {
  if (modal?.classList.contains("hidden")) return;
  if (event.key === "Escape") closeWorkModal();
  else if (event.key === "ArrowLeft") moveWorkModal(-1);
  else if (event.key === "ArrowRight") moveWorkModal(1);
});
