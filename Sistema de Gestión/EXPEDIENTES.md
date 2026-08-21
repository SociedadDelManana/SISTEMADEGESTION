# Expedientes — Fase 2

Añade a `thechosenone` (y a cualquier usuario con sesión válida) acceso a un
panel protegido en `/aula/panel/` donde puede crear, ver, editar y borrar
expedientes clínicos.

## Archivos nuevos

```
worker/
  expedientes.js   → CRUD de expedientes, protegido por sesión
  schema.sql       → esquema de la tabla en Cloudflare D1
aula/panel/
  index.html       → interfaz del panel
  panel.css        → estilos (misma identidad visual que el login)
  panel.js         → verifica sesión, lista, crea, edita, borra
```

## 1. Crear la base de datos D1

KV no es ideal para datos estructurados como expedientes (lo mencionaba el
README original), así que esta parte usa **D1**, la base SQL de Cloudflare.

```bash
npx wrangler d1 create mdm-expedientes
```

Copia el `database_id` que te da y agrégalo a tu `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mdm-expedientes"
database_id = "PEGAR_ID_AQUI"
```

## 2. Aplicar el esquema

```bash
npx wrangler d1 execute mdm-expedientes --remote --file=./worker/schema.sql
```

(usa `--local` primero si quieres probarlo con `wrangler dev` antes de tocar producción)

## 3. Conectar la ruta en tu Worker principal

En tu `src/index.js`, junto a lo que ya tenías para `/aula/api/`:

```js
import { handleLoginRoutes } from "./worker/login-handler.js";
import { handleExpedientesRoutes } from "./worker/expedientes.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/aula/api/expedientes")) {
      return handleExpedientesRoutes(request, env, url);
    }

    if (url.pathname.startsWith("/aula/api/")) {
      return handleLoginRoutes(request, env, url);
    }

    // ... resto de tu enrutamiento existente
  }
};
```

El orden importa: la ruta de expedientes es más específica que
`/aula/api/`, así que debe revisarse primero.

## 4. Subir la carpeta `aula/panel/`

Se sirve como archivo estático igual que el resto de `aula/` — no necesita
lógica especial. Solo asegúrate de que quede en la ruta `/aula/panel/`.

## 5. Desplegar

```bash
npx wrangler deploy
```

## Cómo funciona la protección del panel

`panel.js` llama a `GET /aula/api/me` apenas carga la página. Si no hay una
cookie de sesión válida, redirige de inmediato a `/aula/` (el login) — el
panel nunca llega a mostrarse sin sesión. Cada llamada del CRUD
(`/aula/api/expedientes...`) también exige la misma cookie `mdm_session`
en el backend, así que no basta con llegar a la URL del panel: cualquier
intento de leer o modificar expedientes sin sesión responde `401`.

## Estructura de cada expediente

**Información personal** (campos únicos): nombre, sexo, edad, fecha de
nacimiento, DUI, consulta/consultó por.

**Secciones repetibles** (se pueden agregar tantos registros como se
necesite, cada uno con su fecha):

- Antecedentes
- Alergias
- Medicamentos (medicamento, dosis, frecuencia)
- Signos vitales (presión arterial, temperatura, frec. cardíaca, frec.
  respiratoria, saturación de O2, peso, talla)
- Consultas (motivo, notas)
- Diagnósticos (diagnóstico, notas)
- Tratamientos (tratamiento, notas)
- Seguimientos (notas)
- Actividades donde fue atendido (actividad, lugar)

## Qué falta (siguientes fases, cuando me digas)

- Roles (admin vs. profesional) para limitar quién puede borrar expedientes.
- Historial de cambios / auditoría por expediente.
- Búsqueda avanzada (por diagnóstico, rango de fechas, etc.).
- Exportar un expediente a PDF.
