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
  if (homeSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  homeHeroTimer = window.setInterval(() => activateHomeSlide(homeSlideIndex + 1), 4800);
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
      return `<article class="home-product-card"><a class="home-product-media" href="${href}"><span>NOVO</span><img src="${homeEscape(homeImage(model))}" alt="${homeEscape(product.name || model)}" loading="lazy"></a><div><small>Model ${homeEscape(model)}</small><h3><a href="${href}">${homeEscape(homeProductName(product.name))}</a></h3><p>${homeEscape(stockText)}</p><strong>${homeEscape(price)}</strong><a class="home-product-link" href="${href}" aria-label="Pogledajte proizvod">→</a></div></article>`;
    }).join("");
    grid.querySelectorAll("img").forEach(image => image.addEventListener("error", () => image.closest(".home-product-media")?.classList.add("no-image"), {once:true}));
    message.classList.add("hidden");
  } catch (error) {
    message.textContent = "Noviteti će biti dostupni nakon sledećeg osvežavanja kataloga.";
    console.error("Noviteti nisu učitani", error);
  }
}
loadHomeNewProducts();
