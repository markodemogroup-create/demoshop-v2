(function () {
  const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
  const form = document.querySelector("[data-header-search]");
  const input = form?.querySelector("[data-header-search-input]");
  const suggestions = form?.querySelector("[data-header-search-suggestions]");
  if (!form || !input || !suggestions) return;

  let timer;
  let requestId = 0;
  let activeIndex = -1;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);

  function closeSuggestions() {
    suggestions.classList.add("hidden");
    suggestions.innerHTML = "";
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
  }

  function setActive(index) {
    const items = [...suggestions.querySelectorAll(".search-suggestion")];
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === activeIndex));
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  async function loadSuggestions() {
    const query = input.value.trim();
    if (query.length < 2) return closeSuggestions();
    const currentRequest = ++requestId;

    try {
      const params = new URLSearchParams({ search: query, page: "1", limit: "6" });
      const response = await fetch(`${API_BASE}/products-grouped?${params}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (currentRequest !== requestId) return;
      const products = Array.isArray(data.products) ? data.products : [];

      suggestions.innerHTML = products.length
        ? products.map(product => {
            const model = String(product.modelCode || "");
            const title = String(product.name || model || "Proizvod").split(",")[0];
            const rawId = String(product.representativeVariantId || "").split("-")[0].replace(/[^a-zA-Z0-9]/g, "");
            const image = rawId ? `https://apiv2.promosolution.services/content/ModelItem/${rawId}_001.webp` : "";
            return `<a class="search-suggestion" role="option" href="product.html?model=${encodeURIComponent(model)}&v=56">
              <span class="search-suggestion-copy"><strong>${escapeHtml(title)}</strong><small>Model ${escapeHtml(model)}</small></span>
              ${image ? `<img class="search-suggestion-image" src="${image}" alt="" loading="lazy">` : ""}
            </a>`;
          }).join("")
        : '<div class="search-suggestion-empty">Nema pronađenih proizvoda.</div>';
      suggestions.classList.remove("hidden");
      input.setAttribute("aria-expanded", "true");
      activeIndex = -1;
    } catch {
      closeSuggestions();
    }
  }

  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(loadSuggestions, 250);
  });
  input.addEventListener("keydown", event => {
    const items = [...suggestions.querySelectorAll(".search-suggestion")];
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault();
      window.location.href = items[activeIndex].href;
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const query = input.value.trim();
    window.location.href = query ? `index.html?search=${encodeURIComponent(query)}#catalogStart` : "index.html";
  });
  document.addEventListener("click", event => {
    if (!form.contains(event.target)) closeSuggestions();
  });
})();
