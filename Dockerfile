# syntax=docker/dockerfile:1

# ---- build stage ------------------------------------------------------
# Builds the frontend (dist/) and, via `tsc -b`'s project references,
# type-checks server/ too — a server-side type error fails the image
# build here, same as it already fails a local `npm run build`.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ------------------------------------------------------
# Only dist/ (this build's output) and server/ are needed at runtime.
# Node's built-in TypeScript type-stripping runs server/index.ts directly
# — no compile step, no ts-node — same as `npm run server` locally;
# tsconfig.server.json's `erasableSyntaxOnly` exists specifically so that
# keeps working. `--omit=dev` skips vite/tsc/oxlint/etc., which the running
# server never imports (it only needs `fast-xml-parser`, from
# `dependencies`, via server/siriSx.ts).
FROM node:24-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server

# No ENV/EXPOSE for PORT here — it's supplied at runtime via
# docker-compose's `env_file: .env` (same convention as local dev's
# `node --env-file=.env server/index.ts`), so this image has no fixed
# opinion on the port and doesn't need rebuilding to change it.
CMD ["node", "server/index.ts"]
