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
  prev: document.getElementById("prevPage"),
  next: document.getElementById("nextPage"),
  paginationText: document.getElementById("paginationText"),
};

const state = { page: 1, totalPages: 1, search: "", requestId: 0 };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price)
    ? `${price.toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : "Cena na upit";
}

function cardTemplate(product, index) {
  const model = product.modelCode || "";
  const href = `product.html?model=${encodeURIComponent(model)}`;
  const category = [product.category, product.subCategory].filter(Boolean).join(" · ");

  return `
    <article class="product-card" data-detail-id="${escapeHtml(product.representativeVariantId || "")}" data-index="${index}">
      <a class="card-image-link" href="${href}" aria-label="Otvori ${escapeHtml(product.name || model)}">
        <div class="card-media">
          <div class="image-skeleton"></div>
          <img class="card-image" alt="" loading="lazy">
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
  const image = card.querySelector(".card-image");
  const price = card.querySelector(".card-price");
  skeleton?.remove();

  if (detail?.image) {
    image.src = detail.image;
    image.alt = detail.name || "Proizvod";
    image.classList.add("loaded");
  } else {
    card.querySelector(".card-media")?.classList.add("no-image");
  }
  price.textContent = formatPrice(detail?.price);
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

async function loadProducts() {
  const requestId = ++state.requestId;
  els.message.classList.remove("hidden");
  els.message.textContent = "Učitavanje proizvoda…";
  els.grid.innerHTML = "";

  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_LIMIT) });
  if (state.search) params.set("search", state.search);

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
    els.resultsLabel.textContent = state.search ? `rezultata za „${state.search}”` : "proizvoda";
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

els.searchForm.addEventListener("submit", event => {
  event.preventDefault();
  state.search = els.searchInput.value.trim();
  state.page = 1;
  loadProducts();
});

els.clearSearch.addEventListener("click", () => {
  state.search = "";
  state.page = 1;
  els.searchInput.value = "";
  loadProducts();
});

els.prev.addEventListener("click", () => {
  if (state.page > 1) { state.page -= 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

els.next.addEventListener("click", () => {
  if (state.page < state.totalPages) { state.page += 1; loadProducts(); window.scrollTo({ top: 260, behavior: "smooth" }); }
});

loadProducts();
