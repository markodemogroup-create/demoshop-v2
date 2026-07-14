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
  searchSuggestions: document.getElementById("searchSuggestions"),
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
  suggestionRequestId: 0,
  suggestionIndex: -1,
};

const variantDetailCache = new Map();
let menuCategories = [];
const menuSelection = { categoryCode: "", subCategoryCode: "" };

const initialUrlParams = new URLSearchParams(window.location.search);
state.search = initialUrlParams.get("search") || "";
state.category = initialUrlParams.get("category") || "";
state.subCategory = initialUrlParams.get("subCategory") || "";
if (els.searchInput) els.searchInput.value = state.search;

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

const DISPLAY_COLOR_WORDS = /^(crn|crna|crni|crno|crne|bel|bela|beli|belo|bele|bijel|bijela|plav|plava|plavi|plavo|crven|crvena|crveni|crveno|zelen|zelena|zeleni|zeleno|žut|žuta|žuti|žuto|zut|zuta|zuti|zuto|siv|siva|sivi|sivo|roze|roza|pink|narandžast|narandžasta|narandzast|narandzasta|ljubičast|ljubičasta|ljubicast|ljubicasta|braon|teget|bež|bez|bordo|tirkiz|tirkizna|ciklama|lila|srebrn|srebrna|zlatn|zlatna|transparentan|transparentna)$/i;

function productDisplayName(value) {
  const parts = String(value || "").split(",").map(part => part.trim()).filter(Boolean);
  const title = parts.shift() || "Bez naziva";
  while (parts.length && DISPLAY_COLOR_WORDS.test(parts[parts.length - 1])) parts.pop();
  return { title, description: parts.join(", ") };
}

function modelAssetIds(...values) {
  const ids = [];

  values.filter(Boolean).forEach(value => {
    const code = String(value).trim().replace(/-(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|[2-9]XL|[0-9]{2,3})$/i, "");
    const parts = code.split(".").filter(Boolean);

    if (parts.length >= 3 && /^\d{1,4}$/.test(parts[parts.length - 1])) {
      ids.push(parts.slice(0, -1).join("").replace(/[^a-zA-Z0-9]/g, ""));
    }

    ids.push(code.replace(/[^a-zA-Z0-9]/g, ""));
  });

  return [...new Set(ids.filter(Boolean))];
}

function highlightSearchMatch(value, query) {
  const text = String(value || "");
  const needle = String(query || "").trim();
  if (!needle) return escapeHtml(text);
  const index = text.toLocaleLowerCase("sr-Latn").indexOf(needle.toLocaleLowerCase("sr-Latn"));
  if (index < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + needle.length))}</mark>${escapeHtml(text.slice(index + needle.length))}`;
}

function hideSearchSuggestions() {
  state.suggestionIndex = -1;
  els.searchSuggestions?.classList.add("hidden");
  if (els.searchSuggestions) els.searchSuggestions.innerHTML = "";
  els.searchInput?.setAttribute("aria-expanded", "false");
}

function selectSearchSuggestion(index) {
  const items = [...(els.searchSuggestions?.querySelectorAll(".search-suggestion") || [])];
  if (!items.length) return;
  state.suggestionIndex = Math.max(0, Math.min(index, items.length - 1));
  items.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === state.suggestionIndex));
  items[state.suggestionIndex]?.scrollIntoView({ block: "nearest" });
}

async function loadSearchSuggestions() {
  const query = els.searchInput?.value.trim() || "";
  const requestId = ++state.suggestionRequestId;
  if (query.length < 2) return hideSearchSuggestions();

  try {
    const searchParams = new URLSearchParams({ search: query, page: "1", limit: "6" });
    const response = await fetch(`${API_BASE}/products-grouped?${searchParams}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (requestId !== state.suggestionRequestId) return;
    const products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) {
      els.searchSuggestions.innerHTML = `<div class="search-suggestion-empty">Nema pronađenih proizvoda.</div>`;
    } else {
      els.searchSuggestions.innerHTML = products.map((product, index) => {
        const display = productDisplayName(product.name);
        const model = product.modelCode || "";
        const href = `product.html?model=${encodeURIComponent(model)}&v=31`;
        return `<a class="search-suggestion" role="option" href="${href}">
          <span class="search-suggestion-copy"><strong>${highlightSearchMatch(display.title, query)}</strong><small>${highlightSearchMatch(model, query)}</small>${display.description ? `<em>${highlightSearchMatch(display.description, query)}</em>` : ""}</span>
          <img class="search-suggestion-image" data-suggestion-index="${index}" alt="">
        </a>`;
      }).join("");
    }
    state.suggestionIndex = -1;
    els.searchSuggestions.classList.remove("hidden");
    els.searchInput.setAttribute("aria-expanded", "true");
    hydrateSearchSuggestionImages(products, requestId);
  } catch (error) {
    if (requestId === state.suggestionRequestId) hideSearchSuggestions();
    console.error("Predlozi pretrage nisu dostupni", error);
  }
}

function loadImageFromCandidates(image, candidates) {
  const urls = [...new Set(candidates.filter(Boolean))];
  let cursor = 0;

  function tryNext() {
    const url = urls[cursor++];
    if (!url) {
      image.hidden = true;
      image.classList.remove("loaded");
      image.removeAttribute("src");
      return;
    }

    image.hidden = false;
    image.classList.remove("loaded");
    image.onload = () => {
      image.classList.add("loaded");
      image.onload = null;
      image.onerror = null;
    };
    image.onerror = tryNext;
    image.src = url;
  }

  tryNext();
}

async function hydrateSearchSuggestionImages(products, requestId) {
  await Promise.all(products.map(async (product, index) => {
    const detail = await fetchVariantDetail(product.representativeVariantId);
    if (requestId !== state.suggestionRequestId) return;

    const image = els.searchSuggestions?.querySelector(`[data-suggestion-index="${index}"]`);
    if (!image) return;

    const imageIds = modelAssetIds(product.modelCode, product.representativeCode);
    const modelImages = imageIds.map(id =>
      `https://apiv2.promosolution.services/content/ModelItem/${id}_000.webp`
    );

    loadImageFromCandidates(image, [
      ...modelImages,
      detail?.image,
      ...(Array.isArray(detail?.images) ? detail.images : []),
    ]);
  }));
}

let suggestionTimer;
function scheduleSearchSuggestions() {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(loadSearchSuggestions, 250);
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0
    ? `${price.toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : "Cena na upit";
}

function cardTemplate(product, index) {
  const model = product.modelCode || "";
  const imageIds = modelAssetIds(model, product.representativeCode);
  const modelImageId = imageIds[0] || "";
  const href = `product.html?model=${encodeURIComponent(model)}&v=31`;
  const category = [product.category, product.subCategory].filter(Boolean).join(" · ");
  const display = productDisplayName(product.name);

  return `
    <article class="product-card" data-detail-id="${escapeHtml(product.representativeVariantId || "")}" data-model-image-id="${escapeHtml(modelImageId)}" data-model-image-ids="${escapeHtml(imageIds.join(","))}" data-index="${index}">
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
        <h2><a href="${href}">${escapeHtml(display.title)}</a></h2>
        ${display.description ? `<p class="card-description">${escapeHtml(display.description)}</p>` : ""}
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
  if (variantDetailCache.has(id)) return variantDetailCache.get(id);

  const detailPromise = fetch(`${API_BASE}/variant-detail?id=${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  })
    .then(async response => {
      if (!response.ok) return null;
      const data = await response.json();
      return data.success ? data.variant : null;
    })
    .catch(() => null);

  variantDetailCache.set(id, detailPromise);
  return detailPromise;
}

function applyCardDetail(card, detail) {
  const skeleton = card.querySelector(".image-skeleton");
  const image = card.querySelector(".card-image-primary");
  const hoverImage = card.querySelector(".card-image-hover");
  const media = card.querySelector(".card-media");
  const price = card.querySelector(".card-price");
  skeleton?.remove();

  const modelImageId = card.dataset.modelImageId || "";
  const modelImageUrl = modelImageId
    ? `https://apiv2.promosolution.services/content/ModelItem/${modelImageId}_000.webp`
    : "";

  if (modelImageUrl) {
    image.alt = detail?.name || "Proizvod";
    image.onload = () => image.classList.add("loaded");
    image.onerror = () => {
      image.onerror = null;
      if (detail?.image) {
        image.src = detail.image;
      } else {
        media?.classList.add("no-image");
      }
    };
    image.src = modelImageUrl;
  } else if (detail?.image) {
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

  const detailImages = [...new Set([
    detail?.image,
    ...(Array.isArray(detail?.images) ? detail.images : []),
  ].filter(Boolean))];
  const modelImageIds = String(card.dataset.modelImageIds || modelImageId)
    .split(",")
    .filter(Boolean);
  const marketingHoverUrls = modelImageIds.map(id =>
    `https://apiv2.promosolution.services/content/ModelItem/${id}_090.webp`
  );
  const hoverCandidates = [...new Set([
    ...marketingHoverUrls,
    ...detailImages.filter(url => url !== modelImageUrl),
  ].filter(Boolean))];

  if (hoverImage && hoverCandidates.length) {
    const loadHoverImage = () => {
      if (hoverImage.dataset.loaded) return;
      hoverImage.dataset.loaded = "true";
      let candidateIndex = 0;

      const tryNextHoverImage = () => {
        const nextUrl = hoverCandidates[candidateIndex++];
        if (!nextUrl) {
          media?.classList.remove("has-hover-image");
          return;
        }

        hoverImage.onload = () => {
          hoverImage.classList.add("loaded");
          media?.classList.add("has-hover-image");
        };
        hoverImage.onerror = tryNextHoverImage;
        hoverImage.src = nextUrl;
      };

      tryNextHoverImage();
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
  document.body.classList.remove("menu-open");
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

function formatMenuCount(value) {
  return Number(value || 0).toLocaleString("sr-RS");
}

function renderCategoriesMenu() {
  if (!menuCategories.length) return;

  const activeCategory = menuCategories.find(category => category.code === menuSelection.categoryCode)
    || menuCategories.find(category => category.code === state.category)
    || menuCategories[0];
  const subCategories = Array.isArray(activeCategory.subCategories) ? activeCategory.subCategories : [];
  const activeSubCategory = subCategories.find(sub => sub.code === menuSelection.subCategoryCode)
    || subCategories.find(sub => sub.code === state.subCategory)
    || subCategories[0]
    || null;
  const narrowerGroups = activeSubCategory
    ? (window.CATALOG_TAXONOMY?.[activeSubCategory.code] || [])
    : [];

  menuSelection.categoryCode = activeCategory.code;
  menuSelection.subCategoryCode = activeSubCategory?.code || "";

  els.categoriesGrid.innerHTML = `
    <div class="category-browser">
      <section class="category-level category-level-primary" aria-label="Kategorije">
        <div class="category-level-heading">
          <div><span>Korak 1</span><strong>Kategorije</strong></div>
          <button type="button" class="menu-all-link" data-menu-apply data-category="">Ceo katalog</button>
        </div>
        <div class="menu-step-list">
          ${menuCategories.map(category => `
            <button type="button" class="menu-step-button ${category.code === activeCategory.code ? "active" : ""}"
              data-menu-category="${escapeHtml(category.code)}" aria-pressed="${category.code === activeCategory.code}">
              <span>${escapeHtml(categoryLabel(category.code))}</span>
              <small>${formatMenuCount(category.count)}</small>
              <b aria-hidden="true">›</b>
            </button>`).join("")}
        </div>
      </section>

      <section class="category-level category-level-secondary" aria-label="Potkategorije">
        <div class="category-level-heading">
          <div><span>Korak 2</span><strong>${escapeHtml(categoryLabel(activeCategory.code))}</strong></div>
          <button type="button" class="menu-all-link" data-menu-apply data-category="${escapeHtml(activeCategory.code)}">
            Prikaži sve
          </button>
        </div>
        <div class="menu-step-list">
          ${subCategories.map(sub => `
            <button type="button" class="menu-step-button ${sub.code === activeSubCategory?.code ? "active" : ""}"
              data-menu-subcategory="${escapeHtml(sub.code)}" aria-pressed="${sub.code === activeSubCategory?.code}">
              <span>${escapeHtml(subCategoryLabel(sub.code))}</span>
              <small>${formatMenuCount(sub.count)}</small>
              <b aria-hidden="true">›</b>
            </button>`).join("") || `<p class="menu-empty-copy">Za ovu kategoriju trenutno nema potkategorija.</p>`}
        </div>
      </section>

      <section class="category-level category-level-tertiary" aria-label="Uže grupe proizvoda">
        <div class="category-level-heading">
          <div><span>Korak 3</span><strong>${escapeHtml(activeSubCategory ? subCategoryLabel(activeSubCategory.code) : "Izaberite grupu")}</strong></div>
        </div>
        ${activeSubCategory ? `
          <button type="button" class="menu-featured-action" data-menu-apply
            data-category="${escapeHtml(activeCategory.code)}" data-subcategory="${escapeHtml(activeSubCategory.code)}">
            <span>Prikaži sve: <strong>${escapeHtml(subCategoryLabel(activeSubCategory.code))}</strong></span>
            <b aria-hidden="true">→</b>
          </button>` : ""}
        <div class="menu-tertiary-list">
          ${narrowerGroups.map(item => `
            <button type="button" data-menu-apply
              data-category="${escapeHtml(activeCategory.code)}"
              data-subcategory="${escapeHtml(activeSubCategory.code)}"
              data-query="${escapeHtml(item.query)}"
              data-label="${escapeHtml(item.label)}">
              <span>${escapeHtml(item.label)}</span><b aria-hidden="true">→</b>
            </button>`).join("") || `<p class="menu-empty-copy">Nema dodatne podele. Izaberite „Prikaži sve“ za ovu potkategoriju.</p>`}
        </div>
      </section>
    </div>`;
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/catalog-filters`, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.success || !Array.isArray(data.categories)) return;

    menuCategories = data.categories;
    menuSelection.categoryCode = state.category;
    menuSelection.subCategoryCode = state.subCategory;
    renderCategoriesMenu();
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
  hideSearchSuggestions();
  state.search = els.searchInput.value.trim();
  state.collectionLabel = "";
  state.page = 1;
  loadProducts();
});

els.searchInput?.setAttribute("aria-autocomplete", "list");
els.searchInput?.setAttribute("aria-expanded", "false");
els.searchInput?.addEventListener("input", scheduleSearchSuggestions);
els.searchInput?.addEventListener("keydown", event => {
  const items = [...(els.searchSuggestions?.querySelectorAll(".search-suggestion") || [])];
  if (event.key === "ArrowDown" && items.length) {
    event.preventDefault();
    selectSearchSuggestion(state.suggestionIndex + 1);
  } else if (event.key === "ArrowUp" && items.length) {
    event.preventDefault();
    selectSearchSuggestion(state.suggestionIndex <= 0 ? items.length - 1 : state.suggestionIndex - 1);
  } else if (event.key === "Enter" && state.suggestionIndex >= 0 && items[state.suggestionIndex]) {
    event.preventDefault();
    window.location.href = items[state.suggestionIndex].href;
  } else if (event.key === "Escape") {
    hideSearchSuggestions();
  }
});

document.addEventListener("pointerdown", event => {
  if (!event.target.closest("#searchForm")) hideSearchSuggestions();
});

els.clearSearch?.addEventListener("click", () => {
  hideSearchSuggestions();
  state.search = "";
  state.collectionLabel = "";
  state.page = 1;
  els.searchInput.value = "";
  loadProducts();
});

els.categoriesToggle?.addEventListener("click", () => {
  const willOpen = els.categoriesMenu.classList.contains("hidden");
  if (willOpen && menuCategories.length) {
    menuSelection.categoryCode = state.category;
    menuSelection.subCategoryCode = state.subCategory;
    renderCategoriesMenu();
  }
  els.categoriesMenu.classList.toggle("hidden", !willOpen);
  els.categoriesToggle.setAttribute("aria-expanded", String(willOpen));
  document.body.classList.toggle("menu-open", willOpen);
});

document.querySelectorAll(".quick-category").forEach(button => {
  button.addEventListener("click", () => applyCategory(button.dataset.category));
});

els.categoriesGrid?.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  event.stopPropagation();

  const categoryStep = target.closest("button[data-menu-category]");
  if (categoryStep) {
    menuSelection.categoryCode = categoryStep.dataset.menuCategory || "";
    menuSelection.subCategoryCode = "";
    renderCategoriesMenu();
    return;
  }

  const subCategoryStep = target.closest("button[data-menu-subcategory]");
  if (subCategoryStep) {
    menuSelection.subCategoryCode = subCategoryStep.dataset.menuSubcategory || "";
    renderCategoriesMenu();
    return;
  }

  const applyButton = target.closest("button[data-menu-apply]");
  if (applyButton) {
    applyCategory(applyButton.dataset.category || "", applyButton.dataset.subcategory || "", {
      search: applyButton.dataset.query || "",
      label: applyButton.dataset.label || "",
    });
  }
});

els.clearCategory?.addEventListener("click", () => applyCategory("", ""));

document.addEventListener("keydown", event => { if (event.key === "Escape") closeCategoriesMenu(); });
document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || els.categoriesMenu.classList.contains("hidden")) return;
  if (!els.categoriesMenu.contains(target) && !els.categoriesToggle.contains(target)) closeCategoriesMenu();
});

els.prev?.addEventListener("click", () => {
  if (state.page > 1) { state.page -= 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

els.next?.addEventListener("click", () => {
  if (state.page < state.totalPages) { state.page += 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

loadCategories();
loadProducts();
