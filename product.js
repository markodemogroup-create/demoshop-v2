const API_BASE =
  "https://demo-group-api.marko-demogroup.workers.dev";

const params =
  new URLSearchParams(window.location.search);

const requestedModel =
  params.get("model");

const requestedShade =
  params.get("shade");

const elements = {
  message:
    document.getElementById("productMessage"),

  detail:
    document.getElementById("productDetail"),

  mainImage:
    document.getElementById("mainImage"),

  thumbs:
    document.getElementById("thumbs"),

  breadcrumb:
    document.getElementById("breadcrumb"),

  name:
    document.getElementById("productName"),

  model:
    document.getElementById("modelCode"),

  price:
    document.getElementById("price"),

  colorOptions:
    document.getElementById("colorOptions"),

  selectedShadeLabel:
    document.getElementById(
      "selectedShadeLabel"
    ),

  sizeBlock:
    document.getElementById("sizeBlock"),

  sizeOptions:
    document.getElementById("sizeOptions"),

  selectedSizeLabel:
    document.getElementById(
      "selectedSizeLabel"
    ),

  variantCode:
    document.getElementById("variantCode"),

  stock:
    document.getElementById("stock"),

  quoteButton:
    document.getElementById("quoteButton"),
};

let product = null;
let selectedColor = null;
let selectedVariant = null;
let loadedVariantDetail = null;
let variantRequestNumber = 0;

/*
==================================================
POMOĆNE FUNKCIJE
==================================================
*/

function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "Cena na upit";
  }

  return (
    Number(value).toLocaleString(
      "sr-RS",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ) + " €"
  );
}

function formatStock(value) {
  const stock = Number(value);

  if (!Number.isFinite(stock) || stock <= 0) {
    return "Nema na lageru";
  }

  return (
    stock.toLocaleString("sr-RS") +
    " kom."
  );
}

function uniqueImages(imagesValue) {
  const images = Array.isArray(imagesValue)
    ? imagesValue
    : [];

  return [
    ...new Set(
      images.filter(
        (image) =>
          typeof image === "string" &&
          image.trim() !== ""
      )
    ),
  ];
}

function setLoadingState(message) {
  elements.message.textContent = message;
  elements.message.classList.remove("hidden");
}

function hideMessage() {
  elements.message.classList.add("hidden");
}

function showError(message) {
  elements.message.textContent = message;
  elements.message.classList.remove("hidden");
}

function updateUrlShade(colorCode) {
  if (!colorCode) {
    return;
  }

  const nextUrl =
    new URL(window.location.href);

  nextUrl.searchParams.set(
    "shade",
    colorCode
  );

  window.history.replaceState(
    null,
    "",
    nextUrl
  );
}

/*
==================================================
GALERIJA
==================================================
*/

function renderGallery(variantDetail) {
  const images = uniqueImages([
    variantDetail?.image,
    ...(variantDetail?.images || []),
  ]);

  elements.thumbs.innerHTML = "";

  if (images.length === 0) {
    elements.mainImage.removeAttribute("src");
    elements.mainImage.alt =
      "Slika proizvoda trenutno nije dostupna";

    elements.mainImage.style.display =
      "none";

    return;
  }

  elements.mainImage.style.display =
    "block";

  elements.mainImage.src =
    images[0];

  elements.mainImage.alt =
    variantDetail?.name ||
    product?.name ||
    "Proizvod";

  elements.thumbs.innerHTML =
    images
      .map(
        (image, index) => `
          <button
            class="thumb ${
              index === 0 ? "active" : ""
            }"
            type="button"
            data-image="${image}"
            aria-label="Prikaži sliku ${
              index + 1
            }"
          >
            <img
              src="${image}"
              alt=""
              loading="lazy"
            >
          </button>
        `
      )
      .join("");

  elements.thumbs
    .querySelectorAll(".thumb")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          elements.mainImage.src =
            button.dataset.image;

          elements.thumbs
            .querySelectorAll(".thumb")
            .forEach((item) =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );
        }
      );
    });
}

/*
==================================================
DETALJI JEDNE VARIJANTE
==================================================
*/

async function loadVariantDetail(variant) {
  if (!variant?.id) {
    showError(
      "Izabrana varijanta nema ispravan ID."
    );

    return;
  }

  selectedVariant = variant;

  const currentRequestNumber =
    ++variantRequestNumber;

  elements.variantCode.textContent =
    variant.code || "—";

  elements.price.textContent =
    "Učitavanje cene…";

  elements.stock.textContent =
    "Provera lagera…";

  elements.mainImage.style.opacity =
    "0.45";

  try {
    const url =
      `${API_BASE}/variant-detail` +
      `?id=${encodeURIComponent(
        variant.id
      )}`;

    const response =
      await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",

        headers: {
          Accept:
            "application/json",
        },
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data.success ||
      !data.variant
    ) {
      throw new Error(
        data.error ||
        "Detalji varijante nisu dostupni."
      );
    }

    /*
    Ako korisnik brzo klikne drugu veličinu,
    ignorišemo stariji odgovor.
    */

    if (
      currentRequestNumber !==
      variantRequestNumber
    ) {
      return;
    }

    loadedVariantDetail =
      data.variant;

    elements.variantCode.textContent =
      loadedVariantDetail.code ||
      variant.code ||
      "—";

    elements.price.textContent =
      formatPrice(
        loadedVariantDetail.price
      );

    elements.stock.textContent =
      formatStock(
        loadedVariantDetail.stock
      );

    renderGallery(
      loadedVariantDetail
    );

    hideMessage();
  } catch (error) {
    console.error(
      "Greška detalja varijante:",
      error
    );

    if (
      currentRequestNumber !==
      variantRequestNumber
    ) {
      return;
    }

    elements.price.textContent =
      "Cena nije dostupna";

    elements.stock.textContent =
      "Lager nije dostupan";

    showError(
      "Nije uspelo učitavanje slike, cene i lagera. Pokušaj ponovo izborom varijante."
    );
  } finally {
    if (
      currentRequestNumber ===
      variantRequestNumber
    ) {
      elements.mainImage.style.opacity =
        "1";
    }
  }
}

/*
==================================================
IZBOR VELIČINE
==================================================
*/

function selectVariant(variant) {
  if (!variant) {
    return;
  }

  selectedVariant = variant;

  const variants =
    selectedColor?.variants || [];

  elements.sizeOptions
    .querySelectorAll(
      ".size-button"
    )
    .forEach((button) => {
      const buttonVariant =
        variants[
          Number(
            button.dataset.index
          )
        ];

      button.classList.toggle(
        "active",
        buttonVariant?.id ===
          variant.id
      );
    });

  elements.selectedSizeLabel.textContent =
    variant.size
      ? `Izabrano: ${variant.size}`
      : "";

  loadVariantDetail(variant);
}

function renderSizes(variants) {
  const safeVariants =
    Array.isArray(variants)
      ? variants
      : [];

  const hasSizes =
    safeVariants.some(
      (variant) =>
        Boolean(variant.size)
    );

  elements.sizeBlock.classList.toggle(
    "hidden",
    !hasSizes
  );

  if (!hasSizes) {
    elements.sizeOptions.innerHTML =
      "";

    elements.selectedSizeLabel.textContent =
      "";

    selectVariant(
      safeVariants[0]
    );

    return;
  }

  elements.sizeOptions.innerHTML =
    safeVariants
      .map(
        (variant, index) => `
          <button
            class="size-button"
            type="button"
            data-index="${index}"
          >
            ${variant.size || "—"}
          </button>
        `
      )
      .join("");

  elements.sizeOptions
    .querySelectorAll(
      ".size-button"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.index
            );

          selectVariant(
            safeVariants[index]
          );
        }
      );
    });

  selectVariant(
    safeVariants[0]
  );
}

/*
==================================================
IZBOR BOJE
==================================================
*/

function selectColor(
  colorCode,
  updateUrl = true
) {
  const colors =
    product?.colors || [];

  selectedColor =
    colors.find(
      (color) =>
        String(
          color.colorCode ?? ""
        ) ===
        String(
          colorCode ?? ""
        )
    ) ||
    colors[0] ||
    null;

  if (!selectedColor) {
    showError(
      "Proizvod nema dostupne varijante."
    );

    return;
  }

  elements.colorOptions
    .querySelectorAll(
      ".color-button"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        String(
          button.dataset.color
        ) ===
          String(
            selectedColor.colorCode ??
              ""
          )
      );
    });

  elements.selectedShadeLabel.textContent =
    selectedColor.colorCode
      ? `Šifra boje: ${selectedColor.colorCode}`
      : "Bez posebne šifre boje";

  if (
    updateUrl &&
    selectedColor.colorCode
  ) {
    updateUrlShade(
      selectedColor.colorCode
    );
  }

  renderSizes(
    selectedColor.variants
  );
}

function renderColors(colors) {
  const safeColors =
    Array.isArray(colors)
      ? colors
      : [];

  elements.colorOptions.innerHTML =
    safeColors
      .map(
        (color) => `
          <button
            class="color-button"
            type="button"
            data-color="${
              color.colorCode ?? ""
            }"
            title="Boja ${
              color.colorCode ?? ""
            }"
          >
            <span>
              ${color.colorCode ?? "—"}
            </span>
          </button>
        `
      )
      .join("");

  elements.colorOptions
    .querySelectorAll(
      ".color-button"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          selectColor(
            button.dataset.color
          );
        }
      );
    });
}

/*
==================================================
UČITAVANJE MODELA
==================================================
*/

async function loadProduct() {
  if (!requestedModel) {
    showError(
      "Nedostaje model proizvoda u adresi."
    );

    return;
  }

  setLoadingState(
    "Učitavanje proizvoda…"
  );

  try {
    const url =
      `${API_BASE}/product-grouped` +
      `?model=${encodeURIComponent(
        requestedModel
      )}`;

    const response =
      await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",

        headers: {
          Accept:
            "application/json",
        },
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data.success ||
      !data.product
    ) {
      throw new Error(
        data.error ||
        "Proizvod nije pronađen."
      );
    }

    product =
      data.product;

    document.title =
      `${
        product.name ||
        product.modelCode
      } — DemoShop v2`;

    elements.breadcrumb.textContent =
      [
        product.category,
        product.subCategory,
      ]
        .filter(Boolean)
        .join(" / ");

    elements.name.textContent =
      product.name ||
      "Bez naziva";

    elements.model.textContent =
      product.modelCode ||
      requestedModel;

    renderColors(
      product.colors
    );

    elements.detail.classList.remove(
      "hidden"
    );

    hideMessage();

    const initialColor =
      product.colors?.find(
        (color) =>
          String(
            color.colorCode ?? ""
          ) ===
          String(
            requestedShade ?? ""
          )
      ) ||
      product.colors?.[0];

    if (initialColor) {
      selectColor(
        initialColor.colorCode,
        false
      );
    }
  } catch (error) {
    console.error(
      "Greška proizvoda:",
      error
    );

    showError(
      `Greška pri učitavanju proizvoda: ${error.message}`
    );
  }
}

/*
==================================================
DUGME ZA UPIT
==================================================
*/

elements.quoteButton.addEventListener(
  "click",
  () => {
    const lines = [
      "Upit za proizvod",
      "",
      `Model: ${
        product?.modelCode ||
        requestedModel ||
        "—"
      }`,
      `Naziv: ${
        product?.name || "—"
      }`,
      `Varijanta: ${
        loadedVariantDetail?.code ||
        selectedVariant?.code ||
        "—"
      }`,
      `Boja: ${
        selectedColor?.colorCode ||
        "—"
      }`,
      `Veličina: ${
        selectedVariant?.size ||
        "—"
      }`,
      `Cena: ${
        elements.price.textContent
      }`,
      `Lager: ${
        elements.stock.textContent
      }`,
      "",
      "Sledeće povezujemo sa pravom korpom i slanjem upita na email.",
    ];

    window.alert(
      lines.join("\n")
    );
  }
);

loadProduct();
