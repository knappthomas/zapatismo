# zapatismo

Zapatismo is a web-based tool for structured management and analysis of sports-related shoe usage. It links training data with individual shoes to provide transparent and traceable insights into their actual use. The goal is to establish a clear decision-making foundation for when a shoe should continue to be used or replaced.

## Backend tests

- **Unit tests:** From repo root run `npm run test --workspace=@zapatismo/backend`, or from `apps/backend` run `npm run test`. No database required.
- **Integration tests:** From repo root run `npm run test:integration --workspace=@zapatismo/backend`, or from `apps/backend` run `npm run test:integration`. **MySQL must be running** (e.g. `misc/mysql` Docker Compose); tests use `DATABASE_URL` from environment (e.g. `.env` or `.env.development`).
- **CI:** A GitHub Actions workflow (`.github/workflows/backend-tests.yml`) runs backend unit and integration tests on every push to every branch. No secrets required; the workflow uses a MySQL service container for integration tests.
