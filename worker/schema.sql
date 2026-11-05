-- Esquema D1 para expedientes clínicos — Médicos del Mañana
-- Solo para instalaciones NUEVAS. Si ya tienes la tabla creada,
-- usa migration-001-tipos.sql en su lugar.

CREATE TABLE IF NOT EXISTS expedientes (
  id                 TEXT PRIMARY KEY,
  tipo               TEXT NOT NULL DEFAULT 'general',  -- general | nino_sano | psicologico
  nombre             TEXT NOT NULL,
  sexo               TEXT,
  edad               INTEGER,   -- SQLite también acepta texto aquí (ej. "8 meses")
  fecha_nacimiento   TEXT,
  dui                TEXT,
  consulta_por       TEXT,

  -- Secciones repetibles de Medicina general (arreglos JSON)
  antecedentes       TEXT DEFAULT '[]',
  alergias           TEXT DEFAULT '[]',
  medicamentos       TEXT DEFAULT '[]',
  signos_vitales     TEXT DEFAULT '[]',
  consultas          TEXT DEFAULT '[]',
  diagnosticos       TEXT DEFAULT '[]',
  tratamientos       TEXT DEFAULT '[]',
  seguimientos       TEXT DEFAULT '[]',
  actividades        TEXT DEFAULT '[]',

  -- Todo lo específico de cada tipo (niño sano, psicológico, y los campos
  -- nuevos de medicina general) vive aquí como un objeto JSON.
  datos              TEXT NOT NULL DEFAULT '{}',

  created_by         TEXT,
  created_at         INTEGER,
  updated_at         INTEGER
);

CREATE INDEX IF NOT EXISTS idx_expedientes_nombre ON expedientes(nombre);
CREATE INDEX IF NOT EXISTS idx_expedientes_dui ON expedientes(dui);
CREATE INDEX IF NOT EXISTS idx_expedientes_updated ON expedientes(updated_at);
CREATE INDEX IF NOT EXISTS idx_expedientes_tipo ON expedientes(tipo);
