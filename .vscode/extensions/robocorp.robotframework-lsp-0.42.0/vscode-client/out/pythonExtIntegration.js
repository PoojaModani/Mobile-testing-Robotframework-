"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPythonExtensionExecutable = void 0;
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const progress_1 = require("./progress");
async function getPythonExtensionExecutable(resource = null, showInOutput = true) {
    try {
        const extension = vscode_1.extensions.getExtension("ms-python.python");
        if (!extension) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to get python executable from vscode-python. ms-python.python extension not found.");
            return undefined;
        }
        const usingNewInterpreterStorage = extension.packageJSON?.featureFlags?.usingNewInterpreterStorage;
        if (usingNewInterpreterStorage) {
            // Note: just this in not enough to know if the user is actually using the new API
            // (i.e.: he may not be in the experiment).
            if (!extension.isActive) {
                const id = "activate-vscode-python-" + Date.now();
                (0, progress_1.handleProgressMessage)({
                    kind: "begin",
                    id: id,
                    title: "Waiting for vscode-python activation...",
                });
                try {
                    await extension.activate();
                }
                finally {
                    (0, progress_1.handleProgressMessage)({
                        kind: "end",
                        id: id,
                    });
                }
            }
            let execCommand = extension.exports.settings.getExecutionDetails(resource).execCommand;
            if (showInOutput) {
                channel_1.OUTPUT_CHANNEL.appendLine("vscode-python execCommand: " + execCommand);
            }
            if (!execCommand) {
                channel_1.OUTPUT_CHANNEL.appendLine("vscode-python did not return proper execution details.");
                return undefined;
            }
            if (execCommand instanceof Array) {
                if (execCommand.length === 0) {
                    return undefined;
                }
                return execCommand;
            }
            return [execCommand];
        }
        else {
            let config = vscode_1.workspace.getConfiguration("python");
            let executable = await config.get("pythonPath");
            if (!executable) {
                return undefined;
            }
            return [executable];
        }
    }
    catch (error) {
        (0, channel_1.logError)("Error when querying about python executable path from vscode-python.", error, "PYTHON_EXT_NO_PYTHON_EXECUTABLE");
        return undefined;
    }
}
exports.getPythonExtensionExecutable = getPythonExtensionExecutable;
//# sourceMappingURL=pythonExtIntegration.js.map