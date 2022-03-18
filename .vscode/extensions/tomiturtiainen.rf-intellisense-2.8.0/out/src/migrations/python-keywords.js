"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../utils/config");
const YES = "Yes";
const NO = "No";
const PY_CONFIG_KEY = "pythonKeywords";
const INCLUDE_CONFIG_KEY = "includePaths";
function checkShouldMigrate() {
    return __awaiter(this, void 0, void 0, function* () {
        return _checkPythonKeywordsUsage();
    });
}
exports.default = checkShouldMigrate;
function _checkPythonKeywordsUsage() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = config_1.Config.getSettings();
        if (!config) {
            return;
        }
        const inspectResult = config.inspect(PY_CONFIG_KEY);
        const hasLocal = inspectResult.workspaceValue === true;
        const hasGlobal = inspectResult.globalValue === true;
        if (hasLocal || hasGlobal) {
            const result = yield _promptShouldUpdate();
            if (result === YES) {
                _replacePythonKeywords(config, hasLocal, hasGlobal);
                const infoMsg = `**pythonKeywords** setting has been replaced with a '\\*\\*/*.py' include pattern.`;
                vscode_1.window.showInformationMessage(infoMsg);
            }
            else if (result === NO) {
                _removePythonKeywords(config);
                const infoMsg = `**pythonKeywords** setting has been removed.`;
                vscode_1.window.showInformationMessage(infoMsg);
            }
        }
    });
}
function _promptShouldUpdate() {
    const promptMsg = `[RobotFramework] '**pythonKeywords**' setting is deprecated in ` +
        `favor of '**includePaths**'. Do you want to migrate to include pattern '\\*\\*/*.py'?`;
    return vscode_1.window.showInformationMessage(promptMsg, YES, NO);
}
function _replacePythonKeywords(config, hasLocal, hasGlobal) {
    _removePythonKeywords(config);
    const includeConfig = config.inspect(INCLUDE_CONFIG_KEY);
    if (hasLocal) {
        const includePaths = _getIncludePatterns(includeConfig.workspaceValue);
        config.update(INCLUDE_CONFIG_KEY, includePaths, false);
    }
    if (hasGlobal) {
        const includePaths = _getIncludePatterns(includeConfig.globalValue);
        config.update(INCLUDE_CONFIG_KEY, includePaths, true);
    }
}
function _getIncludePatterns(includePaths = []) {
    const patterns = ["**/*.py"];
    if (includePaths.length === 0) {
        patterns.push("**/*.robot");
        patterns.push("**/*.resource");
    }
    return includePaths.concat(patterns);
}
function _removePythonKeywords(config) {
    config.update(PY_CONFIG_KEY, undefined, true);
    config.update(PY_CONFIG_KEY, undefined, false);
}
//# sourceMappingURL=python-keywords.js.map