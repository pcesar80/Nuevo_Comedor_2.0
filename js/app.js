(() => {
  const app = window.CMA;
  const filterButtons = document.querySelectorAll("[data-filter]");
  const emptyState = app.$("#empty-state");

  app.initialize = () => {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        let visibleRows = 0;
        filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        document.querySelectorAll("#income-rows tr").forEach((row) => {
          const matches = filter === "all" || row.dataset.kind === filter;
          row.hidden = !matches;
          if (matches) visibleRows += 1;
        });
        emptyState.style.display = visibleRows ? "none" : "block";
      });
    });

    app.initializeFoods();
    app.initializeWeeklyMenu();
    app.initializePrinting();
    app.initializeMenu();
    app.initializeKiosk();
    app.initializeScanner();
  };

  app.initialize();
})();
