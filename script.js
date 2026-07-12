const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const PAGE_LIMIT = 20;

const els = {
  apiStatus: document.getElementById("apiStatus"),
  totalCards: document.getElementById("totalCards"),
  totalMatches: document.getElementById("totalMatches"),
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

const state = { page: 1, totalPages: 1, search: "" };

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}

async function loadProducts() {
  els.message.classList.remove("hidden");
  els.message.textContent = "Učitavanje proizvoda…";
  els.grid.innerHTML = "";

  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(PAGE_LIMIT),
  });
  if (state.search) params.set("search", state.search);

  try {
  const apiUrl =
  `${API_BASE}/products-grouped?${params}`;

console.log("Pozivam API:", apiUrl);

const response = await fetch(apiUrl, {
  method: "GET",
  mode: "cors",
  cache: "no-store",
  headers: {
    Accept: "application/json",
  },
});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "API nije vratio uspešan odgovor.");

    state.page = data.page || 1;
    state.totalPages = data.totalPages || 1;

    els.apiStatus.textContent = "API povezan";
    els.apiStatus.classList.add("ok");
    els.totalCards.textContent = Number(data.totalGroupedCards || 0).toLocaleString("sr-RS");
    els.totalMatches.textContent = Number(data.totalMatchingProducts || 0).toLocaleString("sr-RS");
    els.pageInfo.textContent = `${state.page} / ${state.totalPages}`;
    els.paginationText.textContent = `Strana ${state.page} od ${state.totalPages}`;
    els.prev.disabled = !data.hasPreviousPage;
    els.next.disabled = !data.hasNextPage;
    els.clearSearch.classList.toggle("hidden", !state.search);

    const products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) {
      els.message.textContent = "Nema proizvoda koji odgovaraju pretrazi.";
      return;
    }

    els.message.classList.add("hidden");
    els.grid.innerHTML = products.map(product => {
      const model = product.modelCode || "";
      const href = `product.html?model=${encodeURIComponent(model)}`;
      return `
        <a class="product-card" href="${href}">
          <div class="card-placeholder">
            <span>Otvori proizvod</span>
          </div>
          <div class="card-body">
            <p class="card-code">${esc(model)}</p>
            <h2>${esc(product.name || "Bez naziva")}</h2>
            <p class="card-category">${esc(product.category || "")}${product.subCategory ? " · " + esc(product.subCategory) : ""}</p>
            <div class="chips">
              ${product.colorCount ? `<span>${product.colorCount} boja</span>` : ""}
              ${product.sizeCount ? `<span>${product.sizeCount} veličina</span>` : ""}
              <span>${product.variantCount || 1} varijanti</span>
            </div>
          </div>
        </a>`;
    }).join("");
  } catch (error) {
    console.error(error);
    els.apiStatus.textContent = "Greška API veze";
    els.message.textContent = `Greška pri učitavanju: ${error.message}`;
  }
}

els.searchForm.addEventListener("submit", e => {
  e.preventDefault();
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
  if (state.page > 1) {
    state.page--;
    loadProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

els.next.addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page++;
    loadProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

loadProducts();
