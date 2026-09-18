// JWASH - campus laundry slot system
// using localStorage since we dont have a backend yet

const garmentsKey = "jwash_garments_v3";
const ordersKey = "jwash_orders_v3";
const userKey = "jwash_current_user_v3";
const roleKey = "jwash_role_v3";

// slot groups - which 2 days a laundry ID can go pickup/dropoff
// sunday is never in here, sunday is off for laundry campus wide
// this is just based on id number for now (id % 3), replace with the
// actual slot list from the laundry office if it doesnt match reality
const SLOT_GROUPS = [
  "Monday & Thursday",
  "Wednesday & Saturday",
  "Tuesday & Friday"
];

function getSlotDays(laundryId) {
  const num = parseInt(laundryId, 10);
  const groupIndex = num % 3;
  return SLOT_GROUPS[groupIndex];
}

// load saved data or start empty
let garments = JSON.parse(localStorage.getItem(garmentsKey)) || [];
let orders = JSON.parse(localStorage.getItem(ordersKey)) || [];
let currentUser = JSON.parse(localStorage.getItem(userKey)) || null;
let role = localStorage.getItem(roleKey) || null;

function saveGarments() {
  localStorage.setItem(garmentsKey, JSON.stringify(garments));
}
function saveOrders() {
  localStorage.setItem(ordersKey, JSON.stringify(orders));
}

// stop html injection in names etc
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ------------------ tabs / nav ------------------

const studentTabs = [
  ["wardrobe", "Wardrobe"],
  ["neworder", "New Order"],
  ["myorders", "My Orders"],
  ["lostfound", "Lost & Found"]
];
const staffTabs = [["staffdesk", "Staff Desk"]];

const tabsEl = document.getElementById("tabs");

function renderTabs() {
  tabsEl.innerHTML = "";
  if (!role) return;

  const list = role === "student" ? studentTabs : staffTabs;

  for (let i = 0; i < list.length; i++) {
    const id = list[i][0];
    const label = list[i][1];
    const btn = document.createElement("button");
    btn.className = "tab" + (i === 0 ? " active" : "");
    btn.dataset.tab = id;
    btn.textContent = label;
    btn.onclick = function () { switchView(id, btn); };
    tabsEl.appendChild(btn);
  }

  const switchBtn = document.createElement("button");
  switchBtn.className = "tab tab-switch";
  switchBtn.textContent = role === "student" ? "Switch (" + currentUser.name + ")" : "Switch role";
  switchBtn.onclick = logout;
  tabsEl.appendChild(switchBtn);

  switchView(list[0][0]);
}

function switchView(id, btn) {
  const allTabs = document.querySelectorAll(".tab");
  allTabs.forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const allViews = document.querySelectorAll(".view");
  allViews.forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + id).classList.add("active");

  // refresh whatever tab we just opened
  if (id === "wardrobe") renderWardrobe();
  if (id === "neworder") renderOrderPicker();
  if (id === "myorders") renderMyOrders();
  if (id === "staffdesk") renderStaffDesk();
}

function logout() {
  role = null;
  localStorage.removeItem(roleKey);
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-login").classList.add("active");
  document.getElementById("slot-banner").hidden = true;
  renderTabs();
}

// ------------------ login ------------------

const studentForm = document.getElementById("student-login-form");

document.getElementById("role-student").addEventListener("click", function () {
  if (currentUser) {
    goStudent();
  } else {
    studentForm.hidden = false;
  }
});

document.getElementById("role-staff").addEventListener("click", function () {
  role = "staff";
  localStorage.setItem(roleKey, role);
  startApp("staffdesk");
});

studentForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("input-login-name").value.trim();
  const room = document.getElementById("input-login-room").value.trim();
  const laundryId = document.getElementById("input-login-laundryid").value.trim();

  if (!name || !room) return;
  if (!/^[0-9]{4}$/.test(laundryId)) {
    alert("laundry id has to be exactly 4 digits");
    return;
  }

  currentUser = { name: name, room: room, laundryId: laundryId };
  localStorage.setItem(userKey, JSON.stringify(currentUser));
  goStudent();
});

function goStudent() {
  role = "student";
  localStorage.setItem(roleKey, role);
  startApp("wardrobe");
}

function startApp(tab) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + tab).classList.add("active");
  renderTabs();
  renderSlotBanner();
}

function renderSlotBanner() {
  const banner = document.getElementById("slot-banner");

  if (role === "student" && currentUser) {
    const days = getSlotDays(currentUser.laundryId);
    let html = "Laundry ID <b>" + escapeHtml(currentUser.laundryId) + "</b> - your pickup/dropoff days are <b>" + days + "</b>. Sunday is off for laundry campus wide.";

    const today = new Date().toLocaleDateString(undefined, { weekday: "long" });
    if (today === "Sunday") {
      html += " <span class='slot-warning'>(its sunday today, laundry point is closed)</span>";
    } else if (!days.includes(today)) {
      html += " <span class='slot-warning'>(today is not your slot day)</span>";
    }

    banner.innerHTML = html;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

// skip login if already logged in before on this browser
if (role === "student" && currentUser) startApp("wardrobe");
if (role === "staff") startApp("staffdesk");

// ------------------ wardrobe ------------------
// this is the main idea from the synopsis - upload garment photo ONE time
// and reuse it for every order after that instead of uploading again and again

const garmentForm = document.getElementById("garment-form");
const garmentPhotoInput = document.getElementById("input-garment-photo");
const garmentPreview = document.getElementById("garment-photo-preview");
const garmentDropInner = document.getElementById("garment-dropzone-inner");
let pendingPhoto = null;

garmentPhotoInput.addEventListener("change", function () {
  const file = garmentPhotoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    pendingPhoto = reader.result;
    garmentPreview.src = pendingPhoto;
    garmentPreview.hidden = false;
    garmentDropInner.hidden = true;
  };
  reader.readAsDataURL(file);
});

garmentForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("input-garment-name").value.trim();

  if (!name || !pendingPhoto) {
    alert("add a name and a photo first");
    return;
  }

  garments.unshift({
    id: "g" + Date.now(),
    name: name,
    photo: pendingPhoto,
    addedAt: new Date().toISOString()
  });
  saveGarments();

  garmentForm.reset();
  garmentPreview.hidden = true;
  garmentDropInner.hidden = false;
  pendingPhoto = null;
  renderWardrobe();
});

function renderWardrobe() {
  const grid = document.getElementById("wardrobe-grid");
  const empty = document.getElementById("wardrobe-empty");
  grid.innerHTML = "";

  if (garments.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const g of garments) {
    const card = document.createElement("div");
    card.className = "garment-card";
    card.innerHTML =
      '<img src="' + g.photo + '" alt="' + escapeHtml(g.name) + '">' +
      '<div class="garment-name">' + escapeHtml(g.name) + "</div>";
    grid.appendChild(card);
  }
}

// ------------------ new order ------------------

let selectedIds = new Set();

function renderOrderPicker() {
  const grid = document.getElementById("order-garment-picker");
  const empty = document.getElementById("order-picker-empty");
  grid.innerHTML = "";
  selectedIds = new Set();

  if (garments.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const g of garments) {
    const card = document.createElement("div");
    card.className = "garment-card";
    card.innerHTML =
      '<img src="' + g.photo + '" alt="' + escapeHtml(g.name) + '">' +
      '<div class="garment-name">' + escapeHtml(g.name) + '</div>' +
      '<div class="garment-check"></div>';

    card.addEventListener("click", function () {
      const checkDiv = card.querySelector(".garment-check");
      if (selectedIds.has(g.id)) {
        selectedIds.delete(g.id);
        card.classList.remove("selected");
        checkDiv.textContent = "";
      } else {
        selectedIds.add(g.id);
        card.classList.add("selected");
        checkDiv.textContent = "selected";
      }
    });

    grid.appendChild(card);
  }
}

document.getElementById("create-order-btn").addEventListener("click", function () {
  if (selectedIds.size === 0) {
    alert("pick atleast one garment");
    return;
  }

  const newOrder = {
    key: "o" + Date.now(),       // just for tracking this order object internally
    laundryId: currentUser.laundryId,  // this is what shows on the ticket now, fixed for the student
    studentName: currentUser.name,
    room: currentUser.room,
    garmentIds: Array.from(selectedIds),
    stage: "pending", // pending -> received -> ready -> delivered, staff moves it forward
    createdAt: new Date().toISOString(),
    lostReport: null
  };

  orders.unshift(newOrder);
  saveOrders();

  const slot = document.getElementById("order-preview-slot");
  slot.innerHTML = "";
  slot.appendChild(makeTicket(newOrder));

  renderOrderPicker();
});

// ------------------ ticket card (used in a few places) ------------------

const stageNames = { pending: "Submitted - waiting for staff", received: "Received", ready: "Ready", delivered: "Delivered" };

function getOrderGarments(order) {
  const list = [];
  for (const id of order.garmentIds) {
    const found = garments.find(g => g.id === id);
    if (found) list.push(found);
  }
  return list;
}

function makeTicket(order) {
  const el = document.createElement("div");
  el.className = "ticket";

  const statusClass = order.lostReport ? "status-lost" : "status-" + order.stage;
  const statusText = order.lostReport ? "Lost report filed" : stageNames[order.stage];
  const items = getOrderGarments(order);

  let thumbsHtml = "";
  for (const g of items) {
    thumbsHtml += '<img class="ticket-garment-thumb" src="' + g.photo + '" title="' + escapeHtml(g.name) + '">';
  }

  el.innerHTML =
    '<div class="ticket-stub">' +
      '<span class="token-label">LAUNDRY ID</span>' +
      '<span class="token-number">' + escapeHtml(order.laundryId) + '</span>' +
    '</div>' +
    '<div class="ticket-body">' +
      '<div class="ticket-info">' +
        '<div class="ticket-name">' + escapeHtml(order.studentName) + '</div>' +
        '<div class="ticket-meta">Room ' + escapeHtml(order.room) + ' - submitted ' + formatDate(order.createdAt) + ' - ' + items.length + ' item(s) - slot: ' + getSlotDays(order.laundryId) + '</div>' +
        '<div class="ticket-garment-row">' + thumbsHtml + '</div>' +
        '<span class="status-pill ' + statusClass + '">' + statusText + '</span>' +
      '</div>' +
    '</div>';

  return el;
}

// ------------------ my orders ------------------

function renderMyOrders() {
  const list = document.getElementById("order-list");
  const empty = document.getElementById("myorders-empty");
  list.innerHTML = "";

  const mine = orders.filter(o => o.laundryId === currentUser.laundryId);

  if (mine.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const o of mine) {
    list.appendChild(makeTicket(o));
  }
}

// ------------------ lost and found ------------------

const lookupInput = document.getElementById("lookup-input");
const lookupBtn = document.getElementById("lookup-btn");
const lookupResult = document.getElementById("lookup-result");

lookupBtn.addEventListener("click", doLookup);
lookupInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") doLookup();
});

function doLookup() {
  const query = lookupInput.value.trim();
  lookupResult.innerHTML = "";
  if (!query) return;

  const matches = orders.filter(o => o.laundryId === query);

  if (matches.length === 0) {
    lookupResult.innerHTML = '<p class="not-found">No orders found for laundry id "' + escapeHtml(query) + '". check the number again.</p>';
    return;
  }

  // student could have multiple orders under the same laundry id,
  // so show all of them and let them pick which one to report
  for (const order of matches) {
    lookupResult.appendChild(makeTicket(order));
    lookupResult.appendChild(buildLostForm(order));
  }
}

function buildLostForm(order) {
  const wrap = document.createElement("div");
  wrap.className = "lost-form";

  if (order.lostReport) {
    const lostItems = getOrderGarments(order).filter(g => order.lostReport.garmentIds.includes(g.id));
    const names = lostItems.map(g => escapeHtml(g.name)).join(", ");
    wrap.innerHTML = '<div class="lost-report-box">Already reported lost: ' + names + ' - "' + escapeHtml(order.lostReport.note) + '"</div>';
    return wrap;
  }

  const items = getOrderGarments(order);
  wrap.innerHTML =
    '<span class="garment-pick-label">Select which garment is missing from this order (links to its saved photo)</span>' +
    '<div class="wardrobe-grid selectable" id="lost-garment-picker-' + order.key + '"></div>' +
    '<textarea id="lost-note-' + order.key + '" placeholder="what happened?"></textarea>' +
    '<button class="btn btn-secondary" id="lost-submit-' + order.key + '">File lost report</button>';

  const picker = wrap.querySelector('#lost-garment-picker-' + order.key);
  const pickedIds = new Set();

  for (const g of items) {
    const card = document.createElement("div");
    card.className = "garment-card";
    card.innerHTML =
      '<img src="' + g.photo + '" alt="' + escapeHtml(g.name) + '">' +
      '<div class="garment-name">' + escapeHtml(g.name) + '</div>' +
      '<div class="garment-check"></div>';

    card.addEventListener("click", function () {
      const checkDiv = card.querySelector(".garment-check");
      if (pickedIds.has(g.id)) {
        pickedIds.delete(g.id);
        card.classList.remove("selected");
        checkDiv.textContent = "";
      } else {
        pickedIds.add(g.id);
        card.classList.add("selected");
        checkDiv.textContent = "missing";
      }
    });

    picker.appendChild(card);
  }

  wrap.querySelector('#lost-submit-' + order.key).addEventListener("click", function () {
    const note = wrap.querySelector('#lost-note-' + order.key).value.trim();
    if (pickedIds.size === 0 || !note) {
      alert("select the garment and write what happened");
      return;
    }
    order.lostReport = {
      garmentIds: Array.from(pickedIds),
      note: note,
      reportedAt: new Date().toISOString()
    };
    saveOrders();
    doLookup(); // refresh so it shows the filed report now
  });

  return wrap;
}

// ------------------ staff desk ------------------

function renderStaffDesk() {
  const body = document.getElementById("staff-table-body");
  const empty = document.getElementById("staffdesk-empty");
  body.innerHTML = "";

  if (orders.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const order of orders) {
    const items = getOrderGarments(order);
    let thumbs = "";
    for (const g of items) {
      thumbs += '<img class="mini-thumb" src="' + g.photo + '" title="' + escapeHtml(g.name) + '">';
    }

    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + escapeHtml(order.laundryId) + "</td>" +
      "<td>" + escapeHtml(order.studentName) + "</td>" +
      "<td>" + escapeHtml(order.room) + "</td>" +
      "<td>" + getSlotDays(order.laundryId) + "</td>" +
      '<td><div class="mini-thumb-row">' + thumbs + "</div></td>" +
      '<td><select data-key="' + order.key + '" class="status-select">' +
        '<option value="pending">Pending (not confirmed yet)</option>' +
        '<option value="received">Received</option>' +
        '<option value="ready">Ready</option>' +
        '<option value="delivered">Delivered</option>' +
      "</select></td>" +
      "<td>" + (order.lostReport ? "lost: " + escapeHtml(order.lostReport.note) : "-") + "</td>";

    row.querySelector(".status-select").value = order.stage;
    body.appendChild(row);
  }

  document.querySelectorAll(".status-select").forEach(function (select) {
    select.addEventListener("change", function () {
      const order = orders.find(o => o.key === select.dataset.key);
      order.stage = select.value;
      saveOrders();
    });
  });
}
