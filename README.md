# Sistema de Cadastro Eleitoral

Sistema para campanhas eleitorais cadastrarem eleitores por links individuais de líderes, com dois perfis internos (Administrador e Líder), isolamento de dados, cadastro público, validação robusta, proteção contra abuso e exportação CSV.

## Tech Stack

- Next.js 15.5.24+
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Better Auth 1.6.22+
- Drizzle ORM 0.45.2+
- PostgreSQL (Neon)
- Vitest
- Playwright

## Quick Start

1. Clone repository
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill required variables
4. `npm run dev`

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Linting
- `npm run typecheck` - TypeScript checking
- `npm run test` - Unit tests with Vitest
- `npm run test:integration` - Integration tests
- `npm run test:e2e` - E2E tests with Playwright

## Project Structure

- `app/` - Next.js App Router pages
- `components/` - UI components (shadcn/ui)
- `db/` - Drizzle schema and connection
- `lib/` - Auth, services, utilities
- `tests/` - Test files

## Environment Variables

See `.env.example` for required variables.

## License

MIT
