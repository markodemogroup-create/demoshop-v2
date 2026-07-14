const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const PAGE_LIMIT = 20;
const DETAIL_CONCURRENCY = 4;

const els = {
  apiStatus: document.getElementById("apiStatus"),
  heroTotal: document.getElementById("heroTotal"),
  totalMatches: document.getElementById("totalMatches"),
  resultsLabel: document.getElementById("resultsLabel"),
  pageInfo: document.getElementById("pageInfo"),
  message: document.getElementById("message"),
  grid: document.getElementById("productGrid"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  clearSearch: document.getElementById("clearSearch"),
  categoriesToggle: document.getElementById("categoriesToggle"),
  categoriesMenu: document.getElementById("categoriesMenu"),
  categoriesGrid: document.getElementById("categoriesGrid"),
  activeFilter: document.getElementById("activeFilter"),
  activeFilterName: document.getElementById("activeFilterName"),
  clearCategory: document.getElementById("clearCategory"),
  prev: document.getElementById("prevPage"),
  next: document.getElementById("nextPage"),
  paginationText: document.getElementById("paginationText"),
};

const state = {
  page: 1,
  totalPages: 1,
  search: "",
  category: "",
  subCategory: "",
  collectionLabel: "",
  requestId: 0,
};

const CATEGORY_LABELS = {
  TX: "Tekstil", UB: "USB memorije", KS: "Kućni program", TP: "Torbe i putovanje",
  KA: "Kancelarija", TE: "Tehnologija", OL: "Olovke", PT: "Privesci i ID oprema",
  RK: "Rokovnici i notesi", RL: "Slobodno vreme i lepota", UP: "Upaljači",
  AO: "Alati i oprema", KI: "Kišobrani",
};

const SUBCATEGORY_LABELS = {
  "TX - 06":"Radna i sportska odeća","TX - 07":"Pantalone","TX - 12":"Majice, duksevi i jakne",
  "UB - 02":"USB ambalaža","UB - 04":"USB memorije","UB - 07":"SSD memorije",
  "KS - 01":"Šolje","KS - 02":"Boce i termosi","KS - 03":"Vinski setovi",
  "TP - 01":"Poslovne torbe","TP - 02":"Putni program","TP - 03":"Kese i cegeri","TP - 04":"Rančevi","TP - 06":"Sportske torbe",
  "KA - 02":"Kancelarijski pribor","KA - 03":"Vizitari i novčanici","KA - 05":"Promo pultovi i panoi","KA - 10":"Satovi","KA - 99":"Poklon kutije",
  "TE - 01":"Gedžeti i punjači","TE - 02":"Pomoćne baterije","TE - 03":"Audio uređaji",
  "OL - 01":"Plastične olovke","OL - 02":"Metalne olovke","OL - 03":"Drvene olovke","OL - 04":"Setovi olovaka",
  "PT - 01":"Privesci","PT - 02":"Držači za ID kartice",
  "RK - 06":"Notesi i rokovnici","RK - 08":"Portfolio i poklon setovi",
  "RL - 01":"Sport i zabava","RL - 02":"Antistres proizvodi","RL - 03":"Lepota","RL - 04":"Zdravlje i putovanje","RL - 05":"Bočice i zatvarači",
  "UP - 01":"Brener upaljači","UP - 02":"Kremen upaljači","UP - 03":"Metalni upaljači","UP - 04":"Elektronski upaljači",
  "AO - 01":"Lampe","AO - 02":"Višenamenski alati","AO - 03":"Ručni i auto alati","AO - 04":"Merni pribor",
  "KI - 01":"Kišobrani",
};

function categoryLabel(code) { return CATEGORY_LABELS[code] || code; }
function subCategoryLabel(code) { return SUBCATEGORY_LABELS[code] || code; }

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0
    ? `${price.toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : "Cena na upit";
}

function cardTemplate(product, index) {
  const model = product.modelCode || "";
  const href = `product.html?model=${encodeURIComponent(model)}&v=17`;
  const category = [product.category, product.subCategory].filter(Boolean).join(" · ");

  return `
    <article class="product-card" data-detail-id="${escapeHtml(product.representativeVariantId || "")}" data-index="${index}">
      <a class="card-image-link" href="${href}" aria-label="Otvori ${escapeHtml(product.name || model)}">
        <div class="card-media">
          <div class="image-skeleton"></div>
          <img class="card-image card-image-primary" alt="" loading="lazy">
          <img class="card-image card-image-hover" alt="" loading="lazy" aria-hidden="true">
          <span class="card-badge">${product.colorCount > 1 ? `${product.colorCount} boja` : "1 varijanta"}</span>
        </div>
      </a>
      <div class="card-content">
        <p class="card-category">${escapeHtml(category || "Promotivni proizvodi")}</p>
        <h2><a href="${href}">${escapeHtml(product.name || "Bez naziva")}</a></h2>
        <p class="card-code">Model ${escapeHtml(model)}</p>
        <div class="card-meta">
          <div><span class="card-price">Učitavanje…</span><small>po komadu</small></div>
          <a class="card-arrow" href="${href}" aria-label="Detalji proizvoda">→</a>
        </div>
        <div class="variant-summary">
          ${product.sizeCount ? `<span>${product.sizeCount} veličina</span>` : ""}
          <span>${product.variantCount || 1} varijanti</span>
        </div>
      </div>
    </article>`;
}

async function fetchVariantDetail(id) {
  if (!id) return null;
  const response = await fetch(`${API_BASE}/variant-detail?id=${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.success ? data.variant : null;
}

function applyCardDetail(card, detail) {
  const skeleton = card.querySelector(".image-skeleton");
  const image = card.querySelector(".card-image-primary");
  const hoverImage = card.querySelector(".card-image-hover");
  const media = card.querySelector(".card-media");
  const price = card.querySelector(".card-price");
  skeleton?.remove();

  if (detail?.image) {
    image.src = detail.image;
    image.alt = detail.name || "Proizvod";
    image.classList.add("loaded");
  } else {
    const rawId = card.dataset.detailId || "";
    const baseImageId = rawId.split("-")[0].replace(/[^a-zA-Z0-9]/g, "");
    if (baseImageId) {
      image.src = `https://apiv2.promosolution.services/content/ModelItem/${baseImageId}_001.webp`;
      image.alt = "Proizvod";
      image.onload = () => image.classList.add("loaded");
      image.onerror = () => card.querySelector(".card-media")?.classList.add("no-image");
    } else {
      card.querySelector(".card-media")?.classList.add("no-image");
    }
  }
  price.textContent = formatPrice(detail?.price);

  const primaryUrl = detail?.image || "";
  const hoverUrl = [...new Set(Array.isArray(detail?.images) ? detail.images : [])]
    .find(url => url && url.split("?")[0] !== primaryUrl.split("?")[0]);

  if (hoverImage && hoverUrl) {
    const loadHoverImage = () => {
      if (hoverImage.dataset.loaded) return;
      hoverImage.dataset.loaded = "true";
      hoverImage.onload = () => {
        hoverImage.classList.add("loaded");
        media?.classList.add("has-hover-image");
      };
      hoverImage.onerror = () => media?.classList.remove("has-hover-image");
      hoverImage.src = hoverUrl;
    };

    card.addEventListener("pointerenter", loadHoverImage, { once: true });
    card.addEventListener("focusin", loadHoverImage, { once: true });
  }
}

async function enrichCards(requestId) {
  const cards = [...els.grid.querySelectorAll(".product-card")];
  let cursor = 0;

  async function worker() {
    while (cursor < cards.length && requestId === state.requestId) {
      const card = cards[cursor++];
      try {
        const detail = await fetchVariantDetail(card.dataset.detailId);
        if (requestId === state.requestId) applyCardDetail(card, detail);
      } catch {
        if (requestId === state.requestId) applyCardDetail(card, null);
      }
    }
  }

  await Promise.all(Array.from({ length: DETAIL_CONCURRENCY }, worker));
}

function closeCategoriesMenu() {
  els.categoriesMenu.classList.add("hidden");
  els.categoriesToggle.setAttribute("aria-expanded", "false");
}

function applyCategory(category, subCategory = "", options = {}) {
  state.category = category;
  state.subCategory = subCategory;
  state.search = options.search || "";
  state.collectionLabel = options.label || "";
  state.page = 1;
  els.searchInput.value = state.search;
  closeCategoriesMenu();
  loadProducts();
  window.scrollTo({ top: 300, behavior: "smooth" });
}

function subcategoryTemplate(categoryCode, sub) {
  const subgroups = window.CATALOG_TAXONOMY?.[sub.code] || [];

  if (!subgroups.length) {
    return `
      <button type="button" data-category="${escapeHtml(categoryCode)}" data-subcategory="${escapeHtml(sub.code)}">
        ${escapeHtml(subCategoryLabel(sub.code))}<small>${sub.count}</small>
      </button>`;
  }

  return `
    <div class="menu-subcategory-group">
      <button type="button" class="menu-subcategory-title" data-category="${escapeHtml(categoryCode)}" data-subcategory="${escapeHtml(sub.code)}">
        ${escapeHtml(subCategoryLabel(sub.code))}<small>${sub.count}</small>
      </button>
      <div class="menu-tertiary">
        ${subgroups.map(item => `
          <button type="button"
            data-category="${escapeHtml(categoryCode)}"
            data-subcategory="${escapeHtml(sub.code)}"
            data-query="${escapeHtml(item.query)}"
            data-label="${escapeHtml(item.label)}">
            ${escapeHtml(item.label)}
          </button>`).join("")}
      </div>
    </div>`;
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/catalog-filters`, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.success || !Array.isArray(data.categories)) return;

    els.categoriesGrid.innerHTML = data.categories.map(category => `
      <section class="menu-category">
        <button type="button" class="menu-category-title" data-category="${escapeHtml(category.code)}">
          <span>${escapeHtml(categoryLabel(category.code))}</span><small>${Number(category.count).toLocaleString("sr-RS")}</small>
        </button>
        <div class="menu-subcategories">
          ${category.subCategories.map(sub => subcategoryTemplate(category.code, sub)).join("")}
        </div>
      </section>`).join("");
  } catch (error) {
    console.error("Kategorije nisu učitane", error);
  }
}

async function loadProducts() {
  const requestId = ++state.requestId;
  els.message.classList.remove("hidden");
  els.message.textContent = "Učitavanje proizvoda…";
  els.grid.innerHTML = "";

  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_LIMIT) });
  if (state.search) params.set("search", state.search);
  if (state.category) params.set("category", state.category);
  if (state.subCategory) params.set("subCategory", state.subCategory);

  try {
    const response = await fetch(`${API_BASE}/products-grouped?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Katalog trenutno nije dostupan.");
    if (requestId !== state.requestId) return;

    state.page = data.page || 1;
    state.totalPages = data.totalPages || 1;
    const total = Number(data.totalGroupedCards || 0);
    const matches = Number(data.totalMatchingProducts || 0);

    els.apiStatus.textContent = "Katalog ažuriran";
    els.heroTotal.textContent = total.toLocaleString("sr-RS");
    els.totalMatches.textContent = matches.toLocaleString("sr-RS");
    const filterName = state.collectionLabel || (state.subCategory ? subCategoryLabel(state.subCategory) : categoryLabel(state.category));
    els.resultsLabel.textContent = state.search ? `rezultata za „${state.search}”` : "proizvoda";
    els.activeFilter.classList.toggle("hidden", !state.category);
    els.activeFilterName.textContent = filterName || "";
    els.pageInfo.textContent = `Strana ${state.page} od ${state.totalPages}`;
    els.paginationText.textContent = `${state.page} / ${state.totalPages}`;
    els.prev.disabled = !data.hasPreviousPage;
    els.next.disabled = !data.hasNextPage;
    els.clearSearch.classList.toggle("hidden", !state.search);

    const products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) {
      els.message.textContent = "Nema proizvoda koji odgovaraju pretrazi.";
      return;
    }

    els.message.classList.add("hidden");
    els.grid.innerHTML = products.map(cardTemplate).join("");
    enrichCards(requestId);
  } catch (error) {
    if (requestId !== state.requestId) return;
    els.apiStatus.textContent = "Veza nije dostupna";
    els.message.textContent = "Katalog trenutno nije moguće učitati. Pokušajte ponovo za nekoliko trenutaka.";
    console.error(error);
  }
}

els.searchForm?.addEventListener("submit", event => {
  event.preventDefault();
  state.search = els.searchInput.value.trim();
  state.collectionLabel = "";
  state.page = 1;
  loadProducts();
});

els.clearSearch?.addEventListener("click", () => {
  state.search = "";
  state.collectionLabel = "";
  state.page = 1;
  els.searchInput.value = "";
  loadProducts();
});

els.categoriesToggle?.addEventListener("click", () => {
  const willOpen = els.categoriesMenu.classList.contains("hidden");
  els.categoriesMenu.classList.toggle("hidden", !willOpen);
  els.categoriesToggle.setAttribute("aria-expanded", String(willOpen));
});

document.querySelectorAll(".quick-category").forEach(button => {
  button.addEventListener("click", () => applyCategory(button.dataset.category));
});

els.categoriesGrid?.addEventListener("click", event => {
  const button = event.target.closest("button[data-category]");
  if (button) {
    applyCategory(button.dataset.category, button.dataset.subcategory || "", {
      search: button.dataset.query || "",
      label: button.dataset.label || "",
    });
  }
});

els.clearCategory?.addEventListener("click", () => applyCategory("", ""));

document.addEventListener("keydown", event => { if (event.key === "Escape") closeCategoriesMenu(); });

els.prev?.addEventListener("click", () => {
  if (state.page > 1) { state.page -= 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

els.next?.addEventListener("click", () => {
  if (state.page < state.totalPages) { state.page += 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

loadCategories();
loadProducts();
