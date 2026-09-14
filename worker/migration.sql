-- Migración: agrega "Hora de Inicio de la HC" y "Examen Físico" a una
-- base de datos D1 que ya existe (con datos).
--
-- Aplica con:
--   npx wrangler d1 execute mdm-expedientes --remote --file=./worker/migration.sql
--
-- (usa --local en vez de --remote si primero quieres probarlo con
-- `wrangler dev`)

ALTER TABLE expedientes ADD COLUMN hora_inicio_hc TEXT;
ALTER TABLE expedientes ADD COLUMN examen_fisico TEXT;
