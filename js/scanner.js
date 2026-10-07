(() => {
  const app = window.CMA;
  const $ = app.$;
  const dialog = $("#scan-dialog");
  const form = $("#scan-ticket-form");
  const input = $("#scan-ticket-input");
  const feedback = $("#scan-feedback");
  const list = $("#scanned-tickets-list");

  function scanDate(dateText, timeText) {
    const [day, month, year] = dateText.split(/[-/]/).map(Number);
    const [hour, minute] = timeText.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }

  function getScans() {
    const saved = new Map(app.readArray("cmaScannedTickets").map((scan) => [scan.ticket, scan]));
    return [...document.querySelectorAll("#income-rows tr")]
      .filter((row) => row.cells[3].textContent.trim() === "SI" && ["menu", "kiosco"].includes(row.dataset.kind))
      .map((row) => {
        const ticket = row.cells[1].textContent.trim();
        return saved.get(ticket) || {
          ticket,
          name: row.cells[0].title || row.cells[0].textContent.trim(),
          kind: row.dataset.kind,
          scannedAt: scanDate(row.cells[6].textContent.trim() === "-" ? row.cells[4].textContent.trim() : row.cells[6].textContent.trim(), row.cells[7].textContent.trim() === "-" ? row.cells[5].textContent.trim() : row.cells[7].textContent.trim()).toISOString()
        };
      })
      .sort((first, second) => new Date(second.scannedAt) - new Date(first.scannedAt));
  }

  function render() {
    const scans = getScans();
    $("#scanned-menu-count").textContent = String(scans.filter((scan) => scan.kind === "menu").length);
    $("#scanned-kiosk-count").textContent = String(scans.filter((scan) => scan.kind === "kiosco").length);
    const latest = scans[0];
    $("#last-scan-empty").hidden = Boolean(latest);
    ["#last-scan-name", "#last-scan-menu-type", "#last-scan-type", "#last-scan-number"].forEach((selector) => { $(selector).hidden = !latest; });
    if (latest) {
      $("#last-scan-name").textContent = latest.name;
      $("#last-scan-menu-type").textContent = "-";
      $("#last-scan-type").textContent = latest.kind === "kiosco" ? "Kiosco" : "Menú";
      $("#last-scan-number").textContent = latest.ticket;
    }
    $("#scanned-tickets-empty").hidden = scans.length > 0;
    list.replaceChildren();
    scans.forEach((scan) => [scan.name, "-", scan.kind === "kiosco" ? "Kiosco" : "Menú", scan.ticket].forEach((value) => {
      const cell = document.createElement("div");
      cell.className = "scan-grid-row";
      cell.textContent = value;
      list.append(cell);
    }));
  }

  function restoreScans() {
    app.readArray("cmaScannedTickets").forEach((scan) => {
      const row = app.findIncomeRow(scan.ticket);
      if (!row || !["menu", "kiosco"].includes(row.dataset.kind)) return;
      const { dateText, timeText } = app.formatDateTime(new Date(scan.scannedAt));
      row.cells[3].textContent = "SI";
      row.cells[6].textContent = dateText.replaceAll("/", "-");
      row.cells[7].textContent = timeText;
    });
  }

  function scanTicket(ticket) {
    const row = app.findIncomeRow(ticket);
    if (!row) {
      feedback.textContent = "No se encontró ese número de ticket en Ingresos.";
      feedback.className = "scan-feedback error";
      return;
    }
    if (!["menu", "kiosco"].includes(row.dataset.kind)) {
      feedback.textContent = "Este tipo de ticket no se puede escanear desde esta pantalla.";
      feedback.className = "scan-feedback error";
      return;
    }
    if (row.cells[3].textContent.trim() === "SI") {
      feedback.textContent = "Este ticket ya fue escaneado.";
      feedback.className = "scan-feedback error";
      render();
      return;
    }
    const scannedAt = new Date();
    const { dateText, timeText } = app.formatDateTime(scannedAt);
    row.cells[3].textContent = "SI";
    row.cells[6].textContent = dateText.replaceAll("/", "-");
    row.cells[7].textContent = timeText;
    const scan = { ticket, name: row.cells[0].title || row.cells[0].textContent.trim(), kind: row.dataset.kind, scannedAt: scannedAt.toISOString() };
    try {
      localStorage.setItem("cmaScannedTickets", JSON.stringify([...app.readArray("cmaScannedTickets"), scan]));
    } catch {
      feedback.textContent = "No se pudo guardar el estado del escaneo en este navegador.";
      feedback.className = "scan-feedback error";
      return;
    }
    feedback.textContent = `Ticket ${ticket} escaneado correctamente.`;
    feedback.className = "scan-feedback success";
    input.value = "";
    render();
    input.focus();
  }

  app.initializeScanner = () => {
    restoreScans();
    render();
    $("#open-scan-screen").addEventListener("click", () => {
      feedback.textContent = "";
      feedback.className = "scan-feedback";
      render();
      dialog.showModal();
      input.focus();
    });
    $("#close-scan-dialog").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", (event) => { event.preventDefault(); scanTicket(input.value.trim()); });
  };
})();
