# AutoOfertas AR

Portal para encontrar las mejores ofertas de autos en Argentina. Agrega listados de MercadoLibre, DeMotores, Autocosmos y Kavak, los puntúa según relación precio/valor, y ofrece calculadoras de costos de tenencia.

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui
- **Hosting**: Cloudflare Pages (web) + Cloudflare Workers (scrapers)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM

## Estructura

```
auto-ofertas/
├── web/                        # Next.js app
│   ├── src/
│   │   ├── app/                # Pages (home, buscar, auto/[id], rankings, comparar)
│   │   ├── components/         # UI components (filters, cards, cost-breakdown, etc.)
│   │   └── lib/                # Business logic (costs, db, types, format)
│   ├── drizzle/                # SQL migrations
│   ├── wrangler.jsonc          # Cloudflare Pages config
│   └── open-next.config.ts     # OpenNext adapter for Cloudflare
├── packages/
│   └── scraper/                # Cloudflare Worker (cron-triggered scrapers)
│       ├── src/
│       │   ├── sources/        # ML, DeMotores, Autocosmos, Kavak scrapers
│       │   ├── normalizer.ts   # Data normalization
│       │   ├── scorer.ts       # Deal Score algorithm
│       │   └── worker.ts       # Worker entry point + cron handlers
│       └── wrangler.toml       # Worker config + cron triggers
└── README.md
```

## Desarrollo local

```bash
# Web app
cd web
pnpm install
pnpm dev

# Scraper (worker local)
cd packages/scraper
pnpm install
npx wrangler dev
```

## Deploy

### Prerequisitos

1. Crear una D1 database:
   ```bash
   npx wrangler d1 create auto-ofertas-db
   ```
2. Actualizar `database_id` en `web/wrangler.jsonc` y `packages/scraper/wrangler.toml`
3. Aplicar migraciones:
   ```bash
   npx wrangler d1 execute auto-ofertas-db --file=./web/drizzle/0000_init.sql
   ```
4. Configurar secrets del scraper:
   ```bash
   npx wrangler secret put ML_APP_TOKEN --config packages/scraper/wrangler.toml
   ```

### Deploy web
```bash
cd web
npx opennextjs-cloudflare && npx wrangler pages deploy .open-next/assets --project-name=auto-ofertas-web
```

### Deploy scraper worker
```bash
cd packages/scraper
npx wrangler deploy
```

## Features

- **Deal Score**: Puntaje 0-100 basado en precio vs mercado, km, precio/km, completitud, frescura y confiabilidad
- **Filtros completos**: Marca, modelo, año, precio, km, provincia, combustible, transmisión, tipo, vendedor, permuta, financiación
- **Detalle de Costos**: Patente bimestral, transferencia, patentamiento, combustible, seguro, préstamo prendario, costo total mensual
- **Badges de verificación**: Kavak verificado, ML verificado, Concesionaria
- **Comparador**: Hasta 3 autos lado a lado
- **Rankings**: Mejores ofertas por categoría, mejor precio/km, menos km
