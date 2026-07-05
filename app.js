const typeLabels = {
  tree: "株",
  stone: "石",
  moss: "苔",
  sand: "砂",
};

const initialState = {
  version: 1,
  pot: {
    name: "浅丸鉢",
    maxWeight: 120,
  },
  view: {
    angle: 0,
  },
  objects: [
    { id: "tree-1", type: "tree", name: "黒松の株", r: 18, theta: 312, z: 28, layer: 30, weight: 46, size: 68 },
    { id: "stone-1", type: "stone", name: "添え石", r: 48, theta: 46, z: 7, layer: 12, weight: 18, size: 42 },
    { id: "moss-1", type: "moss", name: "苔むら", r: 36, theta: 204, z: 2, layer: 10, weight: 8, size: 52 },
    { id: "sand-1", type: "sand", name: "砂紋", r: 58, theta: 152, z: 0, layer: 2, weight: 5, size: 46 },
  ],
};

let state = structuredClone(initialState);
let selectedId = state.objects[0].id;
let autoTimer = null;

const els = {
  potSurface: document.getElementById("potSurface"),
  scene: document.getElementById("scene"),
  angleBadge: document.getElementById("angleBadge"),
  angleInput: document.getElementById("angleInput"),
  rotateLeft: document.getElementById("rotateLeft"),
  rotateRight: document.getElementById("rotateRight"),
  autoRotate: document.getElementById("autoRotate"),
  potName: document.getElementById("potName"),
  maxWeight: document.getElementById("maxWeight"),
  weightText: document.getElementById("weightText"),
  weightMeter: document.getElementById("weightMeter"),
  addObject: document.getElementById("addObject"),
  objectSelect: document.getElementById("objectSelect"),
  objectType: document.getElementById("objectType"),
  objectName: document.getElementById("objectName"),
  radius: document.getElementById("radius"),
  theta: document.getElementById("theta"),
  height: document.getElementById("height"),
  layer: document.getElementById("layer"),
  weight: document.getElementById("weight"),
  size: document.getElementById("size"),
  duplicateObject: document.getElementById("duplicateObject"),
  deleteObject: document.getElementById("deleteObject"),
  jsonBox: document.getElementById("jsonBox"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  downloadJson: document.getElementById("downloadJson"),
  statusText: document.getElementById("statusText"),
};

function normalizeAngle(angle) {
  return ((Math.round(angle) % 360) + 360) % 360;
}

function activeObject() {
  return state.objects.find((object) => object.id === selectedId) || state.objects[0] || null;
}

function totalWeight() {
  return state.objects.reduce((sum, object) => sum + Number(object.weight || 0), 0);
}

function polarToPercent(object, viewAngle) {
  const angle = ((Number(object.theta) + viewAngle - 90) * Math.PI) / 180;
  const radius = Math.max(0, Math.min(100, Number(object.r))) * 0.43;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function depthScore(object, viewAngle) {
  const p = polarToPercent(object, viewAngle);
  return Number(object.layer || 0) * 1000 + Number(object.z || 0) + p.y;
}

function sortedObjects() {
  return [...state.objects].sort((a, b) => depthScore(a, state.view.angle) - depthScore(b, state.view.angle));
}

function renderScene() {
  els.potSurface.innerHTML = "";
  for (const object of sortedObjects()) {
    const point = polarToPercent(object, state.view.angle);
    const node = document.createElement("button");
    node.type = "button";
    node.className = `object ${object.type}${object.id === selectedId ? " selected" : ""}`;
    node.style.setProperty("--x", `${point.x}%`);
    node.style.setProperty("--y", `${point.y}%`);
    node.style.setProperty("--z", `${Number(object.z || 0)}px`);
    node.style.setProperty("--shadow-y", `${8 + Number(object.z || 0) * 0.18}px`);
    node.style.setProperty("--shadow-blur", `${14 + Number(object.z || 0) * 0.28}px`);
    node.style.setProperty("--size", `${Number(object.size || 36)}px`);
    node.title = `${object.name} / z ${object.z || 0} / layer ${object.layer} / ${object.weight}g`;
    node.setAttribute("aria-label", object.name);
    node.addEventListener("click", () => {
      selectedId = object.id;
      render();
    });
    els.potSurface.appendChild(node);
  }
  els.angleBadge.textContent = `${state.view.angle} deg`;
  els.angleInput.value = state.view.angle;
}

function renderEditor() {
  els.potName.value = state.pot.name;
  els.maxWeight.value = state.pot.maxWeight;

  const selected = activeObject();
  els.objectSelect.innerHTML = "";
  state.objects.forEach((object) => {
    const option = document.createElement("option");
    option.value = object.id;
    option.textContent = `${typeLabels[object.type]}: ${object.name}`;
    els.objectSelect.appendChild(option);
  });

  if (!selected) {
    [els.objectType, els.objectName, els.radius, els.theta, els.height, els.layer, els.weight, els.size].forEach((input) => {
      input.disabled = true;
    });
    els.duplicateObject.disabled = true;
    els.deleteObject.disabled = true;
    return;
  }

  [els.objectType, els.objectName, els.radius, els.theta, els.height, els.layer, els.weight, els.size].forEach((input) => {
    input.disabled = false;
  });
  els.duplicateObject.disabled = false;
  els.deleteObject.disabled = state.objects.length <= 1;

  els.objectSelect.value = selected.id;
  els.objectType.value = selected.type;
  els.objectName.value = selected.name;
  els.radius.value = selected.r;
  els.theta.value = selected.theta;
  els.height.value = selected.z || 0;
  els.layer.value = selected.layer;
  els.weight.value = selected.weight;
  els.size.value = selected.size;
}

function renderWeight() {
  const current = totalWeight();
  const max = Number(state.pot.maxWeight || 0);
  els.weightText.textContent = `${current} / ${max}`;
  els.weightMeter.classList.toggle("over", current > max);
}

function renderJson() {
  els.jsonBox.value = JSON.stringify(state, null, 2);
}

function render() {
  renderScene();
  renderEditor();
  renderWeight();
  renderJson();
}

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle("error", isError);
}

function updateSelected(patch) {
  const selected = activeObject();
  if (!selected) return;
  Object.assign(selected, patch);
  render();
}

function createObject(type = "stone") {
  const count = state.objects.length + 1;
  return {
    id: `${type}-${Date.now()}`,
    type,
    name: `${typeLabels[type]} ${count}`,
    r: 42,
    theta: normalizeAngle(state.view.angle + 35),
    z: type === "tree" ? 20 : 0,
    layer: count,
    weight: type === "stone" ? 14 : 6,
    size: type === "tree" ? 58 : 38,
  };
}

function validateImportedState(nextState) {
  if (!nextState || typeof nextState !== "object") throw new Error("JSONのルートはオブジェクトにしてください。");
  if (!nextState.pot || typeof nextState.pot !== "object") throw new Error("pot がありません。");
  if (!Array.isArray(nextState.objects)) throw new Error("objects は配列にしてください。");

  return {
    version: Number(nextState.version || 1),
    pot: {
      name: String(nextState.pot.name || "無名の鉢"),
      maxWeight: Number(nextState.pot.maxWeight || 100),
    },
    view: {
      angle: normalizeAngle(nextState.view?.angle || 0),
    },
    objects: nextState.objects.map((object, index) => {
      const type = typeLabels[object.type] ? object.type : "stone";
      return {
        id: String(object.id || `${type}-${index + 1}`),
        type,
        name: String(object.name || `${typeLabels[type]} ${index + 1}`),
        r: Math.max(0, Math.min(100, Number(object.r || 0))),
        theta: normalizeAngle(object.theta || 0),
        z: Math.max(0, Math.min(80, Number(object.z || 0))),
        layer: Number(object.layer || 0),
        weight: Math.max(0, Number(object.weight || 0)),
        size: Math.max(12, Math.min(72, Number(object.size || 36))),
      };
    }),
  };
}

function stepRotation(delta) {
  state.view.angle = normalizeAngle(state.view.angle + delta);
  render();
}

els.angleInput.addEventListener("input", (event) => {
  state.view.angle = normalizeAngle(event.target.value);
  render();
});

els.rotateLeft.addEventListener("click", () => stepRotation(-15));
els.rotateRight.addEventListener("click", () => stepRotation(15));

els.autoRotate.addEventListener("click", () => {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    els.autoRotate.textContent = "自動回転";
    return;
  }
  autoTimer = setInterval(() => stepRotation(1), 60);
  els.autoRotate.textContent = "停止";
});

els.potName.addEventListener("input", (event) => {
  state.pot.name = event.target.value;
  renderJson();
});

els.maxWeight.addEventListener("input", (event) => {
  state.pot.maxWeight = Number(event.target.value);
  renderWeight();
  renderJson();
});

els.objectSelect.addEventListener("change", (event) => {
  selectedId = event.target.value;
  render();
});

els.objectType.addEventListener("change", (event) => updateSelected({ type: event.target.value }));
els.objectName.addEventListener("input", (event) => updateSelected({ name: event.target.value }));
els.radius.addEventListener("input", (event) => updateSelected({ r: Number(event.target.value) }));
els.theta.addEventListener("input", (event) => updateSelected({ theta: Number(event.target.value) }));
els.height.addEventListener("input", (event) => updateSelected({ z: Number(event.target.value) }));
els.layer.addEventListener("input", (event) => updateSelected({ layer: Number(event.target.value) }));
els.weight.addEventListener("input", (event) => updateSelected({ weight: Number(event.target.value) }));
els.size.addEventListener("input", (event) => updateSelected({ size: Number(event.target.value) }));

els.addObject.addEventListener("click", () => {
  const object = createObject(els.objectType.value);
  state.objects.push(object);
  selectedId = object.id;
  render();
});

els.duplicateObject.addEventListener("click", () => {
  const selected = activeObject();
  if (!selected) return;
  const copy = {
    ...selected,
    id: `${selected.type}-${Date.now()}`,
    name: `${selected.name} copy`,
    theta: normalizeAngle(selected.theta + 18),
    layer: Number(selected.layer) + 1,
  };
  state.objects.push(copy);
  selectedId = copy.id;
  render();
});

els.deleteObject.addEventListener("click", () => {
  if (state.objects.length <= 1) return;
  state.objects = state.objects.filter((object) => object.id !== selectedId);
  selectedId = state.objects[0]?.id || "";
  render();
});

els.exportJson.addEventListener("click", () => {
  renderJson();
  setStatus("現在の配置をJSONに反映しました。");
});

els.importJson.addEventListener("click", () => {
  try {
    state = validateImportedState(JSON.parse(els.jsonBox.value));
    selectedId = state.objects[0]?.id || "";
    render();
    setStatus("JSONから配置を復元しました。");
  } catch (error) {
    setStatus(error.message, true);
  }
});

els.downloadJson.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bonsai-layout.json";
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus("bonsai-layout.json を作成しました。");
});

render();
