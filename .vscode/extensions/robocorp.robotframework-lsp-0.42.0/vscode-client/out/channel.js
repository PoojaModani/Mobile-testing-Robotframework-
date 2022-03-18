"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.errorFeedback = exports.OUTPUT_CHANNEL = exports.OUTPUT_CHANNEL_NAME = void 0;
const vscode_1 = require("vscode");
exports.OUTPUT_CHANNEL_NAME = "Robot Framework";
exports.OUTPUT_CHANNEL = vscode_1.window.createOutputChannel(exports.OUTPUT_CHANNEL_NAME);
async function errorFeedback(errorCode) {
    try {
        await vscode_1.commands.executeCommand("robocorp.errorFeedback.internal", "vscode.lsp.error", errorCode);
    }
    catch (err) {
        // that's ok, it may not be there.
    }
}
exports.errorFeedback = errorFeedback;
function logError(msg, err, errorCode) {
    errorFeedback(errorCode);
    exports.OUTPUT_CHANNEL.appendLine(msg);
    let indent = "    ";
    if (err.message) {
        exports.OUTPUT_CHANNEL.appendLine(indent + err.message);
    }
    if (err.stack) {
        let stack = "" + err.stack;
        exports.OUTPUT_CHANNEL.appendLine(stack.replace(/^/gm, indent));
    }
}
exports.logError = logError;
//# sourceMappingURL=channel.js.map