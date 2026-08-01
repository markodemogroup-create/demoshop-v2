const HOME_API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const homeHero = document.getElementById("homeHero");
const homeSlides = [...document.querySelectorAll("[data-home-slide]")];
const homeDots = document.querySelector(".home-hero-dots");
let homeSlideIndex = 0;
let homeHeroTimer;

function activateHomeSlide(index) {
  if (!homeSlides.length) return;
  homeSlideIndex = (index + homeSlides.length) % homeSlides.length;
  homeSlides.forEach((slide, slideIndex) => {
    const active = slideIndex === homeSlideIndex;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.tabIndex = active ? 0 : -1;
  });
  homeDots?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === homeSlideIndex);
    dot.setAttribute("aria-current", dotIndex === homeSlideIndex ? "true" : "false");
  });
}

function stopHomeHero() { window.clearInterval(homeHeroTimer); }
function startHomeHero() {
  stopHomeHero();
  if (homeSlides.length < 2) return;
  homeHeroTimer = window.setInterval(() => activateHomeSlide(homeSlideIndex + 1), 1700);
}

if (homeDots) {
  homeDots.innerHTML = homeSlides.map((_, index) => `<button type="button" class="${index === 0 ? "active" : ""}" aria-label="Baner ${index + 1}" aria-current="${index === 0 ? "true" : "false"}"></button>`).join("");
  homeDots.querySelectorAll("button").forEach((dot, index) => dot.addEventListener("click", () => { activateHomeSlide(index); startHomeHero(); }));
}
homeHero?.querySelector(".home-hero-prev")?.addEventListener("click", () => { activateHomeSlide(homeSlideIndex - 1); startHomeHero(); });
homeHero?.querySelector(".home-hero-next")?.addEventListener("click", () => { activateHomeSlide(homeSlideIndex + 1); startHomeHero(); });
homeHero?.addEventListener("pointerenter", stopHomeHero);
homeHero?.addEventListener("pointerleave", startHomeHero);
homeHero?.addEventListener("focusin", stopHomeHero);
homeHero?.addEventListener("focusout", startHomeHero);
let homeTouchX = null;
homeHero?.addEventListener("touchstart", event => { homeTouchX = event.touches[0]?.clientX ?? null; }, { passive: true });
homeHero?.addEventListener("touchend", event => {
  if (homeTouchX === null) return;
  const distance = (event.changedTouches[0]?.clientX ?? homeTouchX) - homeTouchX;
  homeTouchX = null;
  if (Math.abs(distance) > 45) activateHomeSlide(homeSlideIndex + (distance < 0 ? 1 : -1));
  startHomeHero();
}, { passive: true });
activateHomeSlide(0);
startHomeHero();

function homeEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[character]);
}
function homeProductName(value) { return String(value || "Proizvod").split(",")[0].trim(); }
function homePrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? `${price.toLocaleString("sr-RS", {minimumFractionDigits:2,maximumFractionDigits:2})} €` : "Cena na upit";
}
function homeImage(model) {
  const id = String(model || "").replace(/[^a-zA-Z0-9]/g, "");
  return id ? `https://apiv2.promosolution.services/content/ModelItem/${id}_000.webp` : "";
}
function homeImageCandidates(product) {
  const ids = [product?.modelCode, product?.representativeCode, product?.representativeVariantId]
    .map(value => String(value || "").split("-")[0].replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  return [...new Set([
    product?.image,
    product?.representativeImage,
    ...ids.flatMap(id => [
      `https://apiv2.promosolution.services/content/ModelItem/${id}_000.webp`,
      `https://apiv2.promosolution.services/content/ModelItem/${id}_001.webp`,
    ]),
  ].filter(Boolean))];
}

function loadHomeProductImage(image, candidates) {
  let candidateIndex = 0;
  const tryNext = () => {
    const candidate = candidates[candidateIndex++];
    if (!candidate) {
      image.closest(".home-product-media")?.classList.add("no-image");
      image.removeAttribute("src");
      return;
    }
    image.onerror = tryNext;
    image.onload = () => {
      image.onerror = null;
      image.classList.add("loaded");
      image.closest(".home-product-media")?.classList.remove("no-image");
    };
    image.src = candidate;
  };
  tryNext();
}

async function loadHomeNewProducts() {
  const grid = document.getElementById("homeNewGrid");
  const message = document.getElementById("homeNewMessage");
  if (!grid || !message) return;
  try {
    const response = await fetch(`${HOME_API_BASE}/new-products?limit=8&v=49`, {headers:{Accept:"application/json"}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const products = Array.isArray(data.products) ? data.products.slice(0, 8) : [];
    if (!data.success || !products.length) throw new Error(data.error || "Nema noviteta");
    grid.innerHTML = products.map(product => {
      const model = product.modelCode || "";
      const href = `product.html?model=${encodeURIComponent(model)}&v=39`;
      const price = homePrice(product.priceMin);
      const stock = Number(product.stock);
      const stockText = Number.isFinite(stock) ? (stock > 0 ? `${Math.floor(stock).toLocaleString("sr-RS")} kom.` : "U dolasku") : "Provera stanja";
      return `<article class="home-product-card"><a class="home-product-media" href="${href}"><span>NOVO</span><img alt="${homeEscape(product.name || model)}" loading="lazy" data-home-product-image></a><div><small>Model ${homeEscape(model)}</small><h3><a href="${href}">${homeEscape(homeProductName(product.name))}</a></h3><p>${homeEscape(stockText)}</p><strong>${homeEscape(price)}</strong><a class="home-product-link" href="${href}" aria-label="Pogledajte proizvod">→</a></div></article>`;
    }).join("");
    grid.querySelectorAll("[data-home-product-image]").forEach((image, index) => loadHomeProductImage(image, homeImageCandidates(products[index])));
    message.classList.add("hidden");
  } catch (error) {
    message.textContent = "Noviteti će biti dostupni nakon sledećeg osvežavanja kataloga.";
    console.error("Noviteti nisu učitani", error);
  }
}
loadHomeNewProducts();

/* V88: živa pretraga proizvoda na početnoj strani */
const homeSearchInput = document.getElementById("homeSearch");
const homeSearchSuggestions = document.getElementById("homeSearchSuggestions");
let homeSearchTimer = 0;
let homeSearchRequest = 0;

function homeFoldSearch(value) {
  return String(value || "").toLocaleLowerCase("sr-Latn").replace(/đ/g, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function homeCompactCode(value) { return homeFoldSearch(value).replace(/[^a-z0-9]/g, ""); }
function homeSearchQueries(value) {
  const query = String(value || "").trim();
  const compact = homeCompactCode(query);
  if (/^\d+$/.test(compact)) {
    const dotted = compact.length > 2 ? [compact.slice(0, 2), compact.slice(2, 5), compact.slice(5)].filter(Boolean).join(".") : compact;
    return [...new Set([dotted, compact, query])];
  }
  const ascii = homeFoldSearch(query);
  let variants = [""];
  for (let index = 0; index < ascii.length;) {
    let choices = [ascii[index]];
    let step = 1;
    if (ascii.slice(index, index + 2) === "dj") { choices = ["dj", "đ"]; step = 2; }
    else if (ascii[index] === "s") choices = ["s", "š"];
    else if (ascii[index] === "c") choices = ["c", "č", "ć"];
    else if (ascii[index] === "z") choices = ["z", "ž"];
    variants = variants.flatMap(prefix => choices.map(choice => prefix + choice)).slice(0, 32);
    index += step;
  }
  return [...new Set([query, ...variants])].slice(0, 32);
}
function closeHomeSearchSuggestions() {
  homeSearchSuggestions?.classList.add("hidden");
  if (homeSearchSuggestions) homeSearchSuggestions.innerHTML = "";
  homeSearchInput?.setAttribute("aria-expanded", "false");
}
async function loadHomeSearchSuggestions() {
  const query = homeSearchInput?.value.trim() || "";
  const requestId = ++homeSearchRequest;
  if (query.length < 2 || !homeSearchSuggestions) return closeHomeSearchSuggestions();
  try {
    let products = [];
    for (const resolved of homeSearchQueries(query)) {
      const params = new URLSearchParams({ page: "1", limit: "6", search: resolved });
      const response = await fetch(`${HOME_API_BASE}/products-grouped?${params}`, { headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const data = await response.json();
      products = Array.isArray(data.products) ? data.products : [];
      if (products.length) break;
    }
    if (requestId !== homeSearchRequest) return;
    if (!products.length) {
      homeSearchSuggestions.innerHTML = `<div class="search-suggestion-empty">Nema pronađenih proizvoda.</div>`;
    } else {
      homeSearchSuggestions.innerHTML = products.map((product, index) => {
        const model = product.modelCode || "";
        const price = homePrice(product.priceMin);
        return `<a class="search-suggestion" role="option" href="product.html?model=${encodeURIComponent(model)}&v=39"><span class="search-suggestion-copy"><strong>${homeEscape(homeProductName(product.name))}</strong><small>Model ${homeEscape(model)}</small><em>${homeEscape(price)}</em></span><img class="search-suggestion-image" data-home-search-image="${index}" alt="" loading="lazy"></a>`;
      }).join("");
      products.forEach((product, index) => {
        const image = homeSearchSuggestions.querySelector(`[data-home-search-image="${index}"]`);
        if (image) loadHomeProductImage(image, homeImageCandidates(product));
      });
    }
    homeSearchSuggestions.classList.remove("hidden");
    homeSearchInput.setAttribute("aria-expanded", "true");
  } catch (error) {
    if (requestId === homeSearchRequest) closeHomeSearchSuggestions();
    console.error("Početna pretraga trenutno nije dostupna", error);
  }
}
homeSearchInput?.setAttribute("aria-autocomplete", "list");
homeSearchInput?.setAttribute("aria-expanded", "false");
homeSearchInput?.addEventListener("input", () => {
  window.clearTimeout(homeSearchTimer);
  homeSearchTimer = window.setTimeout(loadHomeSearchSuggestions, 230);
});
homeSearchInput?.addEventListener("keydown", event => { if (event.key === "Escape") closeHomeSearchSuggestions(); });
document.addEventListener("pointerdown", event => { if (!event.target.closest("#homeSearchForm")) closeHomeSearchSuggestions(); });
