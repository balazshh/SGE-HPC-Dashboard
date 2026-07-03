FROM oven/bun:1 AS build
WORKDIR /app

ARG http_proxy
ARG https_proxy
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG no_proxy
ARG NO_PROXY
ENV http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    HTTP_PROXY=${HTTP_PROXY:-${http_proxy}} \
    HTTPS_PROXY=${HTTPS_PROXY:-${https_proxy}} \
    no_proxy=${no_proxy} \
    NO_PROXY=${NO_PROXY:-${no_proxy}}

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production

ARG http_proxy
ARG https_proxy
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG no_proxy
ARG NO_PROXY
ENV http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    HTTP_PROXY=${HTTP_PROXY:-${http_proxy}} \
    HTTPS_PROXY=${HTTPS_PROXY:-${https_proxy}} \
    no_proxy=${no_proxy} \
    NO_PROXY=${NO_PROXY:-${no_proxy}}

COPY package.json ./
RUN bun install --production

COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3001
CMD ["bun", "src/server/index.ts"]
