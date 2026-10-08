#!/bin/bash

# Asegurar que el script se ejecuta en la carpeta donde está ubicado
cd "$(dirname "$0")"

# 1. Crear la red (silencia el error si ya existe)
echo "🌐 Configurando red de Docker..."
docker network create uru_network

# 2. Desplegar Backend (ya estamos en web-2-backend)
echo "🚀 Construyendo y levantando Backend..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Movernos al Frontend y desplegar
echo "🚀 Construyendo y levantando Frontend..."
cd ../web-2-frontend || exit
docker compose up -d --build
cd ../web-2-backend || exit

# 4. Limpiar imágenes residuales
echo "🧹 Limpiando imágenes residuales (dangling)..."
docker image prune -f

echo "✅ ¡Despliegue finalizado!"
