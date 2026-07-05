const typeLabels = {
  tree: "株",
  stone: "石",
  moss: "苔",
  sand: "砂",
  ornament: "飾り物",
};

const typeRules = {
  tree: { rMax: 72, zMin: 0, zMax: 0, baseSize: 150, defaultWeight: 46, defaultScale: 1 },
  stone: { rMax: 92, zMin: 0, zMax: 16, baseSize: 42, defaultWeight: 18, defaultScale: 0.9 },
  moss: { rMax: 98, zMin: 0, zMax: 0, baseSize: 48, defaultWeight: 8, defaultScale: 0.95 },
  sand: { rMax: 100, zMin: 0, zMax: 0, baseSize: 58, defaultWeight: 5, defaultScale: 0.9 },
  ornament: { rMax: 92, zMin: 0, zMax: 48, baseSize: 42, defaultWeight: 7, defaultScale: 1 },
};

const projection = {
  centerX: 50,
  centerY: 58,
  ellipseScaleX: 0.43,
  ellipseScaleY: 0.18,
};

const initialState = {
  version: 2,
  cameraMode: "front_2_5d",
  potRotation: 0,
  pot: {
    name: "浅丸鉢",
    maxWeight: 120,
  },
  view: {
    angle: 0,
  },
  objects: [
    { id: "tree-1", type: "tree", name: "黒松の株", r: 24, theta: 90, z: 0, layer: 10, weight: 46, scale: 1, rotation: 0 },
    { id: "stone-1", type: "stone", name: "添え石", r: 70, theta: 42, z: 4, layer: 3, weight: 18, scale: 0.86, rotation: 14 },
    { id: "moss-1", type: "moss", name: "苔むら", r: 76, theta: 132, z: 0, layer: 2, weight: 8, scale: 0.98, rotation: 0 },
    { id: "sand-1", type: "sand", name: "砂紋", r: 42, theta: 88, z: 0, layer: 1, weight: 5, scale: 0.9, rotation: 24 },
  ],
};

let state = structuredClone(initialState);
let selectedId = state.objects[0].id;
let autoTimer = null;
let draggingId = null;

const els = {
  objectStage: document.getElementById("objectStage"),
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
  objectRotation: document.getElementById("objectRotation"),
  zHint: document.getElementById("zHint"),
  layerBack: document.getElementById("layerBack"),
  layerForward: document.getElementById("layerForward"),
  duplicateObject: document.getElementById("duplicateObject"),
  deleteObject: document.getElementById("deleteObject"),
  jsonBox: document.getElementById("jsonBox"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  downloadJson: document.getElementById("downloadJson"),
  statusText: document.getElementById("statusText"),
};

function normalizeAngle(angle) {
  return ((Math.round(Number(angle) || 0) % 360) + 360) % 360;
}

function activeObject() {
  return state.objects.find((object) => object.id === selectedId) || state.objects[0] || null;
}

function rulesFor(type) {
  return typeRules[type] || typeRules.stone;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampObject(object) {
  const rules = rulesFor(object.type);
  object.r = clamp(object.r, 0, rules.rMax);
  object.theta = normalizeAngle(object.theta);
  object.z = clamp(object.z, rules.zMin, rules.zMax);
  object.layer = Number(object.layer || 0);
  object.weight = Math.max(0, Number(object.weight || 0));
  object.scale = clamp(object.scale ?? 1, 0.6, 1.6);
  object.rotation = normalizeAngle(object.rotation || 0);
  return object;
}

function potRotation() {
  return normalizeAngle(state.potRotation ?? state.view?.angle ?? 0);
}

function totalWeight() {
  return state.objects.reduce((sum, object) => sum + Number(object.weight || 0), 0);
}

function projectObject(object) {
  const worldTheta = normalizeAngle(Number(object.theta || 0) + potRotation());
  const radians = (worldTheta * Math.PI) / 180;
  const depth = Math.sin(radians);
  const zPercent = (Number(object.z || 0) / els.objectStage.clientHeight) * 100;
  const x = projection.centerX + Math.cos(radians) * Number(object.r || 0) * projection.ellipseScaleX;
  const y = projection.centerY + depth * Number(object.r || 0) * projection.ellipseScaleY - zPercent;
  const perspectiveScale = 1 + depth * 0.13;
  const visualScale = Math.max(0.48, Number(object.scale || 1) * perspectiveScale);
  return {
    x,
    y,
    depth,
    worldTheta,
    visualScale,
    opacity: 0.68 + (depth + 1) * 0.16,
    zIndex: Math.round(260 + depth * 110 + Number(object.z || 0) + Number(object.layer || 0) * 40),
  };
}

function screenToPolar(clientX, clientY, object) {
  const rect = els.objectStage.getBoundingClientRect();
  const xPercent = ((clientX - rect.left) / rect.width) * 100;
  const yPercent = ((clientY - rect.top) / rect.height) * 100;
  const zPercent = (Number(object.z || 0) / rect.height) * 100;
  const dx = (xPercent - projection.centerX) / projection.ellipseScaleX;
  const dy = (yPercent - projection.centerY + zPercent) / projection.ellipseScaleY;
  const rules = rulesFor(object.type);
  const r = clamp(Math.sqrt(dx * dx + dy * dy), 0, rules.rMax);
  const worldTheta = (Math.atan2(dy, dx) * 180) / Math.PI;
  const theta = normalizeAngle(worldTheta - potRotation());
  return { r: Math.round(r), theta };
}

function depthScore(object) {
  return projectObject(object).zIndex;
}

function sortedObjects() {
  return [...state.objects].sort((a, b) => depthScore(a) - depthScore(b));
}

function objectMarkup(type) {
  if (type === "tree") return '<span class="tree-root root-a"></span><span class="tree-root root-b"></span><span class="tree-trunk trunk-base"></span><span class="tree-trunk trunk-mid"></span><span class="tree-trunk trunk-top"></span><span class="tree-branch branch-low"></span><span class="tree-branch branch-left"></span><span class="tree-branch branch-right"></span><span class="tree-branch branch-top"></span><span class="tree-leaf leaf-low"></span><span class="tree-leaf leaf-left"></span><span class="tree-leaf leaf-right"></span><span class="tree-leaf leaf-crown"></span><span class="tree-leaf leaf-front"></span>';
  if (type === "stone") return '<span class="stone-core"></span><span class="stone-chip chip-a"></span><span class="stone-chip chip-b"></span>';
  if (type === "moss") return '<span class="moss-pad pad-a"></span><span class="moss-pad pad-b"></span><span class="moss-pad pad-c"></span>';
  if (type === "sand") return '<span class="sand-rake"></span>';
  return '<span class="ornament-post"></span><span class="ornament-top"></span>';
}

function renderScene() {
  els.objectStage.innerHTML = "";
  for (const object of sortedObjects()) {
    const point = projectObject(object);
    const rules = rulesFor(object.type);
    const node = document.createElement("button");
    node.type = "button";
    node.className = `object ${object.type}${object.id === selectedId ? " selected" : ""}${point.depth < -0.2 ? " is-back" : " is-front"}`;
    node.style.setProperty("--x", `${point.x}%`);
    node.style.setProperty("--y", `${point.y}%`);
    node.style.setProperty("--z", `${Number(object.z || 0)}px`);
    node.style.setProperty("--base-size", `${rules.baseSize}px`);
    node.style.setProperty("--visual-scale", point.visualScale);
    node.style.setProperty("--object-lift", object.type === "tree" ? "-30px" : "0px");
    node.style.setProperty("--object-rotation", `${Number(object.rotation || 0)}deg`);
    node.style.setProperty("--object-opacity", point.opacity);
    node.style.setProperty("--shadow-y", `${10 + Number(object.z || 0) * 0.22 + point.depth * 3}px`);
    node.style.setProperty("--shadow-blur", `${15 + Number(object.z || 0) * 0.35}px`);
    node.style.zIndex = point.zIndex;
    node.title = `${object.name} / r ${object.r} / theta ${object.theta} / z ${object.z} / layer ${object.layer}`;
    node.setAttribute("aria-label", object.name);
    node.innerHTML = objectMarkup(object.type);
    node.addEventListener("pointerdown", (event) => startDrag(event, object.id));
    node.addEventListener("click", () => {
      selectedId = object.id;
      render();
    });
    els.objectStage.appendChild(node);
  }
  const angle = potRotation();
  els.angleBadge.textContent = `${angle} deg`;
  els.angleInput.value = angle;
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

  const editorInputs = [els.objectType, els.objectName, els.radius, els.theta, els.height, els.layer, els.weight, els.size, els.objectRotation];
  if (!selected) {
    editorInputs.forEach((input) => {
      input.disabled = true;
    });
    els.layerBack.disabled = true;
    els.layerForward.disabled = true;
    els.duplicateObject.disabled = true;
    els.deleteObject.disabled = true;
    return;
  }

  const rules = rulesFor(selected.type);
  editorInputs.forEach((input) => {
    input.disabled = false;
  });
  els.height.disabled = rules.zMax === 0;
  els.height.max = rules.zMax;
  els.radius.max = rules.rMax;
  els.layerBack.disabled = false;
  els.layerForward.disabled = false;
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
  els.size.value = Math.round(Number(selected.scale || 1) * 100);
  els.objectRotation.value = selected.rotation || 0;
  els.zHint.textContent = rules.zMax === 0 ? "この種類は地面に吸着します。" : `高さは 0-${rules.zMax} の範囲で調整できます。`;
}

function renderWeight() {
  const current = totalWeight();
  const max = Number(state.pot.maxWeight || 0);
  els.weightText.textContent = `${current} / ${max}`;
  els.weightMeter.classList.toggle("over", current > max);
}

function renderJson() {
  state.cameraMode = "front_2_5d";
  state.potRotation = potRotation();
  state.view = { angle: state.potRotation };
  els.jsonBox.value = JSON.stringify(state, null, 2);
}

function render() {
  state.objects.forEach(clampObject);
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
  clampObject(selected);
  render();
}

function createObject(type = "stone") {
  const count = state.objects.length + 1;
  const rules = rulesFor(type);
  return clampObject({
    id: `${type}-${Date.now()}`,
    type,
    name: `${typeLabels[type]} ${count}`,
    r: Math.min(54, rules.rMax),
    theta: normalizeAngle(90 - potRotation()),
    z: rules.zMin,
    layer: count,
    weight: rules.defaultWeight,
    scale: rules.defaultScale,
    rotation: 0,
  });
}

function normalizeImportedObject(object, index) {
  const type = typeLabels[object.type] ? object.type : "stone";
  const rules = rulesFor(type);
  const scale = object.scale ?? (object.size ? Number(object.size) / rules.baseSize : 1);
  return clampObject({
    id: String(object.id || `${type}-${index + 1}`),
    type,
    name: String(object.name || `${typeLabels[type]} ${index + 1}`),
    r: Number(object.r || 0),
    theta: normalizeAngle(object.theta || 0),
    z: Number(object.z || 0),
    layer: Number(object.layer || 0),
    weight: Number(object.weight ?? rules.defaultWeight),
    scale,
    rotation: Number(object.rotation || 0),
  });
}

function validateImportedState(nextState) {
  if (!nextState || typeof nextState !== "object") throw new Error("JSONのルートはオブジェクトにしてください。");
  if (!nextState.pot || typeof nextState.pot !== "object") throw new Error("pot がありません。");
  if (!Array.isArray(nextState.objects)) throw new Error("objects は配列にしてください。");

  const imported = {
    version: 2,
    cameraMode: "front_2_5d",
    potRotation: normalizeAngle(nextState.potRotation ?? nextState.view?.angle ?? 0),
    pot: {
      name: String(nextState.pot.name || "無名の鉢"),
      maxWeight: Number(nextState.pot.maxWeight || 100),
    },
    view: {
      angle: normalizeAngle(nextState.potRotation ?? nextState.view?.angle ?? 0),
    },
    objects: nextState.objects.map(normalizeImportedObject),
  };
  return imported;
}

function stepRotation(delta) {
  state.potRotation = normalizeAngle(potRotation() + delta);
  state.view = { angle: state.potRotation };
  render();
}

function startDrag(event, id) {
  const object = state.objects.find((item) => item.id === id);
  if (!object) return;
  event.preventDefault();
  draggingId = id;
  selectedId = id;
  event.currentTarget.setPointerCapture(event.pointerId);
  moveDraggedObject(event);
}

function moveDraggedObject(event) {
  if (!draggingId) return;
  const object = state.objects.find((item) => item.id === draggingId);
  if (!object) return;
  Object.assign(object, screenToPolar(event.clientX, event.clientY, object));
  clampObject(object);
  render();
}

window.addEventListener("pointermove", moveDraggedObject);
window.addEventListener("pointerup", () => {
  draggingId = null;
});

els.angleInput.addEventListener("input", (event) => {
  state.potRotation = normalizeAngle(event.target.value);
  state.view = { angle: state.potRotation };
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

els.objectType.addEventListener("change", (event) => {
  updateSelected({ type: event.target.value, z: 0 });
});
els.objectName.addEventListener("input", (event) => updateSelected({ name: event.target.value }));
els.radius.addEventListener("input", (event) => updateSelected({ r: Number(event.target.value) }));
els.theta.addEventListener("input", (event) => updateSelected({ theta: Number(event.target.value) }));
els.height.addEventListener("input", (event) => updateSelected({ z: Number(event.target.value) }));
els.layer.addEventListener("input", (event) => updateSelected({ layer: Number(event.target.value) }));
els.weight.addEventListener("input", (event) => updateSelected({ weight: Number(event.target.value) }));
els.size.addEventListener("input", (event) => updateSelected({ scale: Number(event.target.value) / 100 }));
els.objectRotation.addEventListener("input", (event) => updateSelected({ rotation: Number(event.target.value) }));

els.layerBack.addEventListener("click", () => updateSelected({ layer: Number(activeObject()?.layer || 0) - 1 }));
els.layerForward.addEventListener("click", () => updateSelected({ layer: Number(activeObject()?.layer || 0) + 1 }));

els.addObject.addEventListener("click", () => {
  const object = createObject(els.objectType.value);
  state.objects.push(object);
  selectedId = object.id;
  render();
});

els.duplicateObject.addEventListener("click", () => {
  const selected = activeObject();
  if (!selected) return;
  const copy = clampObject({
    ...selected,
    id: `${selected.type}-${Date.now()}`,
    name: `${selected.name} copy`,
    theta: normalizeAngle(selected.theta + 18),
    layer: Number(selected.layer) + 1,
  });
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
