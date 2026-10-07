(() => {
  const app = window.CMA;
  const $ = app.$;
  const printDialog = $("#print-dialog");

  app.openPrintPreview = (sale, ticketType = "Menú") => {
    const personId = sale.comensalId || sale.employeeId;
    $("#receipt-legajo").textContent = personId || "";
    $("#receipt-person-meta").hidden = !personId;
    $("#receipt-name").textContent = sale.comensalName || sale.name || sale.employeeName || "";
    $("#receipt-department").textContent = sale.department || "";
    $("#receipt-ticket").textContent = sale.ticket;
    $("#receipt-type").textContent = ticketType;

    const receiptLines = $("#receipt-lines");
    receiptLines.replaceChildren();
    (sale.items || []).forEach((item) => {
      const line = document.createElement("p");
      const description = document.createElement("span");
      description.textContent = `${item.quantity} × ${item.name}`;
      const price = document.createElement("strong");
      price.textContent = app.formatPrice(item.quantity * item.price);
      line.append(description, price);
      receiptLines.append(line);
    });

    const receiptTotal = $("#receipt-total");
    receiptTotal.hidden = sale.total === undefined;
    receiptTotal.textContent = sale.total === undefined ? "" : `Total ${app.formatPrice(sale.total)}`;
    $("#receipt-date").textContent = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(sale.createdAt));
    printDialog.showModal();
  };

  app.initializePrinting = () => {
    $("#cancel-print").addEventListener("click", () => printDialog.close());
    $("#print-ticket").addEventListener("click", () => window.print());
  };
})();
