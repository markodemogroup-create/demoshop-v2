const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const params = new URLSearchParams(window.location.search);
const requestedModel = params.get("model");
const requestedShade = params.get("shade");

const elements = {
  message: document.getElementById("productMessage"),
  detail: document.getElementById("productDetail"),
  mainImage: document.getElementById("mainImage"),
  thumbs: document.getElementById("thumbs"),
  breadcrumb: document.getElementById("breadcrumb"),
  name: document.getElementById("productName"),
  model: document.getElementById("modelCode"),
  price: document.getElementById("price"),
  colorOptions: document.getElementById("colorOptions"),
  selectedShadeLabel: document.getElementById("selectedShadeLabel"),
  sizeBlock: document.getElementById("sizeBlock"),
  sizeOptions: document.getElementById("sizeOptions"),
  selectedSizeLabel: document.getElementById("selectedSizeLabel"),
  variantTableBlock: document.getElementById("variantTableBlock"),
  variantTableBody: document.getElementById("variantTableBody"),
  variantCode: document.getElementById("variantCode"),
  stock: document.getElementById("stock"),
  quoteButton: document.getElementById("quoteButton"),
};

let product;
let selectedColor;
let selectedVariant;
let loadedVariantDetail;
let variantRequestNumber = 0;
let colorRequestNumber = 0;
const detailCache = new Map();

async function getVariantDetail(id) {
  if (!id) return null;
  if (detailCache.has(id)) return detailCache.get(id);
  const promise = fetch(`${API_BASE}/variant-detail?id=${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  }).then(async response => {
    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.variant : null;
  }).catch(() => null);
  detailCache.set(id, promise);
  return promise;
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price)
    ? `${price.toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : "Cena na upit";
}

function formatStock(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock <= 0) return "Nema na lageru";
  return `${stock.toLocaleString("sr-RS")} kom. na lageru`;
}

function uniqueImages(detail) {
  return [...new Set([detail?.image, ...(detail?.images || [])].filter(Boolean))];
}

function fallbackImageForId(id) {
  const baseId = String(id || "").split("-")[0].replace(/[^a-zA-Z0-9]/g, "");
  return baseId ? `https://apiv2.promosolution.services/content/ModelItem/${baseId}_001.webp` : "";
}

function showMessage(message) {
  elements.message.textContent = message;
  elements.message.classList.remove("hidden");
}

function hideMessage() {
  elements.message.classList.add("hidden");
}

function updateUrlShade(colorCode) {
  if (!colorCode) return;
  const url = new URL(window.location.href);
  url.searchParams.set("shade", colorCode);
  window.history.replaceState(null, "", url);
}

function renderGallery(detail) {
  const images = uniqueImages(detail);
  elements.thumbs.innerHTML = "";

  if (!images.length) {
    elements.mainImage.removeAttribute("src");
    elements.mainImage.alt = "Slika trenutno nije dostupna";
    return;
  }

  elements.mainImage.src = images[0];
  elements.mainImage.alt = detail?.name || product?.name || "Proizvod";
  elements.thumbs.innerHTML = images.map((image, index) => `
    <button class="thumb ${index === 0 ? "active" : ""}" type="button" data-image="${image}" aria-label="Prikaži sliku ${index + 1}">
      <img src="${image}" alt="" loading="lazy">
    </button>`).join("");

  elements.thumbs.querySelectorAll(".thumb").forEach(button => {
    button.addEventListener("click", () => {
      elements.mainImage.src = button.dataset.image;
      elements.thumbs.querySelectorAll(".thumb").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

async function loadVariantDetail(variant) {
  if (!variant?.id) return showMessage("Izabrana varijanta nema ispravan ID.");
  selectedVariant = variant;
  const requestNumber = ++variantRequestNumber;
  elements.variantCode.textContent = variant.code || "—";
  elements.price.textContent = "Učitavanje cene…";
  elements.stock.textContent = "Provera lagera…";
  elements.mainImage.classList.add("loading-image");

  try {
    const detail = await getVariantDetail(variant.id);
    if (!detail) throw new Error("Detalji nisu dostupni.");
    if (requestNumber !== variantRequestNumber) return;

    loadedVariantDetail = detail;
    elements.variantCode.textContent = detail.code || variant.code || "—";
    elements.price.textContent = formatPrice(detail.price);
    elements.stock.textContent = formatStock(detail.stock);
    renderGallery(detail);
    hideMessage();
  } catch (error) {
    if (requestNumber !== variantRequestNumber) return;
    elements.price.textContent = "Cena nije dostupna";
    elements.stock.textContent = "Lager nije dostupan";
    const fallbackImage = fallbackImageForId(variant.id);
    if (fallbackImage) renderGallery({ image: fallbackImage, name: variant.name || product?.name });
    showMessage("Nije uspelo učitavanje izabrane varijante. Pokušajte ponovo.");
    console.error(error);
  } finally {
    if (requestNumber === variantRequestNumber) elements.mainImage.classList.remove("loading-image");
  }
}

async function renderVariantTable(variants) {
  const requestNumber = ++colorRequestNumber;
  const hasSizes = variants.some(variant => Boolean(variant.size));
  elements.variantTableBlock.classList.toggle("hidden", !hasSizes);
  if (!hasSizes) return;

  elements.variantTableBody.innerHTML = variants.map(variant => `
    <button class="variant-table-row loading" type="button">
      <span><strong>${variant.size || "—"}</strong><small>${variant.code || ""}</small></span>
      <span>Učitavanje…</span><span>—</span>
    </button>`).join("");

  const details = await mapWithConcurrency(variants, 3, variant => getVariantDetail(variant.id));
  if (requestNumber !== colorRequestNumber) return;

  elements.variantTableBody.innerHTML = variants.map((variant, index) => {
    const detail = details[index];
    const stock = Number(detail?.stock);
    return `
      <button class="variant-table-row" type="button" data-index="${index}">
        <span><strong>${variant.size || "—"}</strong><small>${detail?.code || variant.code || ""}</small></span>
        <span>${formatPrice(detail?.price)}</span>
        <span class="${stock > 0 ? "in-stock" : "out-stock"}">${stock > 0 ? stock.toLocaleString("sr-RS") : "—"}</span>
      </button>`;
  }).join("");

  elements.variantTableBody.querySelectorAll(".variant-table-row").forEach(button => {
    button.addEventListener("click", () => selectVariant(variants[Number(button.dataset.index)]));
  });
}

function selectVariant(variant) {
  if (!variant) return;
  selectedVariant = variant;
  const variants = selectedColor?.variants || [];
  elements.sizeOptions.querySelectorAll(".size-button").forEach(button => {
    button.classList.toggle("active", variants[Number(button.dataset.index)]?.id === variant.id);
  });
  elements.selectedSizeLabel.textContent = variant.size ? `Izabrano: ${variant.size}` : "";
  loadVariantDetail(variant);
}

function renderSizes(variants = []) {
  const hasSizes = variants.some(variant => Boolean(variant.size));
  elements.sizeBlock.classList.toggle("hidden", !hasSizes);
  elements.sizeOptions.innerHTML = hasSizes
    ? variants.map((variant, index) => `<button class="size-button" type="button" data-index="${index}">${variant.size || "—"}</button>`).join("")
    : "";

  elements.sizeOptions.querySelectorAll(".size-button").forEach(button => {
    button.addEventListener("click", () => selectVariant(variants[Number(button.dataset.index)]));
  });
  renderVariantTable(variants);
  selectVariant(variants[0]);
}

function selectColor(colorCode, updateUrl = true) {
  const colors = product?.colors || [];
  selectedColor = colors.find(color => String(color.colorCode ?? "") === String(colorCode ?? "")) || colors[0];
  if (!selectedColor) return showMessage("Proizvod nema dostupne varijante.");

  elements.colorOptions.querySelectorAll(".color-button").forEach(button => {
    button.classList.toggle("active", button.dataset.color === String(selectedColor.colorCode ?? ""));
  });
  elements.selectedShadeLabel.textContent = selectedColor.colorCode ? `Šifra boje: ${selectedColor.colorCode}` : "Osnovna varijanta";
  if (updateUrl) updateUrlShade(selectedColor.colorCode);
  renderSizes(selectedColor.variants || []);
}

async function renderColors(colors = []) {
  elements.colorOptions.innerHTML = colors.map(color => `
    <button class="color-button color-photo-button loading" type="button" data-color="${color.colorCode ?? ""}" title="Nijansa ${color.colorCode ?? ""}">
      <span class="color-photo-wrap"><span class="color-photo-skeleton"></span><img alt=""></span>
      <span class="color-code">${color.colorCode ?? "—"}</span>
    </button>`).join("");
  elements.colorOptions.querySelectorAll(".color-button").forEach(button => {
    button.addEventListener("click", () => selectColor(button.dataset.color));
  });

  const details = await mapWithConcurrency(colors, 3, color => getVariantDetail(color.representativeVariantId));
  elements.colorOptions.querySelectorAll(".color-button").forEach((button, index) => {
    const detail = details[index];
    button.classList.remove("loading");
    const image = button.querySelector("img");
    button.querySelector(".color-photo-skeleton")?.remove();
    if (detail?.image) {
      image.src = detail.image;
      image.alt = detail.name || `Nijansa ${colors[index].colorCode}`;
    } else {
      const fallbackImage = fallbackImageForId(colors[index].representativeVariantId);
      if (fallbackImage) {
        image.src = fallbackImage;
        image.alt = `Nijansa ${colors[index].colorCode}`;
        image.onerror = () => button.querySelector(".color-photo-wrap").classList.add("no-photo");
      } else {
        button.querySelector(".color-photo-wrap").classList.add("no-photo");
      }
    }
  });
}

async function loadProduct() {
  if (!requestedModel) return showMessage("Nedostaje model proizvoda u adresi.");
  showMessage("Učitavanje proizvoda…");

  try {
    const response = await fetch(`${API_BASE}/product-grouped?model=${encodeURIComponent(requestedModel)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success || !data.product) throw new Error(data.error || "Proizvod nije pronađen.");

    product = data.product;
    document.title = `${product.name || product.modelCode} — DemoShop`;
    elements.breadcrumb.textContent = [product.category, product.subCategory].filter(Boolean).join(" / ");
    elements.name.textContent = product.name || "Bez naziva";
    elements.model.textContent = product.modelCode || requestedModel;
    renderColors(product.colors || []);
    elements.detail.classList.remove("hidden");
    hideMessage();

    const initialColor = product.colors?.find(color => String(color.colorCode ?? "") === String(requestedShade ?? "")) || product.colors?.[0];
    if (initialColor) selectColor(initialColor.colorCode, false);
  } catch (error) {
    showMessage("Proizvod trenutno nije moguće učitati. Pokušajte ponovo.");
    console.error(error);
  }
}

elements.quoteButton.addEventListener("click", () => {
  const subject = encodeURIComponent(`Upit za ${product?.modelCode || requestedModel}`);
  const body = encodeURIComponent([
    "Poštovani,", "", "Zanima me ponuda za sledeći proizvod:",
    `Naziv: ${product?.name || "—"}`,
    `Model: ${product?.modelCode || requestedModel || "—"}`,
    `Varijanta: ${loadedVariantDetail?.code || selectedVariant?.code || "—"}`,
    `Boja: ${selectedColor?.colorCode || "—"}`,
    `Veličina: ${selectedVariant?.size || "—"}`,
    `Cena: ${elements.price.textContent}`, "", "Molim vas za ponudu.",
  ].join("\n"));
  window.location.href = `mailto:info@demogroup.rs?subject=${subject}&body=${body}`;
});

loadProduct();
