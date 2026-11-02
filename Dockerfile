# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# The Orval-generated API clients (src/lib/generated) are committed, so the
# build uses them as-is, like the Vercel build. Regenerating here fetched the
# swagger specs from sandbox, tying every image build to sandbox being up.
# Run `npm run generate:api` locally and commit the result to update them.

# Build the Next.js
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000


CMD ["npm", "start"]
