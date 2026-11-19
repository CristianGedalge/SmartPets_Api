# =============================================================================
# Etapa 1: Compilación (Builder)
# =============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Instalar dependencias usando package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copiar configuración de compilación y código fuente
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Compilar TypeScript a JavaScript en /app/dist y limpiar devDependencies
RUN npm run build && npm prune --omit=dev

# =============================================================================
# Etapa 2: Producción (Runtime ligero)
# =============================================================================
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar únicamente artefactos compilados y dependencias de producción
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
