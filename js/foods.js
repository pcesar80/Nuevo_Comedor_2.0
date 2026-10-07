(() => {
  const app = window.CMA;
  const $ = app.$;
  const dialog = $("#foods-dialog");
  const form = $("#food-form");
  const rows = $("#food-rows");
  const photoInput = $("#food-photo");
  const photoPreview = $("#food-photo-preview");
  const categorySelect = $("#food-category");
  let editingId = null;
  let selectedPhoto = null;

  function resetForm() {
    form.reset();
    editingId = null;
    selectedPhoto = null;
    photoPreview.hidden = true;
    photoPreview.removeAttribute("src");
    $("#remove-photo-label").hidden = true;
    $("#save-food").textContent = "Agregar comida";
    $("#cancel-food-edit").hidden = true;
    $("#food-status").textContent = "";
  }

  function renderRows() {
    rows.replaceChildren();
    if (app.products.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "food-table-empty";
      cell.textContent = "No hay comidas cargadas.";
      row.append(cell);
      rows.append(row);
      return;
    }

    app.products.forEach((product) => {
      const row = document.createElement("tr");
      const photoCell = document.createElement("td");
      if (product.image) {
        const image = document.createElement("img");
        image.className = "food-thumb";
        image.src = product.image;
        image.alt = "";
        photoCell.append(image);
      } else {
        photoCell.textContent = "—";
      }
      const nameCell = document.createElement("td");
      nameCell.textContent = product.name;
      const priceCell = document.createElement("td");
      priceCell.textContent = app.formatPrice(product.price);
      const categoryCell = document.createElement("td");
      categoryCell.textContent = product.category;
      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "food-table-actions";

      [["edit", "Editar", "food-action secondary"], ["delete", "Eliminar", "food-action delete"]].forEach(([action, text, className]) => {
        const button = document.createElement("button");
        button.className = className;
        button.type = "button";
        button.dataset.foodAction = action;
        button.dataset.foodId = product.id;
        button.textContent = text;
        actions.append(button);
      });
      actionsCell.append(actions);
      row.append(photoCell, nameCell, priceCell, categoryCell, actionsCell);
      rows.append(row);
    });
  }

  function beginEdit(productId) {
    const product = app.products.find((item) => item.id === productId);
    if (!product) return;
    editingId = product.id;
    $("#food-name").value = product.name;
    $("#food-price").value = product.price;
    categorySelect.value = product.category;
    selectedPhoto = product.image || null;
    photoPreview.hidden = !product.image;
    if (product.image) photoPreview.src = product.image;
    $("#remove-photo-label").hidden = !product.image;
    $("#save-food").textContent = "Guardar cambios";
    $("#cancel-food-edit").hidden = false;
    $("#food-name").focus();
  }

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result), { once: true });
      reader.addEventListener("error", () => reject(reader.error), { once: true });
      reader.readAsDataURL(file);
    });
  }

  async function submitFood(event) {
    event.preventDefault();
    const name = $("#food-name").value.trim();
    const price = Number($("#food-price").value);
    const category = categorySelect.value;
    const file = photoInput.files[0];
    if (!name || !Number.isFinite(price) || price <= 0 || !category) return;
    if (file) {
      try {
        selectedPhoto = await readPhoto(file);
      } catch {
        $("#food-status").textContent = "No se pudo leer la foto seleccionada.";
        return;
      }
    }

    const existing = app.products.find((product) => product.id === editingId);
    const image = $("#remove-food-photo").checked ? null : selectedPhoto || existing?.image || null;
    const food = {
      ...(existing || {}),
      id: editingId || `food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      price,
      category,
      image,
      art: existing?.art || "🍽️",
      style: existing?.style || ""
    };
    const updated = editingId ? app.products.map((product) => product.id === editingId ? food : product) : [...app.products, food];
    try {
      app.saveFoodCatalog(updated);
    } catch {
      $("#food-status").textContent = "No hay espacio disponible para guardar la comida y su foto.";
      return;
    }
    app.products = updated;
    resetForm();
    renderRows();
    app.renderCategories();
    app.renderProducts();
  }

  function handleRowAction(event) {
    const button = event.target.closest("[data-food-action]");
    if (!button) return;
    const { foodId, foodAction } = button.dataset;
    if (foodAction === "edit") {
      beginEdit(foodId);
      return;
    }
    const food = app.products.find((product) => product.id === foodId);
    if (!food || !window.confirm(`¿Eliminar ${food.name} del catálogo?`)) return;
    const updated = app.products.filter((product) => product.id !== foodId);
    app.saveFoodCatalog(updated);
    app.products = updated;
    app.cart.delete(foodId);
    renderRows();
    app.renderCart();
    app.renderCategories();
    app.renderProducts();
  }

  app.renderFoodRows = renderRows;
  app.initializeFoods = () => {
    app.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.append(option);
    });
    $("#open-foods-amb").addEventListener("click", () => {
      resetForm();
      renderRows();
      dialog.showModal();
    });
    $("#close-foods-dialog").addEventListener("click", () => dialog.close());
    $("#cancel-food-edit").addEventListener("click", resetForm);
    dialog.addEventListener("close", resetForm);
    form.addEventListener("submit", submitFood);
    rows.addEventListener("click", handleRowAction);
    photoInput.addEventListener("change", async () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (file.size > 800 * 1024) {
        photoInput.value = "";
        $("#food-status").textContent = "La foto debe pesar menos de 800 KB.";
        return;
      }
      try {
        selectedPhoto = await readPhoto(file);
        photoPreview.src = selectedPhoto;
        photoPreview.hidden = false;
        $("#remove-photo-label").hidden = false;
      } catch {
        $("#food-status").textContent = "No se pudo leer la foto seleccionada.";
      }
    });
    $("#remove-food-photo").addEventListener("change", (event) => {
      if (!event.target.checked) return;
      selectedPhoto = null;
      photoPreview.hidden = true;
      photoPreview.removeAttribute("src");
    });
    renderRows();
  };
})();
