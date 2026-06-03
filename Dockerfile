FROM node:20-alpine
WORKDIR /app

# Install root (backend) deps strictly from the lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

COPY . .

# Vite build-time vars — must be set before `npm run build` or the
# %VITE_*% placeholders in index.html leak through unsubstituted.
# Railway passes service variables as build args automatically.
ARG VITE_GA4_ID
ARG VITE_CLARITY_ID
ENV VITE_GA4_ID=$VITE_GA4_ID
ENV VITE_CLARITY_ID=$VITE_CLARITY_ID

# Builds the frontend (installs invoice-react deps from its lockfile, then
# type-checks and runs the Vite build → dist/).
RUN npm run build

# Runtime mode. Enables secure cookies, error-message masking, and the
# SESSION_SECRET requirement in backend/server.js. Set AFTER the build so the
# Vite/TypeScript devDependencies are still installed in the steps above.
ENV NODE_ENV=production

EXPOSE 5500
CMD ["node", "backend/server.js"]
