(() => {
  "use strict";

  const API = {
    me: "/aula/api/me",
    logout: "/aula/api/logout",
    list: "/aula/api/expedientes",
    item: (id) => `/aula/api/expedientes/${id}`,
  };

  // Columnas reales de la tabla que comparten los tres tipos de expediente.
  const COLUMN_SCALARS = ["nombre", "sexo", "edad", "fecha_nacimiento", "dui", "consulta_por"];
  // Columnas propias de Medicina general (vienen de la base original y NO se mueven).
  const GENERAL_COLUMNS = [
    "fecha_consulta", "hora_inicio_hc", "presente_enfermedad", "examen_fisico",
    "medico_nombre", "numero_junta",
  ];
  // Secciones históricas de Medicina general: siguen en sus propias columnas.
  const LEGACY_LISTS = [
    "antecedentes", "alergias", "medicamentos", "signos_vitales", "consultas",
    "diagnosticos", "tratamientos", "seguimientos", "actividades",
  ];

  // ---------- Constructores de campos ----------
  const text = (name, label, o = {}) => ({ name, label, type: "text", ...o });
  const area = (name, label, o = {}) => ({ name, label, type: "textarea", ...o });
  const date = (name, label = "Fecha", o = {}) => ({ name, label, type: "date", ...o });
  const time = (name, label, o = {}) => ({ name, label, type: "time", ...o });
  const num = (name, label, o = {}) => ({ name, label, type: "number", ...o });
  const select = (name, label, options, o = {}) => ({ name, label, type: "select", options: ["", ...options], ...o });
  // Bloque de campos únicos (se llenan una vez por expediente)
  const group = (title, fields) => ({ kind: "fields", title, fields });
  // Bloque de registros repetibles (se pueden agregar tantos como se necesite)
  const list = (key, title, fields) => ({ kind: "list", key, title, fields });

  // Bloque de firma al final del expediente (nombre de quien dio la consulta + número de junta).
  // Se llena en blanco; lo escribe quien atiende.
  const firma = () => ({
    ...group("Firma", [
      text("medico_nombre", "Nombre de quien dio la consulta"),
      text("numero_junta", "Número de junta"),
    ]),
    signature: true,
  });

  const sistemas = (nino) => [
    area("ef_cabeza_cuello", "Cabeza y cuello"),
    area("ef_ojos", nino ? "Ojos (reflejo rojo, alineación, etc.)" : "Ojos"),
    area("ef_oidos", nino ? "Oídos / audición" : "Oídos"),
    area("ef_boca", nino ? "Boca y dentición" : "Boca y garganta"),
    area("ef_torax_corazon", "Tórax y corazón"),
    area("ef_abdomen", "Abdomen"),
    area("ef_genitales", "Genitales"),
    area("ef_extremidades", "Extremidades"),
    area("ef_piel", "Piel"),
    area("ef_neurologico", "Neurológico"),
  ];

  // ---------- Definición de los tres tipos de expediente ----------
  const TYPES = {
    general: {
      label: "Medicina general",
      short: "General",
      desc: "Consulta de medicina general: antecedentes, signos vitales, examen físico, diagnósticos y tratamientos.",
      blocks: [
        group("Información personal", [
          text("nombre", "Nombre", { required: true }),
          select("sexo", "Sexo", ["Femenino", "Masculino", "Otro"]),
          num("edad", "Edad"),
          date("fecha_nacimiento", "Fecha de nacimiento"),
          text("dui", "DUI"),
          date("fecha_consulta", "Fecha de consulta"),
          time("hora_inicio_hc", "Hora de inicio de la HC"),
          text("consulta_por", "Consulta / consultó por", { wide: true }),
        ]),
        group("Presente enfermedad", [
          area("presente_enfermedad", "Presente enfermedad", { wide: true }),
        ]),
        list("antecedentes", "Antecedentes", [date("fecha"), text("detalle", "Detalle", { wide: true })]),
        list("alergias", "Alergias", [date("fecha"), text("detalle", "Detalle", { wide: true })]),
        list("medicamentos", "Medicamentos", [
          date("fecha"), text("medicamento", "Medicamento"), text("dosis", "Dosis"), text("frecuencia", "Frecuencia"),
        ]),
        list("signos_vitales", "Signos vitales", [
          date("fecha"),
          text("presion_arterial", "Presión arterial"),
          text("temperatura", "Temperatura (°C)"),
          text("frecuencia_cardiaca", "Frec. cardíaca (lpm)"),
          text("frecuencia_respiratoria", "Frec. respiratoria (rpm)"),
          text("saturacion_o2", "Saturación O2 (%)"),
          text("peso", "Peso (kg)"),
          text("talla", "Talla (cm)"),
        ]),
        group("Examen físico", [
          area("examen_fisico", "Examen físico (general)", { wide: true }),
          ...sistemas(false),
        ]),
        list("consultas", "Consultas", [date("fecha"), text("motivo", "Motivo"), area("notas", "Notas")]),
        list("diagnosticos", "Diagnósticos", [date("fecha"), text("diagnostico", "Diagnóstico"), area("notas", "Notas")]),
        list("tratamientos", "Tratamientos", [date("fecha"), text("tratamiento", "Tratamiento"), area("notas", "Notas")]),
        list("seguimientos", "Seguimientos", [date("fecha"), area("notas", "Notas")]),
        list("actividades", "Actividades donde fue atendido", [
          date("fecha"), text("actividad", "Actividad"), text("lugar", "Lugar"),
        ]),
        firma(),
      ],
    },

    nino_sano: {
      label: "Control de niño sano",
      short: "Niño sano",
      desc: "Control de niño sano: crecimiento, vacunación, desarrollo psicomotor y examen físico.",
      blocks: [
        group("Datos generales", [
          text("nombre", "Nombre", { required: true }),
          select("sexo", "Sexo", ["Femenino", "Masculino"]),
          date("fecha_nacimiento", "Fecha de nacimiento"),
          text("edad", "Edad", { placeholder: "ej. 8 meses, 3 años" }),
          time("hora", "Hora"),
          select("tipo_visita", "Tipo de visita", ["Control sano", "Seguimiento"]),
          select("tipo_control", "Tipo de control", ["0-5 años", "6-10 años"]),
        ]),
        list("crecimiento", "Crecimiento", [
          date("fecha"),
          text("peso", "Peso (kg)"),
          text("talla", "Talla / estatura (cm)"),
          text("perimetro_cefalico", "Perímetro cefálico (cm)"),
          text("imc", "IMC"),
          text("peso_edad", "Peso / edad"),
          text("talla_edad", "Talla / edad"),
          text("pc_edad", "PC / edad"),
        ]),
        group("Motivo de consulta y enfermedad actual", [
          area("consulta_por", "Motivo de consulta", { wide: true }),
          area("presente_enfermedad", "Presente enfermedad", { wide: true }),
        ]),
        group("Antecedentes prenatales y del parto", [
          text("edad_gestacional", "Edad gestacional (semanas)"),
          select("tipo_parto", "Tipo de parto", ["Vaginal", "Cesárea", "Otro"]),
          text("peso_nacer", "Peso al nacer (kg)"),
          text("talla_nacer", "Talla al nacer (cm)"),
          area("complicaciones_parto", "Complicaciones prenatales o del parto", { wide: true }),
        ]),
        group("Antecedentes patológicos", [
          area("ap_medicos", "Médicos"),
          area("ap_quirurgicos", "Quirúrgicos"),
          area("ap_traumaticos", "Traumáticos"),
          area("ap_alergicos", "Alérgicos"),
          area("ap_otros", "Otros"),
        ]),
        group("Antecedentes familiares", [
          area("antecedentes_familiares", "Antecedentes familiares", { wide: true }),
        ]),
        list("alergias", "Alergias", [date("fecha"), text("alergeno", "Alérgeno"), text("reaccion", "Reacción")]),
        group("Alimentación y lactancia", [
          select("lactancia", "Tipo de lactancia", ["Materna exclusiva", "Mixta", "Fórmula", "Ya no recibe lactancia"]),
          text("suplementos", "Suplementos (hierro, vitaminas, etc.)"),
          area("alimentacion_actual", "Alimentación actual", { wide: true }),
        ]),
        list("vacunas", "Esquema de vacunación", [
          date("fecha"), text("vacuna", "Vacuna"), text("dosis", "Dosis"), text("observaciones", "Observaciones", { wide: true }),
        ]),
        group("Desarrollo psicomotor", [
          area("dp_motor_grueso", "Motor grueso"),
          area("dp_motor_fino", "Motor fino"),
          area("dp_lenguaje", "Lenguaje"),
          area("dp_social", "Social y adaptativo"),
        ]),
        group("Examen físico: signos vitales", [
          text("sv_pa", "PA"),
          text("sv_fc", "FC (lpm)"),
          text("sv_fr", "FR (rpm)"),
          text("sv_sato2", "SatO2 (%)"),
          text("sv_temp", "Tº (°C)"),
        ]),
        group("Examen físico: sistemas", sistemas(true)),
        list("diagnosticos", "Diagnósticos", [date("fecha"), text("diagnostico", "Diagnóstico"), area("notas", "Notas")]),
        list("tratamientos", "Tratamientos", [date("fecha"), text("tratamiento", "Tratamiento"), area("notas", "Notas")]),
        group("Plan e indicaciones", [
          area("plan", "Plan", { wide: true }),
          area("indicaciones", "Indicaciones y educación", { wide: true }),
        ]),
        list("seguimientos", "Seguimientos", [date("fecha"), area("notas", "Notas")]),
        group("Próxima cita", [
          date("proxima_cita", "Fecha de la próxima cita"),
          text("proxima_cita_motivo", "Motivo"),
        ]),
        firma(),
      ],
    },

    psicologico: {
      label: "Expediente psicológico",
      short: "Psicológico",
      desc: "Evaluación y seguimiento psicológico: examen mental, pruebas aplicadas, plan terapéutico y notas de sesión.",
      blocks: [
        group("Datos personales", [
          text("nombre", "Nombre", { required: true }),
          select("sexo", "Sexo", ["Femenino", "Masculino", "Otro"]),
          num("edad", "Edad"),
          date("fecha_nacimiento", "Fecha de nacimiento"),
          text("dui", "DUI"),
          text("escolaridad", "Escolaridad"),
          text("ocupacion", "Ocupación"),
          select("estado_civil", "Estado civil", ["Soltero/a", "Casado/a", "Unión libre", "Divorciado/a", "Viudo/a"]),
        ]),
        group("Motivo de consulta", [
          area("consulta_por", "Motivo de consulta", { wide: true }),
          area("historia_problema", "Historia del problema", { wide: true }),
        ]),
        group("Antecedentes", [
          area("ant_personales", "Antecedentes personales"),
          area("ant_familiares", "Antecedentes familiares"),
        ]),
        group("Historia del desarrollo", [
          area("historia_desarrollo", "Historia del desarrollo", { wide: true }),
        ]),
        group("Examen mental", [
          area("em_apariencia", "Apariencia y conducta"),
          area("em_animo", "Estado de ánimo y afecto"),
          area("em_pensamiento", "Pensamiento"),
          area("em_percepcion", "Percepción"),
          area("em_orientacion", "Orientación"),
          area("em_memoria", "Memoria y atención"),
          area("em_lenguaje", "Lenguaje"),
          area("em_juicio", "Juicio e insight"),
        ]),
        list("pruebas", "Pruebas aplicadas", [date("fecha"), text("prueba", "Prueba"), area("resultado", "Resultado")]),
        group("Impresión diagnóstica", [
          area("impresion_diagnostica", "Impresión diagnóstica", { wide: true }),
        ]),
        group("Plan terapéutico", [
          area("plan_terapeutico", "Plan terapéutico", { wide: true }),
        ]),
        list("notas_sesion", "Notas de sesión", [date("fecha"), area("notas", "Notas")]),
        list("seguimientos", "Seguimiento", [date("fecha"), area("notas", "Notas")]),
        firma(),
      ],
    },
  };

  const TYPE_KEYS = Object.keys(TYPES);

  // ---------- Estado ----------
  let currentUser = null;
  let expedientes = [];       // resumen para la lista
  let activeId = null;        // id del expediente abierto
  let activeRecord = null;    // registro completo (aplanado)
  let mode = "view";          // "view" | "choose" | "new" | "edit"
  let draft = null;           // datos en edición

  // ---------- Referencias DOM ----------
  const $ = (id) => document.getElementById(id);
  const gate = $("gate");
  const app = $("app");
  const userChip = $("userChip");
  const logoutBtn = $("logoutBtn");
  const logoImg = $("logoImg");
  const logoSlot = $("logoSlot");
  const searchInput = $("searchInput");
  const typeFilter = $("typeFilter");
  const newBtn = $("newBtn");
  const listEmpty = $("listEmpty");
  const expedienteList = $("expedienteList");
  const detailEmpty = $("detailEmpty");
  const detailContent = $("detailContent");
  const confirmDialog = $("confirmDialog");
  const confirmBody = $("confirmBody");
  const confirmCancel = $("confirmCancel");
  const confirmAccept = $("confirmAccept");
  const toast = $("toast");

  logoImg.addEventListener("error", () => logoSlot.classList.add("no-logo"), { once: true });

  // ---------- Utilidades ----------
  function showToast(message, kind) {
    toast.textContent = message;
    toast.classList.toggle("error", kind === "error");
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== "";

  function formatEdad(edad) {
    if (!hasValue(edad)) return "";
    const s = String(edad).trim();
    return /^\d+(\.\d+)?$/.test(s) ? `${s} años` : s;
  }

  const typeOf = (t) => (TYPES[t] ? t : "general");

  // Nombres de todos los campos y secciones que conoce un tipo de expediente.
  function knownKeys(tipo) {
    const keys = new Set();
    for (const b of TYPES[tipo].blocks) {
      if (b.kind === "fields") b.fields.forEach((f) => keys.add(f.name));
      else keys.add(b.key);
    }
    return keys;
  }

  function emptyDraft(tipo) {
    const d = { id: null, tipo, _extra: {} };
    for (const b of TYPES[tipo].blocks) {
      if (b.kind === "fields") b.fields.forEach((f) => { d[f.name] = ""; });
      else d[b.key] = [];
    }
    return d;
  }

  // Convierte la fila del servidor en un objeto plano: columnas + secciones + "datos".
  function flatten(row) {
    const tipo = typeOf(row.tipo);
    const m = { id: row.id, tipo, updated_at: row.updated_at };
    COLUMN_SCALARS.forEach((k) => { m[k] = row[k] ?? ""; });
    if (tipo === "general") {
      LEGACY_LISTS.forEach((k) => { m[k] = Array.isArray(row[k]) ? row[k] : []; });
    }
    // Lo que esté guardado pero este formato no muestre se conserva intacto
    // (en _extra) para que editar un expediente nunca borre información.
    const known = knownKeys(tipo);
    m._extra = {};
    if (tipo === "general") {
      GENERAL_COLUMNS.forEach((k) => { m[k] = row[k] ?? ""; });
    }
    if (tipo === "nino_sano" && !hasValue(m.medico_nombre) && hasValue((row.datos || {}).medico_responsable)) {
      m.medico_nombre = row.datos.medico_responsable;
    }
    for (const [k, v] of Object.entries(row.datos || {})) {
      if (tipo === "general" && GENERAL_COLUMNS.includes(k)) {
        // La columna manda; solo se usa lo de "datos" si la columna está vacía.
        if (!hasValue(m[k]) && hasValue(v)) m[k] = v;
      } else if (known.has(k)) m[k] = v;
      else m._extra[k] = v;
    }
    return m;
  }

  // Inverso de flatten: separa lo que va en columnas de lo que va en "datos".
  function buildPayload(d) {
    const payload = { tipo: d.tipo, datos: { ...(d._extra || {}) } };
    const put = (key, value) => {
      if (COLUMN_SCALARS.includes(key)) payload[key] = value;
      else if (d.tipo === "general" && GENERAL_COLUMNS.includes(key)) {
        payload[key] = value;
        payload.datos[key] = ""; // limpia copias viejas en "datos": la columna es la fuente
      }
      else if (d.tipo === "general" && LEGACY_LISTS.includes(key)) payload[key] = value;
      else payload.datos[key] = value;
    };
    for (const b of TYPES[d.tipo].blocks) {
      if (b.kind === "fields") b.fields.forEach((f) => put(f.name, d[f.name] ?? ""));
      else put(b.key, (d[b.key] || []).filter((item) => Object.values(item).some(hasValue)));
    }
    return payload;
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 401) {
      redirectToLogin();
      throw new Error("unauthorized");
    }
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok || !data || data.ok === false) {
      throw new Error((data && data.error) || `http_${res.status}`);
    }
    return data;
  }

  function redirectToLogin() {
    window.location.href = "/aula/";
  }

  // ---------- Sesión ----------
  async function checkSession() {
    try {
      const data = await api(API.me);
      currentUser = data.username;
      userChip.textContent = currentUser;
      gate.classList.add("hidden");
      app.classList.remove("hidden");
      await loadList();
    } catch {
      redirectToLogin();
    }
  }

  logoutBtn.addEventListener("click", async () => {
    try { await api(API.logout, { method: "POST" }); } catch { /* seguimos igual */ }
    redirectToLogin();
  });

  // ---------- Lista ----------
  async function loadList() {
    try {
      const data = await api(API.list);
      expedientes = data.expedientes || [];
      renderList();
    } catch {
      listEmpty.textContent = "No se pudo cargar la lista de expedientes.";
      listEmpty.classList.remove("hidden");
    }
  }

  function renderList() {
    const q = searchInput.value.trim().toLowerCase();
    const tipo = typeFilter.value;
    const filtered = expedientes.filter((e) => {
      if (tipo && typeOf(e.tipo) !== tipo) return false;
      return !q || (e.nombre || "").toLowerCase().includes(q) || (e.dui || "").toLowerCase().includes(q);
    });

    expedienteList.innerHTML = "";
    if (filtered.length === 0) {
      listEmpty.textContent = expedientes.length === 0
        ? "Aún no hay expedientes. Crea el primero con “+ Nuevo”."
        : "Sin resultados para tu búsqueda.";
      listEmpty.classList.remove("hidden");
      return;
    }
    listEmpty.classList.add("hidden");

    for (const e of filtered) {
      const t = typeOf(e.tipo);
      const edad = formatEdad(e.edad);
      const li = document.createElement("li");
      li.className = "expediente-item" + (e.id === activeId ? " active" : "");
      li.innerHTML = `
        <div class="expediente-item-top">
          <div class="expediente-item-name">${escapeHtml(e.nombre)}</div>
          <span class="badge badge-${t}">${escapeHtml(TYPES[t].short)}</span>
        </div>
        <div class="expediente-item-meta">
          ${edad ? `<span>${escapeHtml(edad)}</span>` : ""}
          ${e.dui ? `<span>DUI ${escapeHtml(e.dui)}</span>` : ""}
        </div>`;
      li.addEventListener("click", () => openExpediente(e.id));
      expedienteList.appendChild(li);
    }
  }

  searchInput.addEventListener("input", renderList);
  typeFilter.addEventListener("change", renderList);

  newBtn.addEventListener("click", () => {
    activeId = null;
    activeRecord = null;
    draft = null;
    mode = "choose";
    renderList();
    renderDetail();
  });

  // ---------- Abrir un expediente ----------
  async function openExpediente(id) {
    activeId = id;
    mode = "view";
    renderList();
    detailEmpty.classList.add("hidden");
    detailContent.classList.remove("hidden");
    detailContent.innerHTML = `<p style="color:var(--text-low)">Cargando expediente…</p>`;
    try {
      const data = await api(API.item(id));
      activeRecord = flatten(data.expediente);
      draft = null;
      renderDetail();
    } catch {
      showToast("No se pudo cargar el expediente.", "error");
    }
  }

  // ---------- Render del detalle (según el modo) ----------
  function renderDetail() {
    if (mode === "choose") {
      detailEmpty.classList.add("hidden");
      detailContent.classList.remove("hidden");
      detailContent.innerHTML = renderChooser();
      wireChooser();
      return;
    }
    if (mode === "new") {
      detailEmpty.classList.add("hidden");
      detailContent.classList.remove("hidden");
      detailContent.innerHTML = renderForm(draft, true);
      wireForm(true);
      return;
    }
    if (!activeRecord) {
      detailEmpty.classList.remove("hidden");
      detailContent.classList.add("hidden");
      return;
    }
    detailEmpty.classList.add("hidden");
    detailContent.classList.remove("hidden");
    if (mode === "edit") {
      detailContent.innerHTML = renderForm(draft, false);
      wireForm(false);
    } else {
      detailContent.innerHTML = renderView(activeRecord);
      wireView();
    }
  }

  // ---------- Selector de tipo ----------
  function renderChooser() {
    const cards = TYPE_KEYS.map((k) => `
      <button type="button" class="type-card" data-type="${k}">
        <span class="badge badge-${k}">${escapeHtml(TYPES[k].short)}</span>
        <span class="type-card-title">${escapeHtml(TYPES[k].label)}</span>
        <span class="type-card-desc">${escapeHtml(TYPES[k].desc)}</span>
      </button>`).join("");
    return `
      <div class="detail-header"><h1>Nuevo expediente</h1></div>
      <p class="detail-subline">Elige el tipo de expediente que vas a abrir</p>
      <div class="type-grid">${cards}</div>
      <button type="button" class="btn-ghost" id="chooserCancel">Cancelar</button>`;
  }

  function wireChooser() {
    detailContent.querySelectorAll(".type-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft = emptyDraft(btn.getAttribute("data-type"));
        mode = "new";
        renderDetail();
      });
    });
    $("chooserCancel").addEventListener("click", () => {
      mode = "view";
      renderDetail();
    });
  }

  // ---------- Vista de solo lectura ----------
  function renderViewBlock(block, rec, isFirst) {
    const first = isFirst ? " first" : "";

    if (block.kind === "fields" && block.signature) {
      return `<div class="signature-block">${block.fields.map((f) => `
        <div class="info-field">
          <label>${escapeHtml(f.label)}</label>
          <div class="info-value">${escapeHtml(rec[f.name]) || "—"}</div>
        </div>`).join("")}</div>`;
    }

    if (block.kind === "fields") {
      const shown = isFirst ? block.fields : block.fields.filter((f) => hasValue(rec[f.name]));
      const body = shown.length
        ? `<div class="info-grid fields-grid">${shown.map((f) => `
            <div class="info-field${f.wide ? " info-field-wide" : ""}">
              <label>${escapeHtml(f.label)}</label>
              <div class="info-value">${escapeHtml(rec[f.name]) || "—"}</div>
            </div>`).join("")}</div>`
        : `<p class="section-empty-hint">Sin información.</p>`;
      return `
        <div class="section-block${first}">
          <h3 class="section-block-title">${escapeHtml(block.title)}</h3>
          ${body}
        </div>`;
    }

    const items = rec[block.key] || [];
    const entries = items.length
      ? items.map((item) => `
          <div class="entry-card">
            <div class="entry-card-fields">
              ${block.fields.map((f) => `
                <div class="${f.type === "textarea" || f.wide ? "ef-wide" : ""}">
                  <span class="ef-label">${escapeHtml(f.label)}</span>
                  ${escapeHtml(item[f.name]) || "—"}
                </div>`).join("")}
            </div>
          </div>`).join("")
      : `<p class="section-empty-hint">Sin registros.</p>`;
    return `
      <div class="section-block${first}">
        <h3 class="section-block-title">${escapeHtml(block.title)} <span class="section-count">${items.length}</span></h3>
        ${entries}
      </div>`;
  }

  function renderView(rec) {
    const cfg = TYPES[rec.tipo];
    const blocks = cfg.blocks.map((b, i) => renderViewBlock(b, rec, i === 0)).join("");
    return `
      <div class="detail-header">
        <div class="detail-title-row">
          <h1>${escapeHtml(rec.nombre)}</h1>
          <span class="badge badge-${rec.tipo}">${escapeHtml(cfg.short)}</span>
        </div>
        <div class="detail-header-actions">
          <button type="button" class="btn-ghost" id="editBtn">Editar</button>
          <button type="button" class="btn-danger" id="deleteBtn">Eliminar</button>
        </div>
      </div>
      <p class="detail-subline">${escapeHtml(cfg.label)}</p>
      ${blocks}`;
  }

  function wireView() {
    $("editBtn").addEventListener("click", () => {
      mode = "edit";
      draft = { ...emptyDraft(activeRecord.tipo), ...JSON.parse(JSON.stringify(activeRecord)) };
      renderDetail();
    });
    $("deleteBtn").addEventListener("click", () => openConfirm(activeRecord));
  }

  // ---------- Formulario (crear / editar) ----------
  function fieldControl(f, value, attr) {
    const v = escapeHtml(value ?? "");
    if (f.type === "select") {
      const current = String(value ?? "");
      const opts = f.options.map((o) =>
        `<option value="${escapeHtml(o)}"${o === current ? " selected" : ""}>${escapeHtml(o) || "—"}</option>`).join("");
      return `<select ${attr}="${f.name}">${opts}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea ${attr}="${f.name}" rows="2">${v}</textarea>`;
    }
    return `<input type="${f.type}" ${attr}="${f.name}" value="${v}"${f.required ? " required" : ""}${f.placeholder ? ` placeholder="${escapeHtml(f.placeholder)}"` : ""}>`;
  }

  function renderEntryRow(block, item, idx) {
    const fields = block.fields.map((f) => `
      <div class="field entry-field${f.type === "textarea" || f.wide ? " field-wide" : ""}">
        <label>${escapeHtml(f.label)}</label>
        ${fieldControl(f, item[f.name], "data-field")}
      </div>`).join("");
    return `
      <div class="entry-card" data-idx="${idx}">
        <div class="entry-card-view">
          <div class="entry-card-edit-grid">${fields}</div>
          <button type="button" class="entry-remove-btn" data-remove="${idx}" title="Eliminar registro" aria-label="Eliminar registro">✕</button>
        </div>
      </div>`;
  }

  function renderFormBlock(block, d, isFirst) {
    const first = isFirst ? " first" : "";

    if (block.kind === "fields" && block.signature) {
      return `<div class="signature-block">${block.fields.map((f) => `
        <div class="field">
          <label>${escapeHtml(f.label)}</label>
          ${fieldControl(f, d[f.name], "data-key")}
        </div>`).join("")}</div>`;
    }

    if (block.kind === "fields") {
      const fields = block.fields.map((f) => `
        <div class="field${f.wide ? " field-wide" : ""}">
          <label>${escapeHtml(f.label)}${f.required ? " *" : ""}</label>
          ${fieldControl(f, d[f.name], "data-key")}
        </div>`).join("");
      return `
        <div class="section-block${first}">
          <h3 class="section-block-title">${escapeHtml(block.title)}</h3>
          <div class="info-grid fields-grid">${fields}</div>
        </div>`;
    }

    const items = d[block.key] || [];
    return `
      <div class="section-block${first}" data-list="${block.key}">
        <h3 class="section-block-title">${escapeHtml(block.title)} <span class="section-count">${items.length}</span></h3>
        <div class="entries-wrap">${items.map((item, idx) => renderEntryRow(block, item, idx)).join("")}</div>
        <button type="button" class="btn-add-entry" data-add="${block.key}">+ Agregar registro</button>
      </div>`;
  }

  function renderForm(d, isNew) {
    const cfg = TYPES[d.tipo];
    const blocks = cfg.blocks.map((b, i) => renderFormBlock(b, d, i === 0)).join("");
    return `
      <form id="expedienteForm">
        <div class="detail-header">
          <div class="detail-title-row">
            <h1>${isNew ? "Nuevo expediente" : escapeHtml(d.nombre || "Editar expediente")}</h1>
            <span class="badge badge-${d.tipo}">${escapeHtml(cfg.short)}</span>
          </div>
          <div class="detail-header-actions">
            <button type="button" class="btn-ghost" id="cancelBtn">Cancelar</button>
          </div>
        </div>
        <p class="detail-subline">${escapeHtml(cfg.label)}</p>
        ${blocks}
        <div class="form-actions">
          <button type="button" class="btn-ghost" id="cancelBtn2">Cancelar</button>
          <button type="submit" class="btn-primary" id="saveBtn">Guardar expediente</button>
        </div>
      </form>`;
  }

  // Vuelca lo que hay escrito en pantalla a `draft`, para no perderlo al
  // volver a dibujar el formulario (agregar / quitar registros).
  function syncDraftFromForm(form) {
    form.querySelectorAll("[data-key]").forEach((el) => {
      draft[el.getAttribute("data-key")] = el.value;
    });
    form.querySelectorAll(".section-block[data-list]").forEach((block) => {
      const key = block.getAttribute("data-list");
      draft[key] = Array.from(block.querySelectorAll(".entry-card")).map((card) => {
        const item = {};
        card.querySelectorAll("[data-field]").forEach((el) => {
          item[el.getAttribute("data-field")] = el.value;
        });
        return item;
      });
    });
  }

  function wireForm(isNew) {
    const form = $("expedienteForm");

    function cancelEdit() {
      mode = "view";
      if (isNew) {
        activeId = null;
        activeRecord = null;
        renderList();
      }
      renderDetail();
    }
    $("cancelBtn").addEventListener("click", cancelEdit);
    $("cancelBtn2").addEventListener("click", cancelEdit);

    // Agregar / quitar registros de las secciones repetibles
    form.addEventListener("click", (ev) => {
      const addBtn = ev.target.closest("[data-add]");
      if (addBtn) {
        const key = addBtn.getAttribute("data-add");
        syncDraftFromForm(form);
        draft[key].push({});
        renderDetail();
        const last = detailContent.querySelector(`.section-block[data-list="${key}"] .entry-card:last-child input, .section-block[data-list="${key}"] .entry-card:last-child textarea`);
        if (last) last.focus();
        return;
      }
      const rmBtn = ev.target.closest("[data-remove]");
      if (rmBtn) {
        const key = rmBtn.closest(".section-block").getAttribute("data-list");
        const idx = Number(rmBtn.getAttribute("data-remove"));
        const y = window.scrollY;
        syncDraftFromForm(form);
        draft[key].splice(idx, 1);
        renderDetail();
        window.scrollTo(0, y);
      }
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      syncDraftFromForm(form);

      if (!hasValue(draft.nombre)) {
        showToast("El nombre es obligatorio.", "error");
        return;
      }

      const saveBtn = $("saveBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando…";

      try {
        const payload = JSON.stringify(buildPayload(draft));
        if (isNew) {
          const res = await api(API.list, { method: "POST", body: payload });
          showToast("Expediente creado.");
          await loadList();
          await openExpediente(res.id);
        } else {
          await api(API.item(activeId), { method: "PUT", body: payload });
          showToast("Expediente actualizado.");
          await loadList();
          await openExpediente(activeId);
        }
      } catch {
        showToast("No se pudo guardar el expediente.", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar expediente";
      }
    });
  }

  // ---------- Confirmación de borrado ----------
  let pendingDelete = null;

  function openConfirm(rec) {
    pendingDelete = rec;
    confirmBody.textContent = `¿Eliminar el expediente de ${rec.nombre}? Esta acción no se puede deshacer.`;
    confirmDialog.classList.remove("hidden");
  }

  confirmCancel.addEventListener("click", () => {
    pendingDelete = null;
    confirmDialog.classList.add("hidden");
  });

  confirmAccept.addEventListener("click", async () => {
    if (!pendingDelete) return;
    const rec = pendingDelete;
    pendingDelete = null;
    confirmDialog.classList.add("hidden");
    try {
      await api(API.item(rec.id), { method: "DELETE" });
      showToast("Expediente eliminado.");
      if (activeId === rec.id) {
        activeId = null;
        activeRecord = null;
        mode = "view";
        renderDetail();
      }
      await loadList();
    } catch {
      showToast("No se pudo eliminar el expediente.", "error");
    }
  });

  // ---------- Arranque ----------
  checkSession();
})();
