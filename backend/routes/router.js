'use strict';

function createRouter() {
    const routes = [];

    function add(method, pattern, handler) {
        const isDynamic = pattern.includes('/:');
        let prefix = null, paramName = null;
        if (isDynamic) {
            const idx = pattern.indexOf('/:');
            prefix = pattern.slice(0, idx + 1);
            paramName = pattern.slice(idx + 2);
        }
        routes.push({ method: method.toUpperCase(), pattern, isDynamic, prefix, paramName, handler });
    }

    async function dispatch(ctx) {
        const method = ctx.req.method.toUpperCase();
        for (const route of routes) {
            const { requestPath } = ctx;
            if (route.isDynamic) {
                if (!requestPath.startsWith(route.prefix)) continue;
                const segment = requestPath.slice(route.prefix.length);
                if (!segment || segment.includes('/')) continue;
                if (route.method !== method) continue;
                ctx.params = { [route.paramName]: decodeURIComponent(segment) };
            } else {
                if (requestPath !== route.pattern) continue;
                if (route.method !== method) continue;
                ctx.params = {};
            }
            route.handler(ctx);
            return true;
        }
        return false;
    }

    return { add, dispatch };
}

module.exports = { createRouter };
