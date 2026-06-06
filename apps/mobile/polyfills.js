// structuredClone is not available in Hermes (React Native's JS engine).
// This polyfill uses JSON round-trip with a Date-aware reviver so that
// Date fields on domain models survive cloning correctly.
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = function (obj) {
        return JSON.parse(JSON.stringify(obj), (_key, value) => {
            if (typeof value === 'string') {
                const d = new Date(value);
                if (!Number.isNaN(d.getTime()) && d.toISOString() === value) return d;
            }
            return value;
        });
    };
}
