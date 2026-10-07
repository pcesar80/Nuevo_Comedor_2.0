(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const defaultProducts = [
    { id: "tea", name: "Té", price: 1500, category: "Infusiones", art: "🍵", style: "tea" },
    { id: "mate", name: "Mate cocido", price: 1500, category: "Infusiones", art: "🧉", style: "tea" },
    { id: "chocolate", name: "Chocolatada", price: 1500, category: "Bebidas", art: "🥤", style: "drink" },
    { id: "coffee", name: "Café", price: 1500, category: "Infusiones", art: "☕", style: "coffee" },
    { id: "latte", name: "Café con leche", price: 1500, category: "Lácteos", art: "☕", style: "coffee" },
    { id: "water-still", name: "Agua sin gas", price: 2000, category: "Bebidas", art: "💧", style: "drink" },
    { id: "water-sparkling", name: "Agua con gas", price: 2000, category: "Bebidas", art: "🫧", style: "drink" },
    { id: "cola-can", name: "Coca-Cola lata", price: 2000, category: "Bebidas", art: "🥤", style: "drink" },
    { id: "cola-bottle", name: "Coca-Cola 1 L", price: 4000, category: "Bebidas", art: "🥤", style: "drink" },
    { id: "apple-juice", name: "Jugo de manzana", price: 1200, category: "Bebidas", art: "🧃", style: "fruit" },
    { id: "ham-sandwich", name: "Sándwich de jamón y queso", price: 3500, category: "Comidas Rápidas", art: "🥪", style: "tea" },
    { id: "cheese-toast", name: "Tostado de queso", price: 3200, category: "Comidas Rápidas", art: "🥪", style: "tea" },
    { id: "apple", name: "Manzana", price: 1000, category: "Frutas", art: "🍎", style: "fruit" },
    { id: "fruit-salad", name: "Ensalada de frutas", price: 2800, category: "Frutas", art: "🍓", style: "fruit" },
    { id: "yogurt", name: "Yogur descremado", price: 2200, category: "Lácteos", art: "🥛", style: "dairy" },
    { id: "gluten-free-cookie", name: "Galletas sin gluten", price: 1800, category: "Libre de Gluten", art: "🍪", style: "dairy" }
  ];
  const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
  let products = defaultProducts;

  try {
    const savedProducts = JSON.parse(localStorage.getItem("cmaFoodCatalog") || "null");
    if (Array.isArray(savedProducts)) products = savedProducts;
  } catch {
    localStorage.removeItem("cmaFoodCatalog");
  }

  const app = {
    $,
    products,
    cart: new Map(),
    categories: ["Bebidas", "Comidas Rápidas", "Frutas", "Infusiones", "Lácteos", "Libre de Gluten"],
    activeCategory: "Todas",
    ticketSequence: Number(localStorage.getItem("cmaKioskTicketSequence") || 0),
    menuTicketSequence: Number(localStorage.getItem("cmaMenuTicketSequence") || 0),
    comensales: [{ id: "2783", name: "Cesar Peña", department: "Empleado CMA Retiro" }],
    formatPrice: (amount) => currency.format(amount),
    formatDateTime(date) {
      return {
        dateText: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date),
        timeText: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
      };
    },
    readArray(key) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
      } catch {
        localStorage.removeItem(key);
        return [];
      }
    },
    saveFoodCatalog(catalog = app.products) {
      localStorage.setItem("cmaFoodCatalog", JSON.stringify(catalog));
    },
    setAllIncomeRowsVisible() {
      document.querySelectorAll("#income-rows tr").forEach((row) => { row.hidden = false; });
      $("#empty-state").style.display = "none";
    },
    findIncomeRow(ticket) {
      return [...document.querySelectorAll("#income-rows tr")].find((row) => row.cells[1].textContent.trim() === ticket);
    },
    createIncomeRow({ kind, name, ticket, type, date, scanned = false, scanDate = "-", scanTime = "-", payment }) {
      const { dateText, timeText } = app.formatDateTime(date);
      const row = document.createElement("tr");
      row.dataset.kind = kind;
      if (payment) row.dataset.payment = payment;
      const values = [name, ticket, type, scanned ? "SI" : "NO", dateText.replaceAll("/", "-"), timeText, scanDate, scanTime, ""];
      values.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 0) cell.title = name;
        if (index === 1) {
          cell.classList.add("ticket-cell");
          cell.title = ticket;
        }
        row.append(cell);
      });
      if (payment) row.cells[1].title = `${ticket} · Medio de pago: ${payment}`;
      $("#income-rows").prepend(row);
      $("#empty-state").style.display = "none";
      return row;
    },
    addMenuIncomeRow(sale) {
      return app.createIncomeRow({ kind: "menu", name: sale.comensalName.toLocaleUpperCase("es"), ticket: sale.ticket, type: "Menú", date: new Date(sale.createdAt) });
    },
    addKioskIncomeRow(sale) {
      return app.createIncomeRow({ kind: "kiosco", name: sale.name || "Venta Kiosco", ticket: sale.ticket, type: "Kiosco", date: new Date(sale.createdAt), payment: sale.payment });
    }
  };

  window.CMA = app;
})();
