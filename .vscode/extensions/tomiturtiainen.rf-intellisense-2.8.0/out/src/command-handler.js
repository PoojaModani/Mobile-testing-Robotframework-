"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("./utils/config");
const child_process_1 = require("child_process");
function getIncludeExcludePattern() {
    return {
        include: config_1.Config.getInclude(),
        exclude: config_1.Config.getExclude(),
    };
}
class CommandHandler {
    constructor(languageClient) {
        this.langClient = languageClient;
    }
    parseAll() {
        const includeExclude = getIncludeExcludePattern();
        if (!vscode_1.workspace.rootPath) {
            // Not a folder
            const activeEditor = vscode_1.window.activeTextEditor;
            if (!activeEditor) {
                return;
            }
            this.langClient.sendBuildFilesRequest([activeEditor.document.uri.fsPath]);
        }
        else {
            vscode_1.workspace
                .findFiles(includeExclude.include, includeExclude.exclude)
                .then(files => {
                const filePaths = files.map(fileUri => fileUri.fsPath);
                // Send the array of paths to the language server
                this.langClient.sendBuildFilesRequest(filePaths);
            });
        }
    }
    reportBug() {
        _openLinkInBrowser("https://github.com/tomi/vscode-rf-language-server/issues");
    }
}
exports.default = CommandHandler;
function _openLinkInBrowser(url) {
    let openCommand = "";
    switch (process.platform) {
        case "darwin":
        case "linux":
            openCommand = "open ";
            break;
        case "win32":
            openCommand = "start ";
            break;
        default:
            return;
    }
    child_process_1.exec(openCommand + url);
}
//# sourceMappingURL=command-handler.js.map