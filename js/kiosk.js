(() => {
  const app = window.CMA;
  const $ = app.$;
  const dialog = $("#kiosk-dialog");
  const grid = $("#product-grid");
  const categoryNav = $("#product-categories");
  const cartItems = $("#cart-items");
  const generateButton = $("#generate-ticket");

  function renderCategories() {
    const categories = ["Todas", ...new Set([...app.categories, ...app.products.map((product) => product.category)])];
    if (!categories.includes(app.activeCategory)) app.activeCategory = "Todas";
    categoryNav.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.className = "pos-category";
      button.type = "button";
      button.dataset.category = category;
      button.setAttribute("aria-pressed", String(category === app.activeCategory));
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = category === "Todas" ? "✳" : "☆";
      button.append(icon, document.createTextNode(category));
      categoryNav.append(button);
    });
  }

  function renderProducts() {
    const term = $("#product-search").value.trim().toLocaleLowerCase("es");
    const visibleProducts = app.products.filter((product) => {
      const categoryMatches = app.activeCategory === "Todas" || product.category === app.activeCategory;
      return categoryMatches && product.name.toLocaleLowerCase("es").includes(term);
    });
    grid.replaceChildren();
    if (!visibleProducts.length) {
      const empty = document.createElement("p");
      empty.className = "pos-no-results";
      empty.textContent = "No se encontraron productos.";
      grid.append(empty);
      return;
    }
    visibleProducts.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const button = document.createElement("button");
      button.className = "product-add";
      button.type = "button";
      button.dataset.productId = product.id;
      button.setAttribute("aria-label", `Agregar ${product.name}, ${app.formatPrice(product.price)}`);
      const art = document.createElement("span");
      art.className = `product-art ${product.style || ""}`;
      art.setAttribute("aria-hidden", "true");
      if (product.image) {
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = "";
        art.append(image);
      } else {
        art.textContent = product.art || "🍽️";
      }
      const info = document.createElement("span");
      info.className = "product-info";
      const name = document.createElement("span");
      name.className = "product-name";
      name.textContent = product.name;
      const price = document.createElement("span");
      price.className = "product-price";
      price.textContent = `IVA incluido ${app.formatPrice(product.price)}`;
      info.append(name, price);
      button.append(art, info);
      card.append(button);
      grid.append(card);
    });
  }

  function renderCart() {
    const items = [...app.cart.entries()].map(([id, quantity]) => ({ product: app.products.find((item) => item.id === id), quantity })).filter((item) => item.product);
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    cartItems.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "pos-empty";
      empty.innerHTML = "<span aria-hidden='true'>🛒</span><p>Sin productos</p>";
      cartItems.append(empty);
    }
    items.forEach(({ product, quantity }) => {
      const item = document.createElement("article");
      item.className = "cart-item";
      const description = document.createElement("div");
      const name = document.createElement("div");
      name.className = "cart-item-name";
      name.textContent = product.name;
      const price = document.createElement("div");
      price.className = "cart-item-price";
      price.textContent = `${app.formatPrice(product.price)} c/u`;
      description.append(name, price);
      const controls = document.createElement("div");
      controls.className = "quantity-control";
      controls.setAttribute("aria-label", `Cantidad de ${product.name}`);
      [["decrease", "−", `Quitar uno de ${product.name}`], ["increase", "+", `Agregar uno de ${product.name}`]].forEach(([action, text, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.cartAction = action;
        button.dataset.productId = product.id;
        button.setAttribute("aria-label", label);
        button.textContent = text;
        controls.append(button);
        if (action === "decrease") {
          const output = document.createElement("output");
          output.textContent = String(quantity);
          controls.append(output);
        }
      });
      item.append(description, controls);
      cartItems.append(item);
    });
    $("#cart-total").textContent = app.formatPrice(total);
    generateButton.disabled = total === 0;
  }

  function updateOrderHeader() {
    $("#pos-order-number").textContent = `# ${app.ticketSequence + 1}`;
    $("#pos-date").innerHTML = `${new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date())}<small>America/Buenos_Aires (GMT-3)</small>`;
  }

  function restoreTickets() {
    app.readArray("cmaKioskTickets").forEach((sale) => {
      if (/^VK\d{10}$/.test(sale.ticket)) app.addKioskIncomeRow(sale);
    });
  }

  function createTicket() {
    if (!app.cart.size) return;
    const items = [...app.cart.entries()].map(([id, quantity]) => {
      const product = app.products.find((item) => item.id === id);
      return product ? { name: product.name, price: product.price, quantity } : null;
    }).filter(Boolean);
    if (!items.length) return;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const nextSequence = app.ticketSequence + 1;
    const sale = {
      ticket: `VK${String(nextSequence).padStart(10, "0")}`,
      createdAt: new Date().toISOString(),
      payment: $("#payment-method").value,
      name: "Venta Kiosco",
      items,
      total
    };
    const savedTickets = [...app.readArray("cmaKioskTickets"), sale];
    try {
      localStorage.setItem("cmaKioskTickets", JSON.stringify(savedTickets));
      localStorage.setItem("cmaKioskTicketSequence", String(nextSequence));
    } catch {
      $("#ticket-status").textContent = "No se pudo guardar el ticket en este navegador.";
      return;
    }
    app.ticketSequence = nextSequence;
    app.addKioskIncomeRow(sale);
    app.cart.clear();
    renderCart();
    dialog.close();
    app.setAllIncomeRowsVisible();
    $("#ticket-status").textContent = `Venta registrada con el ticket ${sale.ticket}.`;
    app.openPrintPreview(sale, "Kiosco");
  }

  app.renderCategories = renderCategories;
  app.renderProducts = renderProducts;
  app.renderCart = renderCart;
  app.initializeKiosk = () => {
    restoreTickets();
    renderCategories();
    renderProducts();
    renderCart();
    $("#open-kiosk").addEventListener("click", () => {
      app.cart.clear();
      renderCart();
      $("#pos-customer-name").textContent = "Venta Kiosco";
      updateOrderHeader();
      dialog.showModal();
    });
    $(".kiosk-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    categoryNav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      app.activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
    $("#product-search").addEventListener("input", renderProducts);
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-product-id]");
      if (!button) return;
      app.cart.set(button.dataset.productId, (app.cart.get(button.dataset.productId) || 0) + 1);
      renderCart();
    });
    cartItems.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cart-action]");
      if (!button) return;
      const quantity = app.cart.get(button.dataset.productId) + (button.dataset.cartAction === "increase" ? 1 : -1);
      if (quantity > 0) app.cart.set(button.dataset.productId, quantity);
      else app.cart.delete(button.dataset.productId);
      renderCart();
    });
    $("#clear-cart").addEventListener("click", () => { app.cart.clear(); renderCart(); });
    generateButton.addEventListener("click", createTicket);
  };
})();
