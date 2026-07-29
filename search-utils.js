(function (global) {
  const MAX_VARIANTS = 6;

  function normalizeSearchText(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase("sr-Latn")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "dj")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function replacementPositions(value) {
    const positions = [];

    for (let index = 0; index < value.length; index += 1) {
      const pair = value.slice(index, index + 2);
      if (pair === "dj") {
        positions.push({ start: index, length: 2, replacements: ["đ"] });
        index += 1;
        continue;
      }

      const character = value[index];
      if (character === "s") positions.push({ start: index, length: 1, replacements: ["š"] });
      else if (character === "c") positions.push({ start: index, length: 1, replacements: ["č", "ć"] });
      else if (character === "z") positions.push({ start: index, length: 1, replacements: ["ž"] });
    }

    return positions;
  }

  function applyReplacements(value, changes) {
    let result = value;
    [...changes]
      .sort((left, right) => right.position.start - left.position.start)
      .forEach(({ position, replacement }) => {
        result = `${result.slice(0, position.start)}${replacement}${result.slice(position.start + position.length)}`;
      });
    return result;
  }

  function searchVariants(value, maximum = MAX_VARIANTS) {
    const original = String(value ?? "").trim();
    if (!original) return [];

    const lowercase = original.toLocaleLowerCase("sr-Latn");
    const ascii = normalizeSearchText(lowercase);
    const roots = [...new Set([lowercase, ascii].filter(Boolean))];
    const variants = [];
    const seen = new Set();

    const addVariant = candidate => {
      const cleaned = String(candidate || "").trim();
      if (!cleaned || seen.has(cleaned) || variants.length >= maximum) return;
      seen.add(cleaned);
      variants.push(cleaned);
    };

    addVariant(original);
    roots.forEach(addVariant);

    for (const root of roots) {
      const positions = replacementPositions(root);

      for (const position of positions) {
        for (const replacement of position.replacements) {
          addVariant(applyReplacements(root, [{ position, replacement }]));
        }
      }

      for (let first = 0; first < positions.length; first += 1) {
        for (let second = first + 1; second < positions.length; second += 1) {
          for (const firstReplacement of positions[first].replacements) {
            for (const secondReplacement of positions[second].replacements) {
              addVariant(applyReplacements(root, [
                { position: positions[first], replacement: firstReplacement },
                { position: positions[second], replacement: secondReplacement },
              ]));
            }
          }
        }
      }
    }

    return variants;
  }

  function productKey(product) {
    return String(
      product?.modelCode
      || product?.representativeVariantId
      || product?.representativeCode
      || product?.id
      || JSON.stringify(product),
    );
  }

  function normalizedProductText(product) {
    const values = [];
    const visit = item => {
      if (typeof item === "string" || typeof item === "number") values.push(String(item));
      else if (Array.isArray(item)) item.forEach(visit);
      else if (item && typeof item === "object") Object.values(item).forEach(visit);
    };
    visit(product);
    return normalizeSearchText(values.join(" "));
  }

  function productSearchScore(product, normalizedQuery) {
    const name = normalizeSearchText(product?.name || "");
    const model = normalizeSearchText(product?.modelCode || product?.representativeCode || "");
    if (name === normalizedQuery || model === normalizedQuery) return 4;
    if (name.startsWith(`${normalizedQuery} `) || name.startsWith(normalizedQuery)) return 3;
    if (name.includes(normalizedQuery) || model.includes(normalizedQuery)) return 2;
    return normalizedProductText(product).includes(normalizedQuery) ? 1 : 0;
  }

  function mergePayloads(payloads, query, requestedPage) {
    const products = [];
    const seen = new Set();
    const normalizedQuery = normalizeSearchText(query);

    payloads.forEach(payload => {
      (Array.isArray(payload?.products) ? payload.products : []).forEach(product => {
        const key = productKey(product);
        if (seen.has(key)) return;
        seen.add(key);
        products.push(product);
      });
    });

    products.sort((left, right) => {
      return productSearchScore(right, normalizedQuery) - productSearchScore(left, normalizedQuery);
    });

    const bestPayload = [...payloads].sort((left, right) => {
      return (right?.products?.length || 0) - (left?.products?.length || 0);
    })[0] || {};
    const numericValues = key => payloads.map(payload => Number(payload?.[key] || 0));

    return {
      ...bestPayload,
      success: true,
      page: Number(requestedPage || bestPayload.page || 1),
      totalPages: Math.max(1, ...numericValues("totalPages")),
      totalGroupedCards: Math.max(products.length, ...numericValues("totalGroupedCards")),
      totalMatchingProducts: Math.max(products.length, ...numericValues("totalMatchingProducts")),
      hasPreviousPage: Number(requestedPage || 1) > 1,
      hasNextPage: payloads.some(payload => Boolean(payload?.hasNextPage)),
      products,
    };
  }

  async function readPayload(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.success === false) throw new Error(data.error || "Pretraga trenutno nije dostupna.");
    return data;
  }

  async function fetchGroupedProducts(apiBase, params, options = {}) {
    const baseParams = new URLSearchParams(params);
    const query = baseParams.get("search")?.trim() || "";
    const baseUrl = `${apiBase}/products-grouped?${baseParams}`;
    const originalPayload = await readPayload(baseUrl, options);

    if (!query) return originalPayload;

    const variants = searchVariants(query).filter(variant => variant !== query && variant !== query.toLocaleLowerCase("sr-Latn"));
    if (!variants.length) return originalPayload;

    const attempts = await Promise.allSettled(variants.map(variant => {
      const variantParams = new URLSearchParams(baseParams);
      variantParams.set("search", variant);
      return readPayload(`${apiBase}/products-grouped?${variantParams}`, options);
    }));
    const successfulPayloads = attempts
      .filter(result => result.status === "fulfilled")
      .map(result => result.value);

    if (!successfulPayloads.length) return originalPayload;
    return mergePayloads(
      [originalPayload, ...successfulPayloads],
      query,
      baseParams.get("page"),
    );
  }

  global.DemoShopSearch = {
    normalizeSearchText,
    searchVariants,
    fetchGroupedProducts,
  };
})(window);
