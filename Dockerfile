# BLACK X — production image (SnapDeploy, Render, Railway, Koyeb, Fly, any Docker host)
FROM node:20-slim

# build tools for better-sqlite3 + PostgreSQL for the social/gamification API
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ postgresql postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

# entrypoint boots an ephemeral postgres + prisma db push, then runs the app
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
