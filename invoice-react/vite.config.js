import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import zlib from 'zlib'

// ARES proxy plugin
function aresProxyPlugin() {
    return {
        name: 'ares-proxy',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                // Handle OPTIONS preflight requests first
                if ((req.url === '/api/ares/search' || req.url?.startsWith('/api/ares/ico')) && req.method === 'OPTIONS') {
                    res.writeHead(204, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    })
                    res.end()
                    return
                }

                // Handle ARES search by name or ICO
                if (req.url === '/api/ares/search' && req.method === 'POST') {
                    let body = ''
                    req.on('data', chunk => { body += chunk })
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body)
                            const filter = {}
                            if (data.obchodniJmeno && String(data.obchodniJmeno).trim()) {
                                filter.obchodniJmeno = String(data.obchodniJmeno).trim()
                            }
                            if (data.ico && String(data.ico).trim()) {
                                filter.ico = String(data.ico).trim()
                            }

                            // ARES API expects start (0-indexed) and pocet
                            filter.start = (data.strana ? (data.strana - 1) : 0) * (data.pocet || 10)
                            filter.pocet = data.pocet || 10

                            const payload = JSON.stringify(filter)
                            console.log('[ARES Proxy] Search Payload:', payload)

                            const tryAres = async (prefix) => {
                                return await makeAresRequest({
                                    hostname: 'ares.gov.cz',
                                    path: `/${prefix}/rest/ekonomicke-subjekty/vyhledat`,
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json',
                                        'Accept-Encoding': 'gzip, deflate',
                                        'User-Agent': 'InvoiceMaker/1.0'
                                    }
                                }, payload)
                            }

                            // Try Business Entities first
                            let result = await tryAres('ekonomicke-subjekty-v-be')

                            if (result.status !== 200 || !result.data?.ekonomickeSubjekty?.length) {
                                const fallback = await tryAres('ekonomicke-subjekty')
                                if (fallback.status === 200 && (fallback.data?.ekonomickeSubjekty?.length || result.status !== 200)) {
                                    result = fallback
                                }
                            }

                            res.writeHead(result.status, {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            })
                            res.end(JSON.stringify(result.data))
                        } catch (error) {
                            console.error('[ARES Proxy] Search error:', error.message)
                            res.writeHead(500, { 'Content-Type': 'application/json' })
                            res.end(JSON.stringify({ error: error.message }))
                        }
                    })
                    return
                }

                // Handle ARES lookup by IČO
                if (req.url?.startsWith('/api/ares/ico') && req.method === 'GET') {
                    const url = new URL(req.url, 'http://localhost')
                    const ico = url.searchParams.get('ico')

                    if (!ico) {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ error: 'Missing ico' }))
                        return
                    }

                    try {
                        console.log('[ARES Proxy] Looking up IČO:', ico)

                        let result = await makeAresRequest({
                            hostname: 'ares.gov.cz',
                            path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Accept-Encoding': 'gzip, deflate',
                                'User-Agent': 'InvoiceMaker/1.0'
                            }
                        })

                        if (result.status === 404) {
                            console.log('[ARES Proxy] Falling back to all entities lookup...')
                            result = await makeAresRequest({
                                hostname: 'ares.gov.cz',
                                path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
                                method: 'GET',
                                headers: {
                                    'Accept': 'application/json',
                                    'Accept-Encoding': 'gzip, deflate',
                                    'User-Agent': 'InvoiceMaker/1.0'
                                }
                            })
                        }

                        res.writeHead(result.status, {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        })
                        res.end(JSON.stringify(result.data))
                    } catch (error) {
                        console.error('[ARES Proxy] Lookup error:', error.message)
                        res.writeHead(500, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ error: error.message }))
                    }
                    return
                }

                next()
            })
        }
    }
}

function makeAresRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (proxyRes) => {
            const status = proxyRes.statusCode || 500
            const encoding = String(proxyRes.headers['content-encoding'] || '').toLowerCase()
            const stream = (encoding === 'gzip' || encoding === 'deflate')
                ? proxyRes.pipe(zlib.createUnzip())
                : proxyRes

            let data = ''
            stream.on('data', chunk => { data += chunk })
            stream.on('end', () => {
                try {
                    const parsed = JSON.parse(data)
                    resolve({ status, data: parsed })
                } catch (error) {
                    resolve({ status, data: { error: 'Invalid JSON', snippet: data.slice(0, 200) } })
                }
            })
        })

        req.on('error', reject)
        if (body) req.write(body)
        req.end()
    })
}

export default defineConfig({
    plugins: [react(), aresProxyPlugin()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api/email': 'http://localhost:5500'
        }
    }
})
