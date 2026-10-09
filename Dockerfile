# BLACK X — production image (works on Render, Railway, Koyeb, Fly, any Docker host)
FROM node:20-slim

# build tools for better-sqlite3 (prebuilds usually suffice, this is the fallback)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

CMD ["npm", "start"]
