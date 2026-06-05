// structuredClone is not available in Hermes (React Native's JS engine).
// This polyfill uses JSON round-trip with a Date-aware reviver so that
// Date fields on domain models survive cloning correctly.
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = function (obj) {
        return JSON.parse(JSON.stringify(obj), (_key, value) => {
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                return new Date(value);
            }
            return value;
        });
    };
}
