/**
 * Client-side module for the authenticated community home page.
 *
 * This script verifies the active session, loads the current user's role, and
 * renders the report board so admins can manage the community list while users
 * browse saved lost-and-found items.
 */
const accountLabel = document.getElementById("account-label");
const roleBadge = document.getElementById("role-badge");
const logoutButton = document.getElementById("logout-button");
const searchInput = document.getElementById("report-search");
const reportGrid = document.getElementById("report-grid");
const resultsCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const adminTools = document.getElementById("admin-tools");
const homeDescription = document.getElementById("home-description");
const itemForm = document.getElementById("item-form");
const itemIdInput = document.getElementById("item-id");
const itemTitleInput = document.getElementById("item-title");
const itemTypeInput = document.getElementById("item-type");
const itemLocationInput = document.getElementById("item-location");
const itemImageInput = document.getElementById("item-image");
const itemSubmit = document.getElementById("item-submit");
const itemCancel = document.getElementById("item-cancel");
const itemFormMessage = document.getElementById("item-form-message");
const boardMessage = document.getElementById("board-message");
let signedInEmail;
let isAdmin = false;
let reports = [];

async function loadReports() {
  const response = await fetch("/api/reports");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load saved items.");
  if (
    !Array.isArray(result.reports) ||
    !result.reports.every(
      (report) =>
        report &&
        typeof report.id === "string" &&
        (report.type === "lost" || report.type === "found") &&
        typeof report.title === "string" &&
        typeof report.location === "string" &&
        typeof report.date === "string" &&
        typeof report.hasImage === "boolean",
    )
  ) {
    throw new Error("Saved community items have an invalid format.");
  }
  return result.reports;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderReports() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleReports = reports.filter((report) =>
    `${report.type} ${report.title} ${report.location}`.toLowerCase().includes(query),
  );

  reportGrid.replaceChildren();
  for (const report of visibleReports) {
    const card = makeElement("article", "report-card");
    const top = makeElement("div", "report-card-top");
    const tag = makeElement("span", `report-tag ${report.type}`, `${report.type} ITEM`);
    const date = makeElement("time", "report-date", formatDate(report.date));
    date.dateTime = report.date;
    top.append(tag, date);

    const title = makeElement("h3", "", report.title);
    const location = makeElement("p", "report-location");
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pin.setAttribute("viewBox", "0 0 20 20");
    pin.setAttribute("fill", "none");
    pin.setAttribute("aria-hidden", "true");
    const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pinPath.setAttribute("d", "M16 8.3c0 4.4-6 9-6 9s-6-4.6-6-9a6 6 0 1 1 12 0Z");
    const pinCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pinCircle.setAttribute("cx", "10");
    pinCircle.setAttribute("cy", "8");
    pinCircle.setAttribute("r", "2");
    pin.append(pinPath, pinCircle);
    location.append(pin, document.createTextNode(report.location));

    card.append(top, title);
    if (report.hasImage) {
      const imageLink = makeElement("a", "report-image-link");
      imageLink.href = `/api/reports/${encodeURIComponent(report.id)}/image`;
      imageLink.target = "_blank";
      imageLink.rel = "noopener noreferrer";
      imageLink.setAttribute("aria-label", `View photo of ${report.title}`);
      const image = document.createElement("img");
      image.src = imageLink.href;
      image.alt = `Photo of ${report.title}`;
      image.loading = "lazy";
      imageLink.append(image);
      card.append(imageLink);
    }
    card.append(location);
    if (isAdmin) {
      const actions = makeElement("div", "report-card-actions");
      const editButton = makeElement("button", "edit-button", "Edit");
      editButton.type = "button";
      editButton.dataset.reportId = report.id;
      editButton.setAttribute("aria-label", `Edit ${report.title}`);
      const deleteButton = makeElement("button", "delete-button", "Delete");
      deleteButton.type = "button";
      deleteButton.dataset.reportId = report.id;
      deleteButton.setAttribute("aria-label", `Delete ${report.title}`);
      actions.append(editButton, deleteButton);
      card.append(actions);
    }
    reportGrid.append(card);
  }

  resultsCount.textContent = `${visibleReports.length} ${visibleReports.length === 1 ? "report" : "reports"}`;
  emptyState.hidden = visibleReports.length !== 0;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) throw new Error(`Sign-out failed (${response.status}).`);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Could not sign out.", error);
    boardMessage.textContent = "Could not sign out. Please check your connection and try again.";
  }
});

searchInput.addEventListener("input", renderReports);

reportGrid.addEventListener("click", async (event) => {
  if (!isAdmin || !(event.target instanceof Element)) return;
  const button = event.target.closest("button");
  if (!button) return;

  const report = reports.find((item) => item.id === button.dataset.reportId);
  if (!report) return;
  if (button.classList.contains("edit-button")) {
    itemIdInput.value = report.id;
    itemTitleInput.value = report.title;
    itemTypeInput.value = report.type;
    itemLocationInput.value = report.location;
    itemSubmit.textContent = "Save changes";
    itemCancel.hidden = false;
    itemFormMessage.textContent = `Editing: ${report.title}`;
    itemTitleInput.focus();
    return;
  }
  if (!button.classList.contains("delete-button")) return;
  if (!window.confirm(`Delete "${report.title}"? This cannot be undone.`)) return;

  button.disabled = true;
  try {
    const response = await fetch(`/api/reports/${encodeURIComponent(report.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not delete the report.");
    if (itemIdInput.value === report.id) clearItemForm();
    reports = await loadReports();
    renderReports();
    boardMessage.textContent = "Report deleted.";
  } catch (error) {
    console.error("Could not delete the report.", error);
    boardMessage.textContent = error.message || "Could not delete the report. Please try again.";
  } finally {
    button.disabled = false;
  }
});

function clearItemForm() {
  itemForm.reset();
  itemIdInput.value = "";
  itemSubmit.textContent = "Add item";
  itemCancel.hidden = true;
  itemFormMessage.textContent = "";
}

itemCancel.addEventListener("click", clearItemForm);

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected image."));
        return;
      }
      const separator = reader.result.indexOf(",");
      if (separator < 0) {
        reject(new Error("The selected image is invalid."));
        return;
      }
      resolve({ mimeType: file.type, data: reader.result.slice(separator + 1) });
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read the selected image.")));
    reader.readAsDataURL(file);
  });
}

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin || !itemForm.reportValidity()) return;

  const fields = {
    type: itemTypeInput.value,
    title: itemTitleInput.value.trim(),
    location: itemLocationInput.value.trim(),
  };
  const isEditing = Boolean(itemIdInput.value);
  if (!fields.title || !fields.location) {
    itemFormMessage.textContent = "Enter an item name and location.";
    return;
  }

  const imageFile = itemImageInput.files[0];
  if (imageFile && imageFile.size > 5 * 1024 * 1024) {
    itemFormMessage.textContent = "Images must be 5 MB or smaller.";
    return;
  }
  if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
    itemFormMessage.textContent = "Choose a JPG, PNG, or WebP image.";
    return;
  }

  itemSubmit.disabled = true;
  try {
    const image = imageFile ? await readImage(imageFile) : null;
    const response = await fetch(
      isEditing ? `/api/reports/${encodeURIComponent(itemIdInput.value)}` : "/api/reports",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, image }),
      },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save the report.");
    reports = await loadReports();
    clearItemForm();
    itemFormMessage.textContent = isEditing ? "Item updated." : "Item added.";
    renderReports();
  } catch (error) {
    console.error("Could not save community items.", error);
    itemFormMessage.textContent = error.message || "Could not save the item. Please try again.";
  } finally {
    itemSubmit.disabled = false;
  }
});

async function initializeHome() {
  try {
    const response = await fetch("/api/session");
    if (response.status === 401) {
      window.location.replace("index.html");
      return;
    }
    if (!response.ok) throw new Error(`Account check failed (${response.status}).`);

    const result = await response.json();
    if (
      !result.user ||
      typeof result.user.email !== "string" ||
      !["admin", "user"].includes(result.user.role)
    ) {
      throw new Error("The server returned invalid account details.");
    }

    signedInEmail = result.user.email;
    isAdmin = result.user.role === "admin";
    accountLabel.textContent = signedInEmail;
    roleBadge.textContent = isAdmin ? "Admin" : "User";
    roleBadge.classList.toggle("admin", isAdmin);
    adminTools.hidden = !isAdmin;
    homeDescription.textContent = isAdmin
      ? "Review community reports and manage the items on the board."
      : "Search recent lost-and-found reports from your community.";
  } catch (error) {
    console.error("Could not verify the account.", error);
    boardMessage.textContent = "Could not verify your account. Reload this page to try again.";
    return;
  }

  try {
    reports = await loadReports();
    renderReports();
  } catch (error) {
    console.error("Could not load community items.", error);
    boardMessage.textContent = "Could not load saved items. Reload this page to try again.";
  }
}

initializeHome();
