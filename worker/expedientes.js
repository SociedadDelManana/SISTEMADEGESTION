import * as auth from "./auth.js";

// Secciones repetibles históricas de Medicina general. Siguen en sus propias
// columnas para no tocar los expedientes que ya están guardados.
export const LIST_FIELDS = [
  "antecedentes",
  "alergias",
  "medicamentos",
  "signos_vitales",
  "consultas",
  "diagnosticos",
  "tratamientos",
  "seguimientos",
  "actividades",
];

export const TIPOS = ["general", "nino_sano", "psicologico"];

// Columnas propias de Medicina general (existen en la base original).
// Se guardan en su columna, igual que siempre, con su largo máximo.
const GENERAL_COLUMNS = {
  fecha_consulta: 20,
  hora_inicio_hc: 10,
  presente_enfermedad: 3000,
  examen_fisico: 3000,
  medico_nombre: 200,
  numero_junta: 50,
};

// Tope de tamaño del bloque "datos" de un expediente.
const MAX_DATOS_BYTES = 200 * 1024;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function parseJson(text, fallback) {
  try {
    const value = JSON.parse(text);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeListField(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
}

function sanitizeText(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// La edad puede ser un número (años) o texto corto (ej. "8 meses").
function normalizeEdad(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().slice(0, 30);
  if (!s) return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : s;
}

function cleanDatos(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function rowToExpediente(row) {
  const out = { ...row, tipo: row.tipo || "general" };
  for (const field of LIST_FIELDS) out[field] = parseJson(row[field], []);
  out.datos = parseJson(row.datos, {});
  return out;
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

export async function handleExpedientesRoutes(request, env, url) {
  // Toda esta ruta exige una sesión válida (cookie mdm_session httpOnly).
  const session = await auth.getSession(env, request);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    return await route(request, env, url, session);
  } catch (err) {
    // Se ve en `npx wrangler tail`; al navegador solo le llega un error genérico.
    console.error("expedientes error:", err && err.message ? err.message : err);
    return json({ ok: false, error: "server_error" }, 500);
  }
}

async function route(request, env, url, session) {
  const parts = url.pathname.split("/").filter(Boolean); // ["aula","api","expedientes", ":id"?]
  const id = parts[3] || null;

  // ---------- LISTAR ----------
  if (!id && request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT id, tipo, nombre, sexo, edad, fecha_nacimiento, dui, consulta_por,
              fecha_consulta, hora_inicio_hc, updated_at
       FROM expedientes ORDER BY updated_at DESC`
    ).all();
    return json({ ok: true, expedientes: results });
  }

  // ---------- CREAR ----------
  if (!id && request.method === "POST") {
    const body = await readBody(request);
    if (!body) return json({ ok: false, error: "bad_request" }, 400);

    const tipo = body.tipo === undefined ? "general" : body.tipo;
    if (!TIPOS.includes(tipo)) return json({ ok: false, error: "invalid_tipo" }, 400);

    const nombre = sanitizeText(body.nombre, 200);
    if (!nombre) return json({ ok: false, error: "missing_nombre" }, 400);

    const datosJson = JSON.stringify(cleanDatos(body.datos));
    if (new TextEncoder().encode(datosJson).length > MAX_DATOS_BYTES) {
      return json({ ok: false, error: "too_large" }, 413);
    }

    const now = Date.now();
    const newId = crypto.randomUUID();

    const columns = [
      "id", "tipo", "nombre", "sexo", "edad", "fecha_nacimiento", "dui", "consulta_por",
      ...Object.keys(GENERAL_COLUMNS),
      ...LIST_FIELDS,
      "datos", "created_by", "created_at", "updated_at",
    ];
    const values = [
      newId,
      tipo,
      nombre,
      sanitizeText(body.sexo, 30),
      normalizeEdad(body.edad),
      sanitizeText(body.fecha_nacimiento, 20),
      sanitizeText(body.dui, 20),
      sanitizeText(body.consulta_por, 500),
      ...Object.entries(GENERAL_COLUMNS).map(([c, max]) => sanitizeText(body[c], max)),
      ...LIST_FIELDS.map((f) => JSON.stringify(normalizeListField(body[f]))),
      datosJson,
      session.username,
      now,
      now,
    ];

    await env.DB.prepare(
      `INSERT INTO expedientes (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`
    )
      .bind(...values)
      .run();

    return json({ ok: true, id: newId });
  }

  // ---------- OBTENER UNO ----------
  if (id && request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM expedientes WHERE id = ?").bind(id).first();
    if (!row) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, expediente: rowToExpediente(row) });
  }

  // ---------- ACTUALIZAR ----------
  if (id && request.method === "PUT") {
    const body = await readBody(request);
    if (!body) return json({ ok: false, error: "bad_request" }, 400);

    const existing = await env.DB.prepare("SELECT id, datos FROM expedientes WHERE id = ?").bind(id).first();
    if (!existing) return json({ ok: false, error: "not_found" }, 404);

    const nombre = sanitizeText(body.nombre, 200);
    if (!nombre) return json({ ok: false, error: "missing_nombre" }, 400);

    // El tipo de un expediente no cambia una vez creado.
    const assignments = ["nombre", "sexo", "edad", "fecha_nacimiento", "dui", "consulta_por"];
    const values = [
      nombre,
      sanitizeText(body.sexo, 30),
      normalizeEdad(body.edad),
      sanitizeText(body.fecha_nacimiento, 20),
      sanitizeText(body.dui, 20),
      sanitizeText(body.consulta_por, 500),
    ];

    // Columnas de Medicina general: solo se tocan si vienen en la petición
    // (guardar un expediente de niño sano o psicológico no las modifica).
    for (const [c, max] of Object.entries(GENERAL_COLUMNS)) {
      if (body[c] !== undefined) {
        assignments.push(c);
        values.push(sanitizeText(body[c], max));
      }
    }

    // Solo se tocan las secciones que realmente vienen en la petición.
    for (const f of LIST_FIELDS) {
      if (body[f] !== undefined) {
        assignments.push(f);
        values.push(JSON.stringify(normalizeListField(body[f])));
      }
    }

    if (body.datos !== undefined) {
      // MEZCLA con lo ya guardado: un campo que el panel no envía (porque se quitó
      // del formulario o el navegador tiene una versión vieja) se conserva tal cual.
      // Para vaciar un campo a propósito, el panel envía "" y eso sí lo sobrescribe.
      const merged = { ...parseJson(existing.datos, {}), ...cleanDatos(body.datos) };
      const datosJson = JSON.stringify(merged);
      if (new TextEncoder().encode(datosJson).length > MAX_DATOS_BYTES) {
        return json({ ok: false, error: "too_large" }, 413);
      }
      assignments.push("datos");
      values.push(datosJson);
    }

    assignments.push("updated_at");
    values.push(Date.now());
    values.push(id);

    await env.DB.prepare(
      `UPDATE expedientes SET ${assignments.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return json({ ok: true });
  }

  // ---------- BORRAR ----------
  if (id && request.method === "DELETE") {
    const existing = await env.DB.prepare("SELECT id FROM expedientes WHERE id = ?").bind(id).first();
    if (!existing) return json({ ok: false, error: "not_found" }, 404);
    await env.DB.prepare("DELETE FROM expedientes WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: "not_found" }, 404);
}
