# AutoOfertas AR

Buscador personal de autos en Argentina: Next.js 16, Cloudflare Workers/OpenNext y D1. Los scrapers Node en `scripts/` son la única vía de ingestión; el Worker de `packages/scraper/` recalcula puntajes con el algoritmo compartido. No requiere cuentas para usar favoritos: se guardan en el navegador.

## Desarrollo local

Requisitos: Node 22, pnpm 10.12.1 y Python 3 (test de migraciones).

```sh
pnpm install --frozen-lockfile
pnpm seed
pnpm dev
```

`seed` aplica migraciones y carga **datos sintéticos exclusivamente en D1 local**. La cotización 1000 de esas fixtures es ficticia. No consulta portales ni escribe en la nube. El desarrollo usa la DB local de `web/.wrangler/`; no hay bindings remotos. Las imágenes de las fixtures pueden no existir; la UI muestra un reemplazo.

```sh
pnpm check           # lint, tipos (web + Worker + scripts), tests
pnpm build           # build Next.js
```

El workflow `check.yml` ejecuta los mismos chequeos. El build puede requerir red para las fuentes de Google usadas por Next.

## Configuración de scraping

Crear `.env` en la raíz (ignorado por Git) con:

```dotenv
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
D1_DATABASE_ID=...
USD_RATE=...
USD_RATE_DATE=2026-10-23
# Opcionales:
TARGET_BRANDS=Toyota,Honda
TARGET_MODELS=Corolla,Civic
TARGET_YEAR_MIN=2018
TARGET_KM_MAX=100000
ENRICH_LIMIT=10
SCRAPE_CACHE_DIR=.cache/scraping
SCRAPE_CACHE_MINUTES=60
```

`USD_RATE` debe ser una cotización positiva elegida por vos; no se descarga ni se inventa un valor. La fecha se registra con la conversión. Configurar también `USD_RATE` y `USD_RATE_DATE` en las variables de GitHub Actions. `TARGET_BRANDS` acota las búsquedas de MercadoLibre antes de descargar; el resto de criterios filtra los candidatos antes de persistir/enriquecer. En las otras fuentes el filtrado es posterior al descubrimiento.

```sh
pnpm scrape:ml
pnpm scrape:kavak
pnpm scrape:autocosmos
pnpm scrape:deruedas
pnpm scrape:all
```

Estos comandos **escriben en la base remota configurada**. Respetar el acceso permitido por cada fuente. ML y Kavak pueden no aceptar IPs de nube; ante un bloqueo se detiene la ejecución, no se intenta eludirlo. Los cron de GitHub solo cubren deRuedas y Autocosmos; el workflow ML es manual. Las ejecuciones se serializan dentro del workflow. Evitar superponer ejecuciones residenciales con las de CI o mantenimiento.

Cada petición tiene timeout de 30 segundos y hasta tres intentos de la misma URL para errores transitorios. Se respeta `Retry-After` hasta 60 segundos; si exige más, se detiene. El caché opcional permite reutilizar páginas recientes tras una interrupción; no se utiliza para escrituras ni para reverificar detalles. El caché no indica disponibilidad actual.

Las publicaciones se descubren primero y se enriquecen después hasta `ENRICH_LIMIT`: datos estructurados y campos explícitos del detalle, sin inventar atributos. Estructuras de página no reconocidas se conservan sin actualizar el precio. `scrape_runs` registra encontrados, excluidos, escritos, errores y éxito. Una ejecución parcial no se reporta como exitosa. Los portales pueden cambiar; las fixtures prueban el parser, no garantizan acceso en vivo.

## Calidad, scoring e historial

- `price_kind`: `total`, `deposit`, `installment` o `unknown`. Búsqueda normal, destacados y rankings excluyen precios que no sean totales. La búsqueda permite incluirlos explícitamente, con etiquetas; sus calculadoras quedan deshabilitadas.
- `km_known` separa kilometraje desconocido de cero sin romper la columna SQLite histórica. Solo una indicación explícita de 0 km debería determinar condición nueva; fuentes de usados pueden incluir unidades sin rodaje y necesitan confirmación.
- `created_at` conserva primera detección y `updated_at` última observación. No conocemos necesariamente la fecha de publicación original.
- `price_history` usa triggers de inserción/cambio en **importe y moneda original**. Cambiar cotización no genera una falsa baja. Los registros viejos comienzan su historial en la próxima observación/cambio.
- Scoring compartido: misma marca/modelo/versión normalizada, condición, año ±2, kilometraje comparable, compatibilidad de combustible/transmisión, mediana, exclusión de extremos, mínimo tres comparables independientes. No hay premio por precio/km recorrido, antigüedad, vendedor ni completitud. Sin muestra suficiente, puntaje 0 y “Sin calificar”.
- La normalización de versión es conservadora; aún no hay catálogo completo de generaciones/equipamientos. Es preferible no calificar a mezclar generaciones desconocidas.
- `duplicate_group` identifica coincidencias de versión/año/km/provincia; la UI muestra **posibles** duplicados. No fusiona ni borra unidades.
- Los datos inferidos se indican. Ser concesionaria no equivale a vehículo verificado.
- `cleanup` informa registros sin observar hace siete días y cierra ejecuciones interrumpidas. **No elimina avisos ni historial por ausencia en una búsqueda parcial.** No confirma ventas automáticamente.

## Mi garage, comparación y costos

Favoritos, descartados, notas, comparación de hasta tres vehículos y preferencias se conservan en `localStorage`. No se sincronizan entre dispositivos. El respaldo JSON permite conservar una copia y pasar favoritos al comando de reverificación.

Las búsquedas guardadas y bajas de favoritos se revisan al pulsar **Revisar novedades y bajas** en Mi garage. Para búsquedas se revisan los últimos 60 resultados y se explicita ese límite. Las alertas son locales dentro de la app: **no corren con la página cerrada y no envían email, Telegram ni notificaciones push**.

Avisos de Marketplace u otros sitios se pueden añadir por enlace y datos manuales. No hay scraper automático de Facebook ni credenciales/cookies de esa plataforma. Los avisos externos no se actualizan solos ni reciben un puntaje inventado.

Para reverificar precios de favoritos existentes en D1 con una copia exportada:

```sh
pnpm recheck /ruta/autoofertas-garage.json          # solo informa qué revisaría
pnpm recheck /ruta/autoofertas-garage.json --apply  # consulta detalles y actualiza precios explícitos
```

Solo admite hosts de las fuentes existentes. Si no puede reconocer un precio, conserva la última observación y no marca el aviso vendido. La actualización incremental de favoritos puede programarse en tu equipo si lo deseás; no se instala un programador automáticamente.

Las preferencias de provincia de radicación, km mensuales, cotización, combustible/energía, seguro, valuación fiscal, transferencia/patentamiento y extras se comparten entre detalle y comparador. Cero en un costo opcional significa usar la estimación existente. Las tablas originales no se presentan como tasas oficiales vigentes: son aproximaciones sin vigencia validada. Antes de comprar, ingresar cotizaciones reales. El IVA del simulador se distribuye como promedio; no es un cronograma bancario ni una estimación completa de CFT.

## Migración y publicación

No desplegar la nueva web antes de migrar D1. No ejecutar un seed contra producción.

1. Exportar un respaldo de D1 con Wrangler y conservar la versión anterior de la app.
2. Inspeccionar `PRAGMA table_info(listings)` y el historial de migraciones. Si `0000`/`0001` se aplicaron manualmente en el pasado, **no repetir ALTER TABLE**: establecer primero el baseline de migraciones acorde al estado real.
3. Aplicar `0002_quality_history.sql` una sola vez sobre una base con `0000` y `0001`. La migración conserva registros e importes, agrega historial/metadatos, pone puntajes a cero y clasifica los precios existentes como desconocidos. Eso oculta temporalmente el catálogo normal hasta su reverificación.
4. Configurar cotización y volver a ejecutar las fuentes. Revisar `scrape_runs`, cantidades y una muestra de precios totales/anticipos antes de publicar.
5. Revisar el informe y recalcular:

```sh
pnpm repair          # consulta distribución de precios; no modifica datos
pnpm repair --apply  # recalcula contra el catálogo consolidado
```

No es posible recuperar fechas de primera detección que la implementación anterior ya sobrescribió; tampoco se puede reconstruir un precio total a partir de un anticipo. Para registros inaccesibles se conserva “sin confirmar”.

Para una base nueva o con historial de migraciones correctamente establecido:

```sh
cd web
pnpm exec wrangler d1 migrations apply auto-ofertas-db --remote
pnpm exec opennextjs-cloudflare build
pnpm exec wrangler deploy
```

El hosting es un **Worker OpenNext** con assets, no un deploy de solo assets a Pages.

Worker de mantenimiento:

```sh
pnpm --filter web exec wrangler secret put RUN_TOKEN --config ../packages/scraper/wrangler.toml
pnpm --filter web exec wrangler deploy --config ../packages/scraper/wrangler.toml
```

El cron recalcula cada seis horas. `POST /run` exige `Authorization: Bearer <RUN_TOKEN>`; sin secret siempre rechaza la ejecución manual. No ofrece ingestión pública.

## Integraciones pendientes de validación externa

Facebook Marketplace automático y nuevos inventarios de concesionarias requieren elegir proveedores, comprobar acceso autorizado y probar parsers con datos reales. No hay una integración simulada que afirme recolectarlos. La UI de importación manual ya permite comparar esos avisos. Tampoco se habilitó publicación automática de la app ni se modificó la base remota como parte de los cambios del repositorio.
