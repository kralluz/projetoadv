#!/usr/bin/env bash
set -o errexit
# exit on error
npm install
# npm install @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/node --save-dev

# npm run build

# Gerar o cliente Prisma
# npx prisma generate
# npx prisma migrate dev

# Compilar TypeScript para JavaScript (se necessário)
# npm run build

node server.js

echo "Construção finalizada com sucesso!"
