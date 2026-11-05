-- Migración 001: tipos de expediente (general | nino_sano | psicologico)
-- Se corre UNA sola vez sobre la base que ya tienes:
--   npx wrangler d1 execute mdm-expedientes --remote --file=./worker/migration-001-tipos.sql
--
-- Los expedientes que ya existen quedan automáticamente como "general".

ALTER TABLE expedientes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'general';
ALTER TABLE expedientes ADD COLUMN datos TEXT NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_expedientes_tipo ON expedientes(tipo);
