(() => {
  const app = window.CMA;
  const $ = app.$;
  const dialog = $("#menu-dialog");
  const search = $("#comensal-search");
  const results = $("#comensal-results");
  const generateButton = $("#create-menu-ticket");

  function renderTickets() {
    const today = new Date().toDateString();
    const tickets = app.readArray("cmaMenuTickets").filter((sale) => new Date(sale.createdAt).toDateString() === today);
    const list = $("#menu-tickets-list");
    list.replaceChildren();
    if (!tickets.length) {
      const empty = document.createElement("p");
      empty.className = "day-tickets-empty";
      empty.textContent = "No hay tickets emitidos recientemente.";
      list.append(empty);
      return;
    }
    tickets.forEach((sale) => {
      const entry = document.createElement("div");
      entry.className = "day-ticket-entry";
      const person = document.createElement("span");
      person.textContent = `${sale.comensalId} · ${sale.comensalName}`;
      const ticket = document.createElement("strong");
      ticket.textContent = sale.ticket;
      entry.append(person, ticket);
      list.append(entry);
    });
  }

  function renderResults() {
    const term = search.value.trim().toLocaleLowerCase("es");
    const matches = term ? app.comensales.filter((person) => `${person.id} ${person.name}`.toLocaleLowerCase("es").includes(term)) : [];
    results.replaceChildren();
    matches.forEach((person) => {
      const option = document.createElement("button");
      option.className = "comensal-option";
      option.type = "button";
      option.setAttribute("role", "option");
      option.dataset.comensalId = person.id;
      [person.id, person.name, person.department].forEach((value) => {
        const span = document.createElement("span");
        span.textContent = value;
        option.append(span);
      });
      results.append(option);
    });
    if (term && !matches.length) {
      const empty = document.createElement("div");
      empty.className = "comensal-option";
      empty.setAttribute("role", "option");
      empty.setAttribute("aria-disabled", "true");
      empty.textContent = "No se encontraron comensales.";
      results.append(empty);
    }
    results.setAttribute("aria-expanded", String(Boolean(term)));
  }

  function selectPerson(personId) {
    app.selectedComensal = app.comensales.find((person) => person.id === personId) || null;
    if (!app.selectedComensal) return;
    search.value = `${app.selectedComensal.id} · ${app.selectedComensal.name}`;
    results.setAttribute("aria-expanded", "false");
    $("#selected-comensal").textContent = app.selectedComensal.department;
    $("#selected-comensal").hidden = false;
    generateButton.disabled = false;
  }

  function restoreTickets() {
    app.readArray("cmaMenuTickets").forEach((sale) => {
      if (/^260000\d{6}$/.test(sale.ticket)) app.addMenuIncomeRow(sale);
    });
  }

  function createTicket() {
    if (!app.selectedComensal) return;
    const nextSequence = app.menuTicketSequence + 1;
    const sale = {
      ticket: `260000${String(nextSequence).padStart(6, "0")}`,
      comensalId: app.selectedComensal.id,
      comensalName: app.selectedComensal.name,
      department: app.selectedComensal.department,
      createdAt: new Date().toISOString()
    };
    const tickets = [...app.readArray("cmaMenuTickets"), sale];
    try {
      localStorage.setItem("cmaMenuTickets", JSON.stringify(tickets));
      localStorage.setItem("cmaMenuTicketSequence", String(nextSequence));
    } catch {
      $("#ticket-status").textContent = "No se pudo guardar el ticket en este navegador.";
      return;
    }
    app.menuTicketSequence = nextSequence;
    app.addMenuIncomeRow(sale);
    renderTickets();
    dialog.close();
    app.setAllIncomeRowsVisible();
    $("#ticket-status").textContent = `Ticket de Menú ${sale.ticket} generado para ${sale.comensalName}.`;
    app.openPrintPreview(sale);
  }

  app.initializeMenu = () => {
    restoreTickets();
    $("#open-menu-ticket").addEventListener("click", () => {
      app.selectedComensal = null;
      search.value = "";
      $("#selected-comensal").hidden = true;
      generateButton.disabled = true;
      renderResults();
      renderTickets();
      dialog.showModal();
      search.focus();
    });
    $("#close-menu-dialog").addEventListener("click", () => dialog.close());
    search.addEventListener("input", () => {
      app.selectedComensal = null;
      generateButton.disabled = true;
      $("#selected-comensal").hidden = true;
      renderResults();
    });
    results.addEventListener("click", (event) => {
      const option = event.target.closest("[data-comensal-id]");
      if (option) selectPerson(option.dataset.comensalId);
    });
    generateButton.addEventListener("click", createTicket);
  };
})();
