/**
 * Slovak Business Register (RPO) Utilities
 */

export const searchRpo = async (name) => {
    try {
        const res = await fetch('/api/rpo/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, limit: 8 })
        });
        if (!res.ok) throw new Error('RPO search failed');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const lookupRpoByIco = async (ico) => {
    try {
        const res = await fetch(`/api/rpo/ico?ico=${encodeURIComponent(ico)}`);
        if (!res.ok) throw new Error('RPO lookup failed');
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};
