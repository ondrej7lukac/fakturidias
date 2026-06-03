import { defineConfig } from 'vite';
import type { ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestOptions } from 'node:https';

interface AresFilter {
  obchodniJmeno?: string;
  ico?: string;
  start?: number;
  pocet?: number;
}

interface AresResponse {
  status: number;
  data: { ekonomickeSubjekty?: unknown[]; [key: string]: unknown };
}

// ARES proxy plugin
function aresProxyPlugin() {
  return {
    name: 'ares-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        // Handle OPTIONS preflight requests first
        if (
          (req.url === '/api/ares/search' ||
            req.url?.startsWith('/api/ares/ico')) &&
          req.method === 'OPTIONS'
        ) {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        // Handle ARES search by name or ICO
        if (req.url === '/api/ares/search' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const filter: AresFilter = {};
              if (data.obchodniJmeno && String(data.obchodniJmeno).trim()) {
                filter.obchodniJmeno = String(data.obchodniJmeno).trim();
              }
              if (data.ico && String(data.ico).trim()) {
                filter.ico = String(data.ico).trim();
              }

              // ARES API expects start (0-indexed) and pocet
              filter.start =
                (data.strana ? data.strana - 1 : 0) * (data.pocet || 10);
              filter.pocet = data.pocet || 10;

              const payload = JSON.stringify(filter);
              console.log('[ARES Proxy] Search Payload:', payload);

              const tryAres = async (prefix: string) => {
                return await makeAresRequest(
                  {
                    hostname: 'ares.gov.cz',
                    path: `/${prefix}/rest/ekonomicke-subjekty/vyhledat`,
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Accept: 'application/json',
                      'Accept-Encoding': 'gzip, deflate',
                      'User-Agent': 'InvoiceMaker/1.0',
                    },
                  },
                  payload,
                );
              };

              // Try Business Entities first
              let result = await tryAres('ekonomicke-subjekty-v-be');

              if (
                result.status !== 200 ||
                !result.data?.ekonomickeSubjekty?.length
              ) {
                const fallback = await tryAres('ekonomicke-subjekty');
                if (
                  fallback.status === 200 &&
                  (fallback.data?.ekonomickeSubjekty?.length ||
                    result.status !== 200)
                ) {
                  result = fallback;
                }
              }

              res.writeHead(result.status, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(result.data));
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              console.error('[ARES Proxy] Search error:', message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: message }));
            }
          });
          return;
        }

        // Handle ARES lookup by IČO
        if (req.url?.startsWith('/api/ares/ico') && req.method === 'GET') {
          const url = new URL(req.url, 'http://localhost');
          const ico = url.searchParams.get('ico');

          if (!ico) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing ico' }));
            return;
          }

          try {
            console.log('[ARES Proxy] Looking up IČO:', ico);

            let result = await makeAresRequest({
              hostname: 'ares.gov.cz',
              path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'User-Agent': 'InvoiceMaker/1.0',
              },
            });

            if (result.status === 404) {
              console.log(
                '[ARES Proxy] Falling back to all entities lookup...',
              );
              result = await makeAresRequest({
                hostname: 'ares.gov.cz',
                path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                  'User-Agent': 'InvoiceMaker/1.0',
                },
              });
            }

            res.writeHead(result.status, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify(result.data));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[ARES Proxy] Lookup error:', message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: message }));
          }
          return;
        }

        next();
      });
    },
  };
}

function makeAresRequest(
  options: RequestOptions,
  body: string | null = null,
): Promise<AresResponse> {
  return new Promise<AresResponse>((resolve, reject) => {
    const req = https.request(options, (proxyRes) => {
      const status = proxyRes.statusCode || 500;
      const encoding = String(
        proxyRes.headers['content-encoding'] || '',
      ).toLowerCase();
      const stream =
        encoding === 'gzip' || encoding === 'deflate'
          ? proxyRes.pipe(zlib.createUnzip())
          : proxyRes;

      let data = '';
      stream.on('data', (chunk) => {
        data += chunk;
      });
      stream.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status, data: parsed });
        } catch (error) {
          resolve({
            status,
            data: { error: 'Invalid JSON', snippet: data.slice(0, 200) },
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function getVendorChunkName(id: string) {
  const [, modulePath = ''] = id.split('node_modules/');
  if (!modulePath) return undefined;

  const parts = modulePath.split('/');
  const packageName = parts[0].startsWith('@')
    ? `${parts[0]}/${parts[1]}`
    : parts[0];

  if (
    packageName === 'react' ||
    packageName === 'react-dom' ||
    packageName === 'scheduler'
  ) {
    return 'vendor-react';
  }

  return `vendor-${packageName.replace('@', '').replace('/', '-')}`;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aresProxyPlugin()],
  envDir: '../', // read VITE_* vars from root .env alongside backend vars
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          return getVendorChunkName(id);
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/auth': 'http://localhost:5500',
      '/api': 'http://localhost:5500',
    },
  },
});
