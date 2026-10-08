# --- Etapa 1: Builder (Constructor) ---
FROM node:20-alpine AS builder

# Instalamos pnpm con versión FIJA (major 10). NO usar "latest": cambia de major sin aviso y rompe el build.
RUN npm install -g pnpm@10

WORKDIR /app

# Copiamos los archivos de definición de dependencias
# pnpm-workspace.yaml contiene allowBuilds (bcrypt, esbuild); sin él la instalación falla
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalamos TODAS las dependencias
RUN pnpm install --frozen-lockfile

# Copiamos el resto del código fuente
COPY . .

# Construimos la aplicación
RUN pnpm run build

# --- Etapa 2: Runner (Ejecución en Producción) ---
FROM node:20-alpine AS runner

# Misma versión fija de pnpm que en el builder
RUN npm install -g pnpm@10

WORKDIR /app

ENV NODE_ENV=production

# Copiamos archivos de dependencias (incluye pnpm-workspace.yaml por allowBuilds)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalamos SOLO dependencias de producción SIN frozen-lockfile para evitar falsos positivos
RUN pnpm install --prod

# Copiamos los artefactos construidos
COPY --from=builder /app/dist ./dist

# Seguridad: Usuario no-root
RUN addgroup -S toproc && adduser -S toproc -G toproc
USER toproc

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
