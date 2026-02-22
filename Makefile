.PHONY: up down test test-backend build logs

## Start all services
up:
	docker compose up --build

## Stop all services
down:
	docker compose down

## Build images without starting
build:
	docker compose build

## Run backend tests in Docker (no postgres needed, uses SQLite)
test:
	docker compose -f docker-compose.test.yml run --rm backend-test

## Stream logs
logs:
	docker compose logs -f

## Run database migrations inside the running backend container
migrate:
	docker compose exec backend alembic upgrade head
