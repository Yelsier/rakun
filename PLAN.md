# Reemplazar Proxies Con Hooks Y Dynamic Data

## Resumen

- Eliminar `proxies` por completo de `rakunBootstrap`, exports públicos y pipeline web/manager.
- Añadir hooks de `ContentType` para mutaciones DB y salida web.
- Añadir dynamic data opt-in tipo Elementor para campos y listas, resuelto en vivo en web/preview.
- Mantener datos editables en manager como fuente canónica; web resuelve bindings antes de traducir y validar módulos.

## APIs Públicas

- `ContentType` acepta `hooks` y método encadenable `withHooks(hooks)`.
- Hooks v1:
  - `beforeInsert({ data, context })`
  - `afterInsert({ document, input, context })`
  - `beforeUpdate({ id, data, current, context })`
  - `afterUpdate({ id, document, previous, input, context })`
  - `beforeUpdateMany({ filter, data, context })`
  - `afterUpdateMany({ filter, data, updatedCount, context })`
  - `beforeDelete({ filter, documents, context })`
  - `afterDelete({ filter, documents, context })`
  - `onGet({ data, context })`
- `context` incluye `db`, `rawDB`, `contentType`, `operation`, `actorId`, `reason`, `requestContext?`, `locale?`, `route?`.
- `ContentType.enableDynamicData(true | { fields?: string[]; lists?: string[] })`.
- Nuevo metadata persistido: `_bindings`, permitido en input/db/populated, omitido del output web final.

## Cambios Clave

- Mutations DB:
  - Ejecutar hooks en `db.create/update/updateMany/delete/upsert`.
  - `upsert` delega en insert/update según exista documento.
  - Errores de hooks abortan operación.
  - Mover hash de `ManagerUser.password` a hooks internos de `ManagerUser`; `updatePassword` pasa password raw y deja que el hook hashee.
- Request context:
  - Crear AsyncLocalStorage para hooks.
  - Next, Express y tRPC envuelven `operation.resolve/onSuccess` con ese contexto.
  - Llamadas directas a DB fuera de request ejecutan hooks con `requestContext` undefined.
- Output web:
  - Sustituir `ProxyOutput/runProxyContext/getProxyContext` por resolver: populate links/relations -> dynamic data -> `onGet` -> translate -> strip `_bindings` -> validate.
  - `onGet` corre en web page, preview, layout modules e iterator modules; no transforma raw `db.get/list`.
- Dynamic data:
  - Manager muestra selector solo si `enableDynamicData` permite ese campo/lista.
  - Field binding guarda `{ contentType, id, path | virtual: 'href', routeKey? }`.
  - List binding guarda `{ contentType, query, itemName, map }`.
  - Query v1 soporta content type, `limit`, `sort`, filtros seguros existentes y excluye trash/draft/trash visibility en web.
  - `href` es campo virtual para content types con ruta.
  - Si source falta, usar valor manual guardado como fallback y registrar trace.
- Remoción proxies:
  - Borrar `core/src/api/proxies`.
  - Quitar `proxies` de bootstrap, README y exports de `core`/reexports de `next`.
  - No compat temporal.

## Tests

- Core:
  - Hooks ejecutan orden correcto en insert/update/updateMany/delete/upsert.
  - Context incluye actor/request cuando viene de manager operation y queda vacío en DB directo.
  - `ManagerUser` hashea password en create/update directo y vía manager.
  - `onGet` corre después de populate/dynamic y antes de traducción.
- Dynamic data:
  - `enableDynamicData` se codifica para manager.
  - `_bindings` permite guardar campos/listas requeridas enlazadas.
  - Resolver cubre field binding, list binding, filtros/sort/limit y virtual `href`.
  - Missing source usa fallback.
- Integración:
  - `manager.get` conserva `_bindings`.
  - `web.page` y `web.previewPage` resuelven bindings vivos.
  - Build rompe si queda import/export de proxies.
- Comandos:
  - `bun run --filter @rakun-kit/core test`
  - `bun run build:core`
  - `bun run build:manager-react`
  - `bun run build:next`

## Supuestos

- Cambio breaking aceptado: proyectos con proxies deben migrar a hooks/dynamic data.
- `onGet` reemplaza output proxies solo en pipeline web/preview, no en lecturas DB internas.
- Bindings se resuelven en vivo; no se materializan al guardar.
- Dynamic data v1 no cubre agregaciones complejas ni relaciones inversas; esos casos quedan para hooks.
