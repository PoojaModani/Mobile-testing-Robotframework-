"use strict";
// https://spin.atomicobject.com/2018/09/10/javascript-concurrency/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutex = void 0;
/**
 * Use as:
 *
 *   return await mutex.dispatch(async () => {
 *      ...
 *   });
 */
class Mutex {
    constructor() {
        this.mutex = Promise.resolve();
    }
    lock() {
        let begin = (unlock) => { };
        this.mutex = this.mutex.then(() => {
            return new Promise(begin);
        });
        return new Promise((res) => {
            begin = res;
        });
    }
    dispatch(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const unlock = yield this.lock();
            try {
                return yield Promise.resolve(fn());
            }
            finally {
                unlock();
            }
        });
    }
}
exports.Mutex = Mutex;
//# sourceMappingURL=mutex.js.map