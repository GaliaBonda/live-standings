# Live Standings

Sanitized **live contest scores** for a trivia night — not fantasy sports.

Public proof for the current-role stack: React Native (Expo), Express, Socket.IO, Redis sorted sets, PostgreSQL, JWT.

## Run

```bash
cp .env.example api/.env
pnpm install
pnpm db:up
pnpm test
pnpm dev          # API  http://127.0.0.1:3003
pnpm dev:web      # Expo web  http://localhost:8082
```

Sign in with `nia@demo.local` (host) or `kai@demo.local` / `remi@demo.local` / `sol@demo.local` (players). Password is `demo1234`.

As host, tap **+10** / **−5** on a row. Other signed-in clients update over Socket.IO. Redis holds the live `ZSET`; Postgres stores users, contests, and every score event.

## Layout

| Path | Role |
| --- | --- |
| `api/` | Express + Socket.IO + Drizzle/Postgres + ioredis |
| `mobile/` | Expo (iOS / Android / web) |
| `docker-compose.yml` | Postgres `5434`, Redis `6380` |

## Why Redis

`standings:{contestId}` is a sorted set (`ZINCRBY` / `ZREVRANGE`). Awarding points writes a `score_events` row, increments the set, then broadcasts ranked standings to the contest room.
