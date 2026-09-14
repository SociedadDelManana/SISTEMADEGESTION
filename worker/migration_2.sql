-- Migración incremental: agrega "Presente Enfermedad" a la base de
-- datos D1. Úsalo SOLO si ya habías corrido migration.sql anteriormente
-- (el que agregó hora_inicio_hc y examen_fisico).
--
-- Si NO has corrido ninguna migración todavía, ignora este archivo y
-- usa migration.sql seguido de este (en ese orden), o simplemente
-- agrega esta misma línea al final de migration.sql y corre solo ese.
--
-- Aplica con:
--   npx wrangler d1 execute mdm-expedientes --remote --file=./worker/migration_2.sql

ALTER TABLE expedientes ADD COLUMN presente_enfermedad TEXT;
