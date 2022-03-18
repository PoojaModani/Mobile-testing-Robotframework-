"use strict";
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
exports.uriExists = exports.fileExists = exports.verifyFileExists = exports.getExtensionRelativeFile = void 0;
const path = require("path");
const fs = require("fs");
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
/**
 * @param mustExist if true, if the returned file does NOT exist, returns undefined.
 */
function getExtensionRelativeFile(relativeLocation, mustExist = true) {
    let targetFile = path.resolve(__dirname, relativeLocation);
    if (mustExist) {
        if (!verifyFileExists(targetFile)) {
            return undefined;
        }
    }
    return targetFile;
}
exports.getExtensionRelativeFile = getExtensionRelativeFile;
function verifyFileExists(targetFile, warnUser = true) {
    if (!fs.existsSync(targetFile)) {
        let msg = "Error. Expected: " + targetFile + " to exist.";
        if (warnUser)
            vscode_1.window.showWarningMessage(msg);
        channel_1.OUTPUT_CHANNEL.appendLine(msg);
        return false;
    }
    return true;
}
exports.verifyFileExists = verifyFileExists;
function fileExists(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.promises.stat(filename);
            return true;
        }
        catch (err) {
            return false;
        }
    });
}
exports.fileExists = fileExists;
function uriExists(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield vscode_1.workspace.fs.stat(uri);
            return true;
        }
        catch (err) {
            return false;
        }
    });
}
exports.uriExists = uriExists;
//# sourceMappingURL=files.js.map