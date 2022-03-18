"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeakValueMap = void 0;
class WeakValueMap {
    constructor() {
        // TODO: We could improve to remove from the map to clear the memory related
        // to entries with a FinalizationRegistry, but let's keep it simple for now...
        this.map = new Map();
    }
    get(key) {
        const w = this.map.get(key);
        if (w !== undefined) {
            return w.deref();
        }
        return undefined;
    }
    set(key, value) {
        const ref = new WeakRef(value);
        this.map.set(key, ref);
    }
    delete(key) {
        this.map.delete(key);
    }
    clear() {
        this.map.clear();
    }
}
exports.WeakValueMap = WeakValueMap;
//# sourceMappingURL=weakValueMap.js.map