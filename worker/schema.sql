-- Esquema D1 para expedientes clínicos — Médicos del Mañana
-- Aplica con: npx wrangler d1 execute mdm-expedientes --file=./worker/schema.sql
--
-- NOTA: si ya tienes esta tabla creada en producción, este archivo por sí
-- solo NO va a agregar las columnas nuevas (CREATE TABLE IF NOT EXISTS no
-- altera tablas existentes). Usa migration.sql (incluido junto a este
-- archivo) para aplicar los cambios a una base de datos ya existente.

CREATE TABLE IF NOT EXISTS expedientes (
  id                 TEXT PRIMARY KEY,
  nombre             TEXT NOT NULL,
  sexo               TEXT,
  edad               INTEGER,
  fecha_nacimiento   TEXT,
  dui                TEXT,
  consulta_por       TEXT,
  hora_inicio_hc     TEXT,    -- hora en que inició la Historia Clínica (ej. "14:30")
  presente_enfermedad TEXT,   -- historia de la enfermedad actual / padecimiento actual
  examen_fisico      TEXT,    -- notas del examen físico de esa consulta

  -- Cada una de estas columnas guarda un arreglo JSON de entradas
  -- (fecha + detalle estructurado). Se leen/escriben como texto y se
  -- parsean en el Worker; D1 no tiene tipo JSON nativo pero SQLite
  -- permite guardarlo como TEXT sin problema.
  antecedentes       TEXT DEFAULT '[]',
  alergias           TEXT DEFAULT '[]',
  medicamentos       TEXT DEFAULT '[]',
  signos_vitales     TEXT DEFAULT '[]',
  consultas          TEXT DEFAULT '[]',
  diagnosticos       TEXT DEFAULT '[]',
  tratamientos       TEXT DEFAULT '[]',
  seguimientos       TEXT DEFAULT '[]',
  actividades        TEXT DEFAULT '[]',

  created_by         TEXT,
  created_at         INTEGER,
  updated_at         INTEGER
);

CREATE INDEX IF NOT EXISTS idx_expedientes_nombre ON expedientes(nombre);
CREATE INDEX IF NOT EXISTS idx_expedientes_dui ON expedientes(dui);
CREATE INDEX IF NOT EXISTS idx_expedientes_updated ON expedientes(updated_at);
