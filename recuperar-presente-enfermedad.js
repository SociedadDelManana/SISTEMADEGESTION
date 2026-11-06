// Genera un archivo SQL que devuelve "Presente enfermedad" a los expedientes
// generales donde hoy está vacío, tomando el texto de una copia antigua.
//
// Uso:
//   node recuperar-presente-enfermedad.js antiguo.json [clave]
// - antiguo.json : salida de `wrangler d1 execute ... --json` sobre la copia antigua
//                  (columnas: id, datos)
// - clave        : nombre del campo en la copia antigua (por defecto presente_enfermedad)
//
// Solo rellena donde hoy está vacío: NUNCA pisa lo que ya esté escrito.

const fs = require("fs");

const file = process.argv[2];
const oldKey = process.argv[3] || "presente_enfermedad";
if (!file) { console.error("Uso: node recuperar-presente-enfermedad.js antiguo.json [clave]"); process.exit(1); }

let raw = JSON.parse(fs.readFileSync(file, "utf8"));
const rows = (Array.isArray(raw) ? raw.flatMap((r) => r.results || []) : raw.results || []);
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const lines = ["-- Recuperación de Presente enfermedad (solo rellena donde está vacío)"];
let n = 0;
for (const r of rows) {
  let datos = {};
  try { datos = typeof r.datos === "string" ? JSON.parse(r.datos) : (r.datos || {}); } catch {}
  const value = datos[oldKey];
  if (typeof value !== "string" || !value.trim()) continue;
  lines.push(
    `UPDATE expedientes SET datos = json_set(datos, '$.presente_enfermedad', ${q(value)}) ` +
    `WHERE id = ${q(r.id)} AND COALESCE(json_extract(datos, '$.presente_enfermedad'), '') = '';`
  );
  n++;
}
fs.writeFileSync("restaurar.sql", lines.join("\n") + "\n");
console.log(`Listo: ${n} expediente(s) con texto recuperable -> restaurar.sql`);
