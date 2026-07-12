const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const params = new URLSearchParams(location.search);
const model = params.get("model");
const requestedShade = params.get("shade");

const els = {
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
  variantCode: document.getElementById("variantCode"),
  stock: document.getElementById("stock"),
  quote: document.getElementById("quoteButton"),
};

let product = null;
let selectedColor = null;
let selectedVariant = null;

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Cena na upit";
  return `${Number(value).toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function uniqueImages(color) {
  const images = [color?.image, ...(Array.isArray(color?.images) ? color.images : [])].filter(Boolean);
  return [...new Set(images)];
}

function chooseColor(colorCode, pushUrl = true) {
  selectedColor = product.colors.find(c => String(c.colorCode ?? "") === String(colorCode ?? "")) || product.colors[0];
  if (!selectedColor) return;

  document.querySelectorAll(".color-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.color === String(selectedColor.colorCode ?? ""));
  });

  els.selectedShadeLabel.textContent = selectedColor.colorCode ? `Šifra boje: ${selectedColor.colorCode}` : "";
  renderGallery(selectedColor);

  const variants = Array.isArray(selectedColor.variants) ? selectedColor.variants : [];
  renderSizes(variants);

  const preferred = variants.find(v => Number(v.stock) > 0) || variants[0] || null;
  chooseVariant(preferred);

  if (pushUrl && selectedColor.colorCode) {
    const next = new URL(location.href);
    next.searchParams.set("shade", selectedColor.colorCode);
    history.replaceState(null, "", next);
  }
}

function renderGallery(color) {
  const images = uniqueImages(color);
  const first = images[0] || "";
  els.mainImage.src = first;
  els.mainImage.alt = product.name || "Proizvod";
  els.mainImage.style.display = first ? "block" : "none";

  els.thumbs.innerHTML = images.map((src, i) =>
    `<button class="thumb ${i === 0 ? "active" : ""}" data-src="${src}"><img src="${src}" alt=""></button>`
  ).join("");

  els.thumbs.querySelectorAll(".thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      els.mainImage.src = btn.dataset.src;
      els.thumbs.querySelectorAll(".thumb").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function renderSizes(variants) {
  const hasSizes = variants.some(v => v.size);
  els.sizeBlock.classList.toggle("hidden", !hasSizes);

  if (!hasSizes) {
    els.sizeOptions.innerHTML = "";
    return;
  }

  els.sizeOptions.innerHTML = variants.map((v, index) => `
    <button class="size-button" data-index="${index}" type="button" ${Number(v.stock) <= 0 ? 'title="Trenutno bez lagera"' : ""}>
      ${v.size || "—"}
    </button>
  `).join("");

  els.sizeOptions.querySelectorAll(".size-button").forEach(btn => {
    btn.addEventListener("click", () => chooseVariant(variants[Number(btn.dataset.index)]));
  });
}

function chooseVariant(variant) {
  selectedVariant = variant;
  if (!variant) return;

  document.querySelectorAll(".size-button").forEach((btn, index) => {
    const variants = selectedColor?.variants || [];
    btn.classList.toggle("active", variants[index]?.code === variant.code);
  });

  els.selectedSizeLabel.textContent = variant.size ? `Izabrano: ${variant.size}` : "";
  els.variantCode.textContent = variant.code || "—";
  els.price.textContent = money(variant.price);
  const stock = Number(variant.stock || 0);
  els.stock.textContent = stock > 0 ? `${stock.toLocaleString("sr-RS")} kom.` : "Nema na lageru";

  if (variant.image && !els.mainImage.src) els.mainImage.src = variant.image;
}

async function loadProduct() {
  if (!model) {
    els.message.textContent = "Nedostaje model proizvoda u URL-u.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/product-grouped?model=${encodeURIComponent(model)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success || !data.product) throw new Error(data.error || "Proizvod nije pronađen.");

    product = data.product;
    document.title = `${product.name || product.modelCode} — DemoShop v2`;
    els.breadcrumb.textContent = [product.category, product.subCategory].filter(Boolean).join(" / ");
    els.name.textContent = product.name || "Bez naziva";
    els.model.textContent = product.modelCode || model;

    const colors = Array.isArray(product.colors) ? product.colors : [];
    els.colorOptions.innerHTML = colors.map(color => `
      <button class="color-button" type="button" data-color="${color.colorCode ?? ""}" title="Boja ${color.colorCode ?? ""}">
        <span>${color.colorCode ?? "—"}</span>
      </button>
    `).join("");

    els.colorOptions.querySelectorAll(".color-button").forEach(btn => {
      btn.addEventListener("click", () => chooseColor(btn.dataset.color));
    });

    els.message.classList.add("hidden");
    els.detail.classList.remove("hidden");

    const initialColor =
      colors.find(c => String(c.colorCode ?? "") === String(requestedShade ?? "")) ||
      colors[0];

    if (initialColor) chooseColor(initialColor.colorCode, false);
  } catch (error) {
    console.error(error);
    els.message.textContent = `Greška pri učitavanju proizvoda: ${error.message}`;
  }
}

els.quote.addEventListener("click", () => {
  const details = selectedVariant
    ? `Model: ${product.modelCode}\nVarijanta: ${selectedVariant.code}\nBoja: ${selectedColor?.colorCode || "—"}\nVeličina: ${selectedVariant.size || "—"}`
    : `Model: ${product?.modelCode || model}`;

  alert(`Upit za proizvod\n\n${details}\n\nSledeće povezujemo sa pravom korpom i email porudžbinom.`);
});

loadProduct();
