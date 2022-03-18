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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEnvsToCollect = exports.clearRobocorpCodeCaches = exports.clearRCCEnvironments = void 0;
const channel_1 = require("./channel");
const rcc_1 = require("./rcc");
const subprocess_1 = require("./subprocess");
const path = require("path");
const fs = require("fs");
function clearRCCEnvironments(rccLocation, robocorpHome, envsToCollect, progress) {
    return __awaiter(this, void 0, void 0, function* () {
        const env = (0, rcc_1.createEnvWithRobocorpHome)(robocorpHome);
        let i = 0;
        for (const envToCollect of envsToCollect) {
            i += 1;
            try {
                const envId = envToCollect["id"];
                progress.report({
                    "message": `Deleting env: ${envId} (${i} of ${envsToCollect.length})`,
                });
                let execFileReturn = yield (0, subprocess_1.execFilePromise)(rccLocation, ["holotree", "delete", envId, "--controller", "RobocorpCode"], { "env": env }, { "showOutputInteractively": true });
            }
            catch (error) {
                let msg = "Error collecting RCC environment: " + envToCollect.id + " at: " + envToCollect.path;
                (0, channel_1.logError)(msg, error, "RCC_CLEAR_ENV");
            }
        }
    });
}
exports.clearRCCEnvironments = clearRCCEnvironments;
function removeCaches(dirPath, level, removeDirsArray) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        let dirContents = yield fs.promises.readdir(dirPath, { withFileTypes: true });
        try {
            for (var dirContents_1 = __asyncValues(dirContents), dirContents_1_1; dirContents_1_1 = yield dirContents_1.next(), !dirContents_1_1.done;) {
                const dirEnt = dirContents_1_1.value;
                var entryPath = path.join(dirPath, dirEnt.name);
                if (dirEnt.isDirectory()) {
                    yield removeCaches(entryPath, level + 1, removeDirsArray);
                    removeDirsArray.push(entryPath);
                }
                else {
                    try {
                        yield fs.promises.unlink(entryPath);
                        channel_1.OUTPUT_CHANNEL.appendLine(`Removed: ${entryPath}.`);
                    }
                    catch (err) {
                        channel_1.OUTPUT_CHANNEL.appendLine(`Unable to remove: ${entryPath}. ${err}`);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (dirContents_1_1 && !dirContents_1_1.done && (_a = dirContents_1.return)) yield _a.call(dirContents_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (level === 0) {
            // Remove the (empty) directories only after all iterations finished.
            for (const entryPath of removeDirsArray) {
                try {
                    yield fs.promises.rmdir(entryPath);
                    channel_1.OUTPUT_CHANNEL.appendLine(`Removed dir: ${entryPath}.`);
                }
                catch (err) {
                    channel_1.OUTPUT_CHANNEL.appendLine(`Unable to remove dir: ${entryPath}. ${err}`);
                }
            }
        }
    });
}
function clearRobocorpCodeCaches(robocorpHome) {
    return __awaiter(this, void 0, void 0, function* () {
        let robocorpCodePath = path.join(robocorpHome, ".robocorp_code");
        removeCaches(robocorpCodePath, 0, []);
    });
}
exports.clearRobocorpCodeCaches = clearRobocorpCodeCaches;
function computeEnvsToCollect(rccLocation, robocorpHome) {
    return __awaiter(this, void 0, void 0, function* () {
        let args = ["holotree", "list", "--json", "--controller", "RobocorpCode"];
        let execFileReturn = yield (0, subprocess_1.execFilePromise)(rccLocation, args, { "env": (0, rcc_1.createEnvWithRobocorpHome)(robocorpHome) }, { "showOutputInteractively": true });
        if (!execFileReturn.stdout) {
            (0, rcc_1.feedbackRobocorpCodeError)("RCC_NO_RCC_ENV_STDOUT_ON_ENVS_TO_COLLECT");
            channel_1.OUTPUT_CHANNEL.appendLine("Error: Unable to collect environment from RCC.");
            return undefined;
        }
        let nameToEnvInfo = undefined;
        try {
            nameToEnvInfo = JSON.parse(execFileReturn.stdout);
        }
        catch (error) {
            (0, channel_1.logError)("Error parsing env from RCC: " + execFileReturn.stdout, error, "RCC_WRONG_RCC_ENV_STDOUT_ON_ENVS_TO_COLLECT");
            return undefined;
        }
        if (!nameToEnvInfo) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error: Unable to collect env array.");
            return undefined;
        }
        let found = [];
        for (const key in nameToEnvInfo) {
            if (Object.prototype.hasOwnProperty.call(nameToEnvInfo, key)) {
                const element = nameToEnvInfo[key];
                let spaceName = element["space"];
                if (spaceName && spaceName.startsWith("vscode")) {
                    found.push(element);
                }
            }
        }
        return found;
    });
}
exports.computeEnvsToCollect = computeEnvsToCollect;
//# sourceMappingURL=clear.js.map