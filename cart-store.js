(function () {
  const KEY = "demoshop_quote_cart_v1";

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateBadges();
  }

  function updateBadges() {
    const total = read().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach(element => {
      element.textContent = String(total);
      element.classList.toggle("has-items", total > 0);
    });
  }

  function add(item) {
    const items = read();
    const existing = items.find(entry => entry.id === item.id);
    if (existing) existing.quantity += item.quantity;
    else items.push(item);
    write(items);
  }

  window.DemoCart = { read, write, add, updateBadges };
  updateBadges();
})();
