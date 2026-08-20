/* LaneForge — local-first swimlane process builder. No dependencies, no build step. */

const STORE_KEY = "laneforge.state.v1";
const LANE_W = 220;
const COL_W = 260;
const GAP = 12;

const el = {
  canvas: document.getElementById("canvas"),
  stage: document.getElementById("stage"),
  picker: document.getElementById("map-picker"),
  search: document.getElementById("search"),
  toggleEdit: document.getElementById("toggle-edit"),
  fitView: document.getElementById("fit-view"),
  newMap: document.getElementById("new-map"),
  importBtn: document.getElementById("import-map"),
  importFile: document.getElementById("import-file"),
  exportBtn: document.getElementById("export-map"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawer-title"),
  drawerBody: document.getElementById("drawer-body"),
  closeDrawer: document.getElementById("close-drawer"),
  help: document.getElementById("help"),
  showHelp: document.getElementById("show-help"),
  closeHelp: document.getElementById("close-help"),
  toast: document.getElementById("toast"),
};

const ui = { editing: false, query: "", selected: null };
let store = { version: 1, maps: {}, activeId: null };

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/* ---------- templates ---------- */

function sampleMap() {
  const lanes = [
    { id: "lane-hm", name: "Hiring Manager" },
    { id: "lane-ta", name: "Talent Acquisition" },
    { id: "lane-ops", name: "HR Operations" },
  ];

  const rows = [
    ["lane-hm", 0, "Raise requisition", "Define the role, level, and budget before anything opens.", "Hiring Manager", "1 day", "ATS"],
    ["lane-ta", 1, "Intake call", "Agree the scorecard, must-haves, and sourcing plan.", "Recruiter", "45 min", "ATS"],
    ["lane-ta", 2, "Source and screen", "Build the pipeline and run first-round screens.", "Recruiter", "2 weeks", "ATS, LinkedIn"],
    ["lane-hm", 3, "Panel interviews", "Structured loop with one scorecard per interviewer.", "Panel", "1 week", "ATS, Calendar"],
    ["lane-ta", 4, "Debrief", "Consolidate scores and make a documented decision.", "Recruiter", "2 days", "ATS"],
    ["lane-hm", 5, "Approve offer", "Confirm level and compensation against the band.", "Hiring Manager", "1 day", "HRMS"],
    ["lane-ta", 6, "Extend offer", "Verbal first, written the same day.", "Recruiter", "1 day", "HRMS"],
    ["lane-ops", 7, "Background check", "Initiate with the vendor and track turnaround daily.", "HR Ops", "5 days", "Vendor portal"],
    ["lane-ops", 8, "Onboarding setup", "Accounts, assets, and a written day-one plan.", "HR Ops", "3 days", "HRMS, IT"],
    ["lane-ops", 9, "Day one", "Induction, buddy assignment, manager check-in.", "HR Ops", "1 day", "HRMS"],
  ];

  return {
    id: "acme-hiring",
    name: "Acme Corp — Hiring Flow",
    updatedAt: new Date().toISOString(),
    lanes,
    steps: rows.map(([laneId, column, title, summary, owner, duration, systems]) => ({
      id: uid("step"),
      laneId,
      column,
      title,
      summary,
      owner,
      duration,
      systems: systems.split(",").map((s) => s.trim()),
      link: "",
    })),
  };
}

function blankMap(name) {
  const laneId = uid("lane");
  return {
    id: uid("map"),
    name: name || "Untitled map",
    updatedAt: new Date().toISOString(),
    lanes: [{ id: laneId, name: "Lane 1" }],
    steps: [
      {
        id: uid("step"),
        laneId,
        column: 0,
        title: "First step",
        summary: "",
        owner: "",
        duration: "",
        systems: [],
        link: "",
      },
    ],
  };
}

/* ---------- persistence ---------- */

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.maps && Object.keys(parsed.maps).length) {
        store = parsed;
        if (!store.maps[store.activeId]) store.activeId = Object.keys(store.maps)[0];
        return;
      }
    }
  } catch (err) {
    console.warn("Could not read saved maps, starting fresh.", err);
  }

  const seed = sampleMap();
  store = { version: 1, maps: { [seed.id]: seed }, activeId: seed.id };
  save();
}

function save() {
  const map = activeMap();
  if (map) map.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (err) {
    toast("Browser storage is full, changes may not persist.");
    console.warn(err);
  }
}

const activeMap = () => store.maps[store.activeId] || null;

/* ---------- helpers ---------- */

function columnCount(map) {
  const used = map.steps.reduce((max, s) => Math.max(max, s.column + 1), 1);
  return ui.editing ? used + 1 : used;
}

function matchesQuery(step) {
  if (!ui.query) return true;
  const haystack = [step.title, step.summary, step.owner, (step.systems || []).join(" ")]
    .join(" ")
    .toLowerCase();
  return haystack.includes(ui.query);
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

/* ---------- rendering ---------- */

function renderPicker() {
  el.picker.innerHTML = "";
  Object.values(store.maps).forEach((map) => {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    option.selected = map.id === store.activeId;
    el.picker.append(option);
  });
}

function cardMarkup(step) {
  const tags = [step.owner, step.duration, ...(step.systems || [])].filter(Boolean);
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = step.title || "Untitled step";
  frag.append(title);

  if (step.summary) {
    const summary = document.createElement("div");
    summary.className = "card-summary";
    summary.textContent = step.summary;
    frag.append(summary);
  }

  if (tags.length) {
    const foot = document.createElement("div");
    foot.className = "card-foot";
    tags.forEach((text) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = text;
      foot.append(tag);
    });
    frag.append(foot);
  }

  return frag;
}

function buildCard(step) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.stepId = step.id;
  card.draggable = ui.editing;
  if (step.id === ui.selected) card.classList.add("selected");
  if (!matchesQuery(step)) card.classList.add("dim");
  card.append(cardMarkup(step));
  return card;
}

function refreshCard(step) {
  const card = el.canvas.querySelector(`.card[data-step-id="${step.id}"]`);
  if (!card) return;
  card.innerHTML = "";
  card.append(cardMarkup(step));
}

function buildLaneLabel(lane, map) {
  const wrap = document.createElement("div");
  wrap.className = "lane-label";
  wrap.style.gridColumn = "1";

  if (ui.editing) {
    const input = document.createElement("input");
    input.className = "lane-name-input";
    input.value = lane.name;
    input.setAttribute("aria-label", "Lane name");
    input.addEventListener("input", () => {
      lane.name = input.value;
      save();
    });
    wrap.append(input);
  } else {
    const name = document.createElement("div");
    name.className = "lane-name";
    name.textContent = lane.name;
    wrap.append(name);
  }

  const count = map.steps.filter((s) => s.laneId === lane.id).length;
  const meta = document.createElement("div");
  meta.className = "lane-meta";
  meta.textContent = `${count} ${count === 1 ? "step" : "steps"}`;
  wrap.append(meta);

  if (ui.editing) {
    const tools = document.createElement("div");
    tools.className = "lane-tools";
    const remove = document.createElement("button");
    remove.className = "mini danger";
    remove.type = "button";
    remove.textContent = "Delete lane";
    remove.addEventListener("click", () => deleteLane(lane.id));
    tools.append(remove);
    wrap.append(tools);
  }

  return wrap;
}

function buildCell(lane, column, map) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.laneId = lane.id;
  cell.dataset.column = String(column);

  map.steps
    .filter((s) => s.laneId === lane.id && s.column === column)
    .forEach((step) => cell.append(buildCard(step)));

  if (ui.editing) {
    const add = document.createElement("button");
    add.className = "add-step";
    add.type = "button";
    add.textContent = "+ Step";
    add.addEventListener("click", () => addStep(lane.id, column));
    cell.append(add);
  }

  return cell;
}

function render() {
  const map = activeMap();
  el.canvas.innerHTML = "";
  document.body.classList.toggle("editing", ui.editing);
  el.toggleEdit.setAttribute("aria-pressed", String(ui.editing));

  if (!map) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No map selected.";
    el.canvas.append(empty);
    return;
  }

  const cols = columnCount(map);
  el.canvas.style.gridTemplateColumns = `${LANE_W}px repeat(${cols}, ${COL_W}px)`;

  map.lanes.forEach((lane) => {
    el.canvas.append(buildLaneLabel(lane, map));
    for (let column = 0; column < cols; column += 1) {
      el.canvas.append(buildCell(lane, column, map));
    }
  });

  if (ui.editing) {
    const add = document.createElement("button");
    add.className = "control add-lane";
    add.type = "button";
    add.textContent = "+ Lane";
    add.style.gridColumn = "1";
    add.addEventListener("click", addLane);
    el.canvas.append(add);
  }
}

/* ---------- drawer ---------- */

function field(label, value, onChange, multiline) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const id = uid("field");
  const tag = document.createElement("label");
  tag.textContent = label;
  tag.htmlFor = id;
  wrap.append(tag);

  if (ui.editing) {
    const input = document.createElement(multiline ? "textarea" : "input");
    input.id = id;
    input.value = value || "";
    if (multiline) input.rows = 3;
    input.addEventListener("input", () => onChange(input.value));
    wrap.append(input);
  } else {
    const text = document.createElement("p");
    text.id = id;
    text.textContent = value || "";
    wrap.append(text);
  }

  return wrap;
}

function openDrawer(stepId) {
  const map = activeMap();
  const step = map.steps.find((s) => s.id === stepId);
  if (!step) return;

  ui.selected = stepId;
  el.canvas.querySelectorAll(".card.selected").forEach((c) => c.classList.remove("selected"));
  const card = el.canvas.querySelector(`.card[data-step-id="${stepId}"]`);
  if (card) card.classList.add("selected");

  el.drawerTitle.textContent = ui.editing ? "Edit step" : step.title || "Step";
  el.drawerBody.innerHTML = "";

  const commit = (key) => (value) => {
    step[key] = value;
    save();
    refreshCard(step);
    if (key === "title" && !ui.editing) el.drawerTitle.textContent = value;
  };

  el.drawerBody.append(
    field("Title", step.title, commit("title")),
    field("Summary", step.summary, commit("summary"), true),
    field("Owner", step.owner, commit("owner")),
    field("Duration", step.duration, commit("duration")),
    field("Systems (comma separated)", (step.systems || []).join(", "), (value) => {
      step.systems = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      save();
      refreshCard(step);
    }),
    field("Reference link", step.link, commit("link"))
  );

  if (!ui.editing && step.link) {
    const open = document.createElement("a");
    open.className = "control";
    open.href = step.link;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "Open reference";
    el.drawerBody.append(open);
  }

  if (ui.editing) {
    const remove = document.createElement("button");
    remove.className = "control danger";
    remove.type = "button";
    remove.textContent = "Delete step";
    remove.addEventListener("click", () => {
      map.steps = map.steps.filter((s) => s.id !== stepId);
      save();
      closeDrawer();
      render();
      toast("Step deleted.");
    });
    el.drawerBody.append(remove);
  }

  el.drawer.hidden = false;
}

function closeDrawer() {
  el.drawer.hidden = true;
  ui.selected = null;
  el.canvas.querySelectorAll(".card.selected").forEach((c) => c.classList.remove("selected"));
}

/* ---------- mutations ---------- */

function addLane() {
  const map = activeMap();
  map.lanes.push({ id: uid("lane"), name: `Lane ${map.lanes.length + 1}` });
  save();
  render();
}

function deleteLane(laneId) {
  const map = activeMap();
  if (map.lanes.length === 1) {
    toast("A map needs at least one lane.");
    return;
  }
  map.lanes = map.lanes.filter((l) => l.id !== laneId);
  map.steps = map.steps.filter((s) => s.laneId !== laneId);
  save();
  closeDrawer();
  render();
  toast("Lane deleted.");
}

function addStep(laneId, column) {
  const map = activeMap();
  const step = {
    id: uid("step"),
    laneId,
    column,
    title: "New step",
    summary: "",
    owner: "",
    duration: "",
    systems: [],
    link: "",
  };
  map.steps.push(step);
  save();
  render();
  openDrawer(step.id);
}

function moveStep(stepId, laneId, column) {
  const map = activeMap();
  const step = map.steps.find((s) => s.id === stepId);
  if (!step) return;
  if (step.laneId === laneId && step.column === column) return;
  step.laneId = laneId;
  step.column = column;
  save();
  render();
}

/* ---------- view controls ---------- */

function fitView() {
  const map = activeMap();
  if (!map) return;
  const cols = columnCount(map);
  const natural = LANE_W + cols * (COL_W + GAP) + 40;
  const available = el.stage.clientWidth;
  const zoom = Math.min(1, Math.max(0.4, available / natural));
  document.documentElement.style.setProperty("--zoom", zoom.toFixed(3));
  toast(zoom === 1 ? "Full size." : `Zoomed to ${Math.round(zoom * 100)}%.`);
}

function setEditing(on) {
  ui.editing = on;
  render();
  if (ui.selected) openDrawer(ui.selected);
}

/* ---------- import / export ---------- */

function exportMap() {
  const map = activeMap();
  if (!map) return;
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${map.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Exported JSON.");
}

function normalizeMap(raw) {
  if (!raw || !Array.isArray(raw.lanes) || !Array.isArray(raw.steps)) {
    throw new Error("File needs lanes and steps arrays.");
  }

  const lanes = raw.lanes
    .filter((l) => l && (l.id || l.name))
    .map((l) => ({ id: String(l.id || uid("lane")), name: String(l.name || "Lane") }));

  if (!lanes.length) throw new Error("File has no usable lanes.");
  const laneIds = new Set(lanes.map((l) => l.id));

  const steps = raw.steps
    .filter((s) => s && laneIds.has(String(s.laneId)))
    .map((s) => ({
      id: String(s.id || uid("step")),
      laneId: String(s.laneId),
      column: Number.isFinite(Number(s.column)) ? Math.max(0, Number(s.column)) : 0,
      title: String(s.title || "Untitled step"),
      summary: String(s.summary || ""),
      owner: String(s.owner || ""),
      duration: String(s.duration || ""),
      systems: Array.isArray(s.systems) ? s.systems.map(String) : [],
      link: String(s.link || ""),
    }));

  const id = raw.id && !store.maps[raw.id] ? String(raw.id) : uid("map");
  return { id, name: String(raw.name || "Imported map"), updatedAt: new Date().toISOString(), lanes, steps };
}

function importMap(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const map = normalizeMap(JSON.parse(String(reader.result)));
      store.maps[map.id] = map;
      store.activeId = map.id;
      save();
      renderPicker();
      render();
      toast(`Imported "${map.name}".`);
    } catch (err) {
      toast(err.message || "Could not read that file.");
    }
  };
  reader.onerror = () => toast("Could not read that file.");
  reader.readAsText(file);
}

/* ---------- events ---------- */

el.canvas.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) openDrawer(card.dataset.stepId);
});

el.canvas.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".card");
  if (!card || !ui.editing) return;
  event.dataTransfer.setData("text/plain", card.dataset.stepId);
  event.dataTransfer.effectAllowed = "move";
  card.classList.add("dragging");
});

el.canvas.addEventListener("dragend", (event) => {
  const card = event.target.closest(".card");
  if (card) card.classList.remove("dragging");
});

el.canvas.addEventListener("dragover", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell || !ui.editing) return;
  event.preventDefault();
  cell.classList.add("drop-target");
});

el.canvas.addEventListener("dragleave", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) cell.classList.remove("drop-target");
});

el.canvas.addEventListener("drop", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell || !ui.editing) return;
  event.preventDefault();
  cell.classList.remove("drop-target");
  const stepId = event.dataTransfer.getData("text/plain");
  if (stepId) moveStep(stepId, cell.dataset.laneId, Number(cell.dataset.column));
});

el.picker.addEventListener("change", () => {
  store.activeId = el.picker.value;
  save();
  closeDrawer();
  render();
});

el.search.addEventListener("input", () => {
  ui.query = el.search.value.trim().toLowerCase();
  el.canvas.querySelectorAll(".card").forEach((card) => {
    const step = activeMap().steps.find((s) => s.id === card.dataset.stepId);
    card.classList.toggle("dim", step ? !matchesQuery(step) : false);
  });
});

el.toggleEdit.addEventListener("click", () => setEditing(!ui.editing));
el.fitView.addEventListener("click", fitView);
el.closeDrawer.addEventListener("click", closeDrawer);
el.showHelp.addEventListener("click", () => el.help.showModal());
el.closeHelp.addEventListener("click", () => el.help.close());
el.exportBtn.addEventListener("click", exportMap);
el.importBtn.addEventListener("click", () => el.importFile.click());

el.importFile.addEventListener("change", () => {
  const [file] = el.importFile.files;
  if (file) importMap(file);
  el.importFile.value = "";
});

el.newMap.addEventListener("click", () => {
  const name = window.prompt("Name this map", "Untitled map");
  if (name === null) return;
  const map = blankMap(name.trim());
  store.maps[map.id] = map;
  store.activeId = map.id;
  save();
  renderPicker();
  setEditing(true);
  toast("New map created.");
});

document.addEventListener("keydown", (event) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);

  if (event.key === "Escape") {
    if (el.help.open) return;
    if (!el.drawer.hidden) closeDrawer();
    else if (ui.editing) setEditing(false);
    return;
  }

  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === "/") {
    event.preventDefault();
    el.search.focus();
  } else if (event.key === "?") {
    el.help.showModal();
  } else if (event.key.toLowerCase() === "e") {
    setEditing(!ui.editing);
  } else if (event.key.toLowerCase() === "f") {
    fitView();
  }
});

/* ---------- boot ---------- */

load();
renderPicker();
render();
