(() => {
  const app = window.CMA;
  const $ = app.$;
  const weeklyDialog = $("#weekly-dialog");
  const dayDialog = $("#weekly-day-dialog");
  const grid = $("#weekly-grid");
  const groups = [
    { id: "main", label: "Plato principal", icon: "🍽️" },
    { id: "celiac", label: "Menú celíaco", icon: "🌾" },
    { id: "dessert", label: "Postre", icon: "🍰" }
  ];
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  let weekStart = startOfWeek(new Date());
  let selectedDateKey = null;
  let isEditing = false;
  let draft = null;
  let weeklyData = {};

  function startOfWeek(date) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayIndex);
    return monday;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
  }

  function readWeeklyData() {
    try {
      const stored = JSON.parse(localStorage.getItem("cmaWeeklyMenus") || "{}");
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
      let migrated = false;
      Object.values(stored).forEach((day) => {
        if (!day.items || typeof day.items !== "object") {
          day.items = {};
          migrated = true;
        }
        if (Object.hasOwn(day.items, "side")) {
          delete day.items.side;
          migrated = true;
        }
        groups.forEach((group) => {
          const value = day.items[group.id];
          const option = Array.isArray(value) ? value.slice(0, 1) : value ? [value] : [];
          if (!Array.isArray(value) || value.length > 1) migrated = true;
          day.items[group.id] = option;
        });
      });
      if (migrated) {
        try {
          localStorage.setItem("cmaWeeklyMenus", JSON.stringify(stored));
        } catch {
          return stored;
        }
      }
      return stored;
    } catch {
      localStorage.removeItem("cmaWeeklyMenus");
      return {};
    }
  }

  function dayMenu(key) {
    return weeklyData[key] || { menuType: "Del día", location: "Retiro", items: { main: [], celiac: [], dessert: [] } };
  }

  function addGridCell(className, text, parent = grid) {
    const cell = document.createElement("div");
    cell.className = className;
    cell.setAttribute("role", "cell");
    cell.textContent = text;
    parent.append(cell);
    return cell;
  }

  function renderGrid() {
    grid.replaceChildren();
    const corner = document.createElement("div");
    corner.className = "weekly-cell weekly-row-label";
    corner.setAttribute("role", "columnheader");
    corner.textContent = "🍽️";
    grid.append(corner);
    const weekDates = dayNames.map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });

    weekDates.forEach((date, index) => {
      const button = document.createElement("button");
      button.className = "weekly-cell weekly-day-button";
      button.type = "button";
      button.dataset.day = dateKey(date);
      button.setAttribute("role", "columnheader");
      const dayName = document.createElement("span");
      dayName.className = "weekly-day-name";
      dayName.textContent = dayNames[index];
      const dayDate = document.createElement("span");
      dayDate.className = "weekly-day-date";
      dayDate.textContent = formatShortDate(date);
      button.append(dayName, dayDate);
      grid.append(button);
    });

    groups.forEach((group) => {
      const label = document.createElement("div");
      label.className = `weekly-cell weekly-row-label${group.id === "celiac" ? " celiac-row" : ""}`;
      label.setAttribute("role", "rowheader");
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = group.icon;
      const text = document.createElement("span");
      text.textContent = group.label;
      label.append(icon, text);
      grid.append(label);

      weekDates.forEach((date) => {
        const key = dateKey(date);
        const cell = document.createElement("div");
        cell.className = `weekly-cell${group.id === "celiac" ? " celiac-row" : ""}`;
        cell.setAttribute("role", "cell");
        const button = document.createElement("button");
        button.className = "weekly-item-button";
        button.type = "button";
        button.dataset.day = key;
        button.setAttribute("aria-label", `Editar menú ${group.label} del ${key}`);
        const items = dayMenu(key).items[group.id] || [];
        if (!items.length) {
          const empty = document.createElement("span");
          empty.className = "weekly-empty-item";
          empty.textContent = "—";
          button.append(empty);
        } else {
          items.forEach((item) => {
            const itemLabel = document.createElement("span");
            itemLabel.textContent = item;
            button.append(itemLabel);
          });
        }
        cell.append(button);
        grid.append(cell);
      });
    });

    const lastDate = new Date(weekStart);
    lastDate.setDate(lastDate.getDate() + 6);
    $("#weekly-date-range").textContent = `${formatShortDate(weekStart)} – ${formatShortDate(lastDate)}`;
  }

  function renderDay() {
    const day = isEditing ? draft : dayMenu(selectedDateKey);
    $("#weekly-menu-type").textContent = day.menuType || "Del día";
    $("#weekly-location").textContent = day.location || "Retiro";
    const container = $("#weekly-groups");
    container.replaceChildren();

    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "weekly-detail-group";
      const heading = document.createElement("h4");
      heading.textContent = `${group.label}:`;
      section.append(heading);
      const itemsContainer = document.createElement("div");
      itemsContainer.className = "weekly-detail-items";
      (day.items[group.id] || []).slice(0, 1).forEach((item, index) => {
        if (isEditing) {
          const editor = document.createElement("div");
          editor.className = "weekly-editing-item";
          const input = document.createElement("input");
          input.type = "text";
          input.maxLength = 100;
          input.value = item;
          input.setAttribute("aria-label", `${group.label}, elemento ${index + 1}`);
          input.addEventListener("input", () => { draft.items[group.id][index] = input.value; });
          const remove = document.createElement("button");
          remove.className = "weekly-remove-item";
          remove.type = "button";
          remove.setAttribute("aria-label", `Eliminar ${group.label.toLocaleLowerCase()}`);
          remove.textContent = "×";
          remove.addEventListener("click", () => {
            draft.items[group.id].splice(index, 1);
            renderDay();
          });
          editor.append(input, remove);
          itemsContainer.append(editor);
        } else {
          const chip = document.createElement("span");
          chip.className = "weekly-detail-item";
          chip.textContent = item;
          itemsContainer.append(chip);
        }
      });
      if (!isEditing && !day.items[group.id]?.length) {
        const empty = document.createElement("span");
        empty.className = "weekly-detail-item weekly-empty-item";
        empty.textContent = "Sin cargar";
        itemsContainer.append(empty);
      }
      section.append(itemsContainer);
      if (isEditing && !(day.items[group.id] || []).length) {
        const addButton = document.createElement("button");
        addButton.className = "weekly-add-item";
        addButton.type = "button";
        addButton.textContent = "+ Agregar ítem";
        addButton.addEventListener("click", () => {
          draft.items[group.id] = [""];
          renderDay();
          container.querySelectorAll("input")[container.querySelectorAll("input").length - 1]?.focus();
        });
        section.append(addButton);
      }
      container.append(section);
    });

    $("#edit-weekly-day").hidden = isEditing;
    $("#delete-weekly-day").hidden = isEditing;
    $("#save-weekly-day").hidden = !isEditing;
    $("#cancel-weekly-edit").hidden = !isEditing;
  }

  function openDay(dayKey) {
    selectedDateKey = dayKey;
    isEditing = false;
    draft = null;
    const date = new Date(`${dayKey}T12:00:00`);
    $("#weekly-day-title").textContent = `Menú · ${new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(date)}`;
    $("#weekly-status").textContent = "";
    renderDay();
    dayDialog.showModal();
  }

  function saveDay() {
    const cleanedItems = {};
    groups.forEach((group) => {
      cleanedItems[group.id] = draft.items[group.id].map((item) => item.trim()).filter(Boolean).slice(0, 1);
    });
    const updated = { ...draft, items: cleanedItems };
    const nextData = { ...weeklyData, [selectedDateKey]: updated };
    try {
      localStorage.setItem("cmaWeeklyMenus", JSON.stringify(nextData));
    } catch {
      $("#weekly-status").textContent = "No se pudo guardar el menú en este navegador.";
      return;
    }
    weeklyData = nextData;
    isEditing = false;
    draft = null;
    renderDay();
    renderGrid();
  }

  app.initializeWeeklyMenu = () => {
    weeklyData = readWeeklyData();
    renderGrid();
    $("#open-weekly-menu").addEventListener("click", () => {
      weeklyData = readWeeklyData();
      renderGrid();
      weeklyDialog.showModal();
    });
    $("#close-weekly-menu").addEventListener("click", () => weeklyDialog.close());
    $("#previous-week").addEventListener("click", () => {
      weekStart.setDate(weekStart.getDate() - 7);
      renderGrid();
    });
    $("#next-week").addEventListener("click", () => {
      weekStart.setDate(weekStart.getDate() + 7);
      renderGrid();
    });
    grid.addEventListener("click", (event) => {
      const dayButton = event.target.closest("[data-day]");
      if (dayButton) openDay(dayButton.dataset.day);
    });
    $("#close-weekly-day").addEventListener("click", () => dayDialog.close());
    $("#edit-weekly-day").addEventListener("click", () => {
      draft = JSON.parse(JSON.stringify(dayMenu(selectedDateKey)));
      isEditing = true;
      renderDay();
    });
    $("#cancel-weekly-edit").addEventListener("click", () => {
      isEditing = false;
      draft = null;
      $("#weekly-status").textContent = "";
      renderDay();
    });
    $("#save-weekly-day").addEventListener("click", saveDay);
    $("#delete-weekly-day").addEventListener("click", () => {
      if (!window.confirm("¿Eliminar el menú de este día?")) return;
      const nextData = { ...weeklyData };
      delete nextData[selectedDateKey];
      localStorage.setItem("cmaWeeklyMenus", JSON.stringify(nextData));
      weeklyData = nextData;
      dayDialog.close();
      renderGrid();
    });
  };
})();
