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
const itemSubmit = document.getElementById("item-submit");
const itemCancel = document.getElementById("item-cancel");
const itemFormMessage = document.getElementById("item-form-message");
const boardMessage = document.getElementById("board-message");
let signedInEmail;
let isAdmin = false;

const defaultReports = [
  { id: "sample-1", type: "lost", title: "Blue water bottle", location: "Ayala Center Cebu", date: "2026-10-12" },
  { id: "sample-2", type: "found", title: "Keys with a green tag", location: "Fuente Osmeña Circle", date: "2026-10-11" },
  { id: "sample-3", type: "lost", title: "Black umbrella", location: "IT Park, Cebu City", date: "2026-10-10" },
];

let reports = defaultReports;

function loadReports() {
  const savedReports = localStorage.getItem("findit.reports");
  if (savedReports === null) return defaultReports;

  const parsedReports = JSON.parse(savedReports);
  if (
    !Array.isArray(parsedReports) ||
    !parsedReports.every(
      (report) =>
        report &&
        typeof report.id === "string" &&
        (report.type === "lost" || report.type === "found") &&
        typeof report.title === "string" &&
        typeof report.location === "string" &&
        typeof report.date === "string",
    )
  ) {
    throw new Error("Saved community items have an invalid format.");
  }
  return parsedReports;
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

    card.append(top, title, location);
    if (isAdmin) {
      const editButton = makeElement("button", "edit-button", "Edit");
      editButton.type = "button";
      editButton.dataset.reportId = report.id;
      editButton.setAttribute("aria-label", `Edit ${report.title}`);
      card.append(editButton);
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

reportGrid.addEventListener("click", (event) => {
  if (!isAdmin || !(event.target instanceof Element)) return;
  const editButton = event.target.closest(".edit-button");
  if (!editButton) return;

  const report = reports.find((item) => item.id === editButton.dataset.reportId);
  if (!report) return;
  itemIdInput.value = report.id;
  itemTitleInput.value = report.title;
  itemTypeInput.value = report.type;
  itemLocationInput.value = report.location;
  itemSubmit.textContent = "Save changes";
  itemCancel.hidden = false;
  itemFormMessage.textContent = `Editing: ${report.title}`;
  itemTitleInput.focus();
});

function clearItemForm() {
  itemForm.reset();
  itemIdInput.value = "";
  itemSubmit.textContent = "Add item";
  itemCancel.hidden = true;
  itemFormMessage.textContent = "";
}

itemCancel.addEventListener("click", clearItemForm);

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin || !itemForm.reportValidity()) return;

  const item = {
    id: itemIdInput.value || `item-${Date.now()}`,
    type: itemTypeInput.value,
    title: itemTitleInput.value.trim(),
    location: itemLocationInput.value.trim(),
    date: new Date().toISOString().slice(0, 10),
  };
  const isEditing = Boolean(itemIdInput.value);
  if (!item.title || !item.location) {
    itemFormMessage.textContent = "Enter an item name and location.";
    return;
  }

  const nextReports = itemIdInput.value
    ? reports.map((report) => (report.id === item.id ? { ...item, date: report.date } : report))
    : [item, ...reports];

  try {
    localStorage.setItem("findit.reports", JSON.stringify(nextReports));
  } catch (error) {
    console.error("Could not save community items.", error);
    itemFormMessage.textContent = "Could not save the item in this browser. Check browser storage settings.";
    return;
  }

  reports = nextReports;
  clearItemForm();
  itemFormMessage.textContent = isEditing ? "Item updated." : "Item added.";
  renderReports();
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
    reports = loadReports();
  } catch (error) {
    console.error("Could not load community items.", error);
    boardMessage.textContent = "Could not load saved items. Clear this site's local storage and reload.";
    reports = defaultReports;
  }
  renderReports();
}

initializeHome();
