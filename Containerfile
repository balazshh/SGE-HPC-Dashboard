FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY src ./src
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json

EXPOSE 3001
CMD ["bun", "src/server/index.ts"]
