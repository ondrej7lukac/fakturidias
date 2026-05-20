FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite build-time vars — must be set before `npm run build` or the
# %VITE_*% placeholders in index.html leak through unsubstituted.
# Railway passes service variables as build args automatically.
ARG VITE_GA4_ID
ARG VITE_CLARITY_ID
ENV VITE_GA4_ID=$VITE_GA4_ID
ENV VITE_CLARITY_ID=$VITE_CLARITY_ID

RUN npm run build
EXPOSE 5500
CMD ["node", "backend/server.js"]
