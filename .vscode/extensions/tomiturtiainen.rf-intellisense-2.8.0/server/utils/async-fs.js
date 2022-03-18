Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function readFileAsync(filename, encoding) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, encoding, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.readFileAsync = readFileAsync;
//# sourceMappingURL=async-fs.js.map