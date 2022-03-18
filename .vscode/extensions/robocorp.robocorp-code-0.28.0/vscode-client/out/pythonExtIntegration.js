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
exports.getPythonExecutable = exports.setPythonInterpreterForPythonExtension = exports.installPythonInterpreterCheck = exports.autoUpdateInterpreter = void 0;
const vscode_1 = require("vscode");
const activities_1 = require("./activities");
const channel_1 = require("./channel");
const progress_1 = require("./progress");
const robocorpSettings_1 = require("./robocorpSettings");
function autoUpdateInterpreter(docUri) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, robocorpSettings_1.getAutosetpythonextensioninterpreter)()) {
            return;
        }
        let result = yield (0, activities_1.resolveInterpreter)(docUri.fsPath);
        if (!result.success) {
            return;
        }
        let interpreter = result.result;
        if (!interpreter || !interpreter.pythonExe) {
            return;
        }
        // Now, set the interpreter.
        let pythonExecutable = yield getPythonExecutable(docUri, true, false);
        if (pythonExecutable != interpreter.pythonExe) {
            setPythonInterpreterForPythonExtension(interpreter.pythonExe, docUri);
        }
    });
}
exports.autoUpdateInterpreter = autoUpdateInterpreter;
function installPythonInterpreterCheck(context) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        context.subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor((event) => __awaiter(this, void 0, void 0, function* () {
            var _c;
            try {
                // Whenever the active editor changes we update the Python interpreter used (if needed).
                let docUri = (_c = event === null || event === void 0 ? void 0 : event.document) === null || _c === void 0 ? void 0 : _c.uri;
                if (docUri) {
                    yield autoUpdateInterpreter(docUri);
                }
            }
            catch (error) {
                (0, channel_1.logError)("Error auto-updating Python interpreter.", error, "PYTHON_SET_INTERPRETER");
            }
        })));
        try {
            let uri = (_b = (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document) === null || _b === void 0 ? void 0 : _b.uri;
            if (uri) {
                yield autoUpdateInterpreter(uri);
            }
        }
        catch (error) {
            (0, channel_1.logError)("Error on initial Python interpreter auto-update.", error, "PYTHON_INITIAL_SET_INTERPRETER");
        }
    });
}
exports.installPythonInterpreterCheck = installPythonInterpreterCheck;
function setPythonInterpreterForPythonExtension(pythonExe, uri) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const extension = vscode_1.extensions.getExtension("ms-python.python");
        if (!extension) {
            return;
        }
        // Note: always set it in the workspace!
        let configurationTarget = vscode_1.ConfigurationTarget.Workspace;
        channel_1.OUTPUT_CHANNEL.appendLine("Setting the python executable path for vscode-python to be:\n" + pythonExe);
        if (((_b = (_a = extension === null || extension === void 0 ? void 0 : extension.exports) === null || _a === void 0 ? void 0 : _a.environment) === null || _b === void 0 ? void 0 : _b.setActiveInterpreter) !== undefined) {
            yield extension.exports.environment.setActiveInterpreter(pythonExe, uri);
            // OUTPUT_CHANNEL.appendLine("Is: " + (await extension.exports.environment.getActiveInterpreterPath(uri)));
        }
        else {
            let config = vscode_1.workspace.getConfiguration("python");
            yield config.update("pythonPath", pythonExe, configurationTarget);
            yield config.update("defaultInterpreterPath", pythonExe, configurationTarget);
            try {
                yield vscode_1.commands.executeCommand("python.clearWorkspaceInterpreter");
            }
            catch (err) {
                (0, channel_1.logError)("Error calling python.clearWorkspaceInterpreter", err, "ACT_CLEAR_PYTHON_WORKSPACE_INTERPRETER");
            }
        }
    });
}
exports.setPythonInterpreterForPythonExtension = setPythonInterpreterForPythonExtension;
function getPythonExecutable(resource = null, forceLoadFromConfig = false, showInOutput = true) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const extension = vscode_1.extensions.getExtension("ms-python.python");
            if (!extension) {
                channel_1.OUTPUT_CHANNEL.appendLine("Unable to get python executable from vscode-python. ms-python.python extension not found.");
                return undefined;
            }
            const usingNewInterpreterStorage = (_b = (_a = extension.packageJSON) === null || _a === void 0 ? void 0 : _a.featureFlags) === null || _b === void 0 ? void 0 : _b.usingNewInterpreterStorage;
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
                        yield extension.activate();
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
                    channel_1.OUTPUT_CHANNEL.appendLine("vscode-python execution details: " + execCommand);
                }
                if (!execCommand) {
                    channel_1.OUTPUT_CHANNEL.appendLine("vscode-python did not return proper execution details.");
                    return undefined;
                }
                if (execCommand instanceof Array) {
                    // It could be some composite command such as conda activate, but that's ok, we don't want to consider those
                    // a match for our use-case.
                    return execCommand.join(" ");
                }
                return execCommand;
            }
            else {
                // Not using new interpreter storage (so, it should be queried from the settings).
                if (!forceLoadFromConfig) {
                    return "config";
                }
                let config = vscode_1.workspace.getConfiguration("python");
                return yield config.get("pythonPath");
            }
        }
        catch (error) {
            (0, channel_1.logError)("Error when querying about python executable path from vscode-python.", error, "PYTHON_EXT_NO_PYTHON_EXECUTABLE");
            return undefined;
        }
    });
}
exports.getPythonExecutable = getPythonExecutable;
//# sourceMappingURL=pythonExtIntegration.js.map