FROM node:20-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY backend backend
COPY frontend frontend
COPY packages/shared packages/shared
RUN npm run build:shared && npm run build --workspace @doc-search/backend
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=development
WORKDIR /workspace
COPY --from=build --chown=node:node /workspace/package.json /workspace/package-lock.json ./
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /workspace/backend/dist ./backend/dist
COPY --from=build --chown=node:node /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /workspace/packages/shared/dist ./packages/shared/dist
USER node
EXPOSE 3001