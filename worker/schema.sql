CREATE TABLE IF NOT EXISTS expedientes (
  id                 TEXT PRIMARY KEY,
  nombre             TEXT NOT NULL,
  sexo               TEXT,
  edad               INTEGER,
  fecha_nacimiento   TEXT,
  dui                TEXT,
  consulta_por       TEXT,
  fecha_consulta     TEXT,
  hora_inicio_hc     TEXT,
  presente_enfermedad TEXT,
  examen_fisico      TEXT,
  medico_nombre      TEXT,
  numero_junta       TEXT,

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
