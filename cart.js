const QUOTE_EMAIL = "marko.demogroup@gmail.com";
const itemsElement = document.getElementById("cartItems");
const emptyElement = document.getElementById("emptyCart");
const summaryElement = document.getElementById("cartSummary");
const totalElement = document.getElementById("cartTotal");
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
  emptyElement.classList.toggle("hidden", items.length > 0);
  summaryElement.classList.toggle("hidden", items.length === 0);
  itemsElement.innerHTML = items.map((item, index) => `
    <article class="cart-item">
      <div class="cart-item-image">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : ""}</div>
      <div class="cart-item-info">
        <p>${escapeHtml(item.modelCode)}</p><h2>${escapeHtml(item.name)}</h2>
        <span>${escapeHtml(item.code)}${item.colorCode ? ` · boja ${escapeHtml(item.colorCode)}` : ""}${item.size ? ` · ${escapeHtml(item.size)}` : ""}</span>
      </div>
      <label class="cart-quantity">Količina<input type="number" min="1" value="${item.quantity}" data-quantity="${index}"></label>
      <div class="cart-item-price"><strong>${item.price === null ? "Na upit" : money(item.price * item.quantity)}</strong><small>${item.price === null ? "" : `${money(item.price)} / kom. bez PDV-a`}</small></div>
      <button class="remove-item" type="button" data-remove="${index}" aria-label="Ukloni proizvod">×</button>
    </article>`).join("");

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * Number(item.quantity || 0), 0);
  totalElement.textContent = money(total);
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

document.getElementById("sendQuote").addEventListener("click", () => {
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  if (!name || !email) {
    formMessage.textContent = "Unesite ime i email pre slanja upita.";
    formMessage.classList.add("form-error");
    return;
  }

  const items = window.DemoCart.read();
  const lines = [
    "Poštovani,", "", "Molim vas za ponudu za sledeće proizvode:", "",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `   Model: ${item.modelCode} | Šifra: ${item.code}`,
      `   Boja: ${item.colorCode || "—"} | Veličina: ${item.size || "—"}`,
      `   Količina: ${item.quantity} kom. | Cena/kom: ${item.price === null ? "na upit" : money(item.price)}`,
      "",
    ]),
    `Ime: ${name}`,
    `Firma: ${document.getElementById("customerCompany").value.trim() || "—"}`,
    `Email: ${email}`,
    `Telefon: ${document.getElementById("customerPhone").value.trim() || "—"}`,
    `Napomena: ${document.getElementById("customerNote").value.trim() || "—"}`,
    "", "Sve prikazane cene su bez PDV-a.",
  ];
  const subject = encodeURIComponent(`DemoShop upit — ${name}`);
  const body = encodeURIComponent(lines.join("\n"));
  window.location.href = `mailto:${QUOTE_EMAIL}?subject=${subject}&body=${body}`;
});

render();
