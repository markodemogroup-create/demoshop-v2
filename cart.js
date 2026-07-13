const API_BASE = "https://demo-group-api.marko-demogroup.workers.dev";
const itemsElement = document.getElementById("cartItems");
const emptyElement = document.getElementById("emptyCart");
const summaryElement = document.getElementById("cartSummary");
const totalElement = document.getElementById("cartTotal");
const totalLabelElement = document.getElementById("cartTotalLabel");
const formMessage = document.getElementById("formMessage");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;",
  })[character]);
}

function money(value) {
  return `${Number(value || 0).toLocaleString("sr-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function render() {
  const items = window.DemoCart.read();
  const displayItems = items.map(item => {
    const price = Number(item.price);
    return {
      ...item,
      price: Number.isFinite(price) && price > 0 ? price : null,
    };
  });
  emptyElement.classList.toggle("hidden", items.length > 0);
  summaryElement.classList.toggle("hidden", items.length === 0);
  itemsElement.innerHTML = displayItems.map((item, index) => `
    <article class="cart-item">
      <div class="cart-item-image">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : ""}</div>
      <div class="cart-item-info">
        <p>${escapeHtml(item.modelCode)}</p><h2>${escapeHtml(item.name)}</h2>
        <span>${escapeHtml(item.code)}${item.colorCode ? ` · boja ${escapeHtml(item.colorCode)}` : ""}${item.size ? ` · ${escapeHtml(item.size)}` : ""}</span>
      </div>
      <label class="cart-quantity">Količina<input type="number" min="1" value="${item.quantity}" data-quantity="${index}"></label>
      <div class="cart-item-price"><strong>${item.price === null ? "Cena na upit" : money(item.price * item.quantity)}</strong><small>${item.price === null ? "Ponuda se formira nakon provere" : `${money(item.price)} / kom. bez PDV-a`}</small></div>
      <button class="remove-item" type="button" data-remove="${index}" aria-label="Ukloni proizvod">×</button>
    </article>`).join("");

  const pricedItems = displayItems.filter(item => item.price !== null);
  const hasPriceOnRequest = pricedItems.length !== displayItems.length;
  const total = pricedItems.reduce(
    (sum, item) => sum + item.price * Number(item.quantity || 0),
    0
  );

  if (hasPriceOnRequest && pricedItems.length === 0) {
    totalLabelElement.textContent = "Ukupna cena";
    totalElement.textContent = "Cena na upit";
  } else if (hasPriceOnRequest) {
    totalLabelElement.textContent = "Poznati iznos bez PDV-a";
    totalElement.textContent = `${money(total)} + cena na upit`;
  } else {
    totalLabelElement.textContent = "Procena bez PDV-a";
    totalElement.textContent = money(total);
  }
}

itemsElement.addEventListener("change", event => {
  const input = event.target.closest("[data-quantity]");
  if (!input) return;
  const items = window.DemoCart.read();
  items[Number(input.dataset.quantity)].quantity = Math.max(1, Number.parseInt(input.value || "1", 10));
  window.DemoCart.write(items);
  render();
});

itemsElement.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  const items = window.DemoCart.read();
  items.splice(Number(button.dataset.remove), 1);
  window.DemoCart.write(items);
  render();
});

document.getElementById("sendQuote").addEventListener("click", async () => {
  const sendButton = document.getElementById("sendQuote");
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  if (!name || !email) {
    formMessage.textContent = "Unesite ime i email pre slanja upita.";
    formMessage.classList.add("form-error");
    return;
  }

  const items = window.DemoCart.read();
  sendButton.disabled = true;
  sendButton.textContent = "Slanje…";
  formMessage.classList.remove("form-error", "form-success");
  formMessage.textContent = "Šaljemo upit…";

  try {
    const response = await fetch(`${API_BASE}/send-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        website: document.getElementById("website").value,
        customer: {
          name,
          company: document.getElementById("customerCompany").value.trim(),
          email,
          phone: document.getElementById("customerPhone").value.trim(),
          note: document.getElementById("customerNote").value.trim(),
        },
        items,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || "Upit nije poslat.");

    window.DemoCart.write([]);
    render();
    const quoteReference = data.quoteReference || "";
    formMessage.textContent = quoteReference
      ? `Upit ${quoteReference} je uspešno poslat na Demo Group email.`
      : "Upit je uspešno poslat na Demo Group email.";
    formMessage.classList.add("form-success");
    sendButton.textContent = "Upit je poslat ✓";
  } catch (error) {
    formMessage.textContent = `Slanje nije uspelo: ${error.message}`;
    formMessage.classList.add("form-error");
    sendButton.disabled = false;
    sendButton.textContent = "Pokušaj ponovo";
  }
});

render();
