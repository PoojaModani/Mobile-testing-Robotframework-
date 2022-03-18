"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
exports.CONFIG_BLOCK_NAME = "rfLanguageServer";
class Config {
    static reloadConfig() {
        Config.settings = vscode_1.workspace.getConfiguration(exports.CONFIG_BLOCK_NAME);
    }
    static getSettings() {
        Config.reloadConfig();
        return Config.settings;
    }
    /**
     * Returns configured include patterns or default pattern
     */
    static getInclude() {
        Config.reloadConfig();
        const includePatterns = Config.settings
            ? Config.settings.get("includePaths")
            : [];
        return _createGlob(includePatterns.length > 0
            ? includePatterns
            : ["**/*.robot", "**/*.resource"]);
    }
    static getExclude() {
        Config.reloadConfig();
        const exlcudePatterns = Config.settings
            ? Config.settings.get("excludePaths")
            : [];
        return _createGlob(exlcudePatterns);
    }
}
Config.settings = vscode_1.workspace.getConfiguration(exports.CONFIG_BLOCK_NAME);
exports.Config = Config;
function _createGlob(patterns) {
    switch (patterns.length) {
        case 0:
            return "";
        case 1:
            return patterns[0];
        default:
            return `{${patterns.join(",")}}`;
    }
}
//# sourceMappingURL=config.js.map