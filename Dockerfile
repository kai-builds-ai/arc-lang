FROM node:20-alpine AS builder
WORKDIR /app
COPY compiler/package.json compiler/package-lock.json* ./compiler/
RUN cd compiler && npm install
COPY compiler/ ./compiler/
RUN cd compiler && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/compiler/dist ./dist
COPY --from=builder /app/compiler/node_modules ./node_modules
COPY --from=builder /app/compiler/package.json ./package.json
COPY stdlib/ ./stdlib/ 2>/dev/null || true
COPY examples/ ./examples/ 2>/dev/null || true
ENTRYPOINT ["node", "dist/index.js"]
CMD ["repl"]
