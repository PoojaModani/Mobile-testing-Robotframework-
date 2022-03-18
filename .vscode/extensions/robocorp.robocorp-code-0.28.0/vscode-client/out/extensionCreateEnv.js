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
exports.getLanguageServerPythonInfoUncached = exports.createDefaultEnv = void 0;
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const files_1 = require("./files");
const rcc_1 = require("./rcc");
const time_1 = require("./time");
const subprocess_1 = require("./subprocess");
const time_2 = require("./time");
function enableWindowsLongPathSupport(rccLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            try {
                // Expected failure if not admin.
                yield (0, subprocess_1.execFilePromise)(rccLocation, ["configure", "longpaths", "--enable"], { env: Object.assign({}, process.env) });
                yield (0, time_2.sleep)(100);
            }
            catch (error) {
                // Expected error (it means we need an elevated shell to run the command).
                try {
                    // Now, at this point we resolve the links to have a canonical location, because
                    // we'll execute with a different user (i.e.: admin), we first resolve substs
                    // which may not be available for that user (i.e.: a subst can be applied to one
                    // account and not to the other) because path.resolve and fs.realPathSync don't
                    // seem to resolve substed drives, we do it manually here.
                    if (rccLocation.charAt(1) == ":") {
                        // Check that we actually have a drive there.
                        try {
                            let resolved = fs.readlinkSync(rccLocation.charAt(0) + ":");
                            rccLocation = path.join(resolved, rccLocation.slice(2));
                        }
                        catch (error) {
                            // ignore (it's not a link)
                        }
                    }
                    rccLocation = path.resolve(rccLocation);
                    rccLocation = fs.realpathSync(rccLocation);
                }
                catch (error) {
                    channel_1.OUTPUT_CHANNEL.appendLine("Error (handled) resolving rcc canonical location: " + error);
                }
                rccLocation = rccLocation.split("\\").join("/"); // escape for the shell execute
                let result = yield (0, subprocess_1.execFilePromise)("C:/Windows/System32/mshta.exe", // i.e.: Windows scripting
                [
                    "javascript: var shell = new ActiveXObject('shell.application');" + // create a shell
                        "shell.ShellExecute('" +
                        rccLocation +
                        "', 'configure longpaths --enable', '', 'runas', 1);close();", // runas will run in elevated mode
                ], { env: Object.assign({}, process.env) });
                // Wait a second for the command to be executed as admin before proceeding.
                yield (0, time_2.sleep)(1000);
            }
        }
        catch (error) {
            // Ignore here...
        }
    });
}
function isLongPathSupportEnabledOnWindows(rccLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        let enabled = true;
        try {
            let configureLongpathsOutput = yield (0, subprocess_1.execFilePromise)(rccLocation, ["configure", "longpaths"], {
                env: Object.assign({}, process.env),
            });
            if (configureLongpathsOutput.stdout.indexOf("OK.") != -1 ||
                configureLongpathsOutput.stderr.indexOf("OK.") != -1) {
                enabled = true;
            }
            else {
                enabled = false;
            }
        }
        catch (error) {
            enabled = false;
        }
        if (enabled) {
            channel_1.OUTPUT_CHANNEL.appendLine("Windows long paths support enabled");
        }
        else {
            channel_1.OUTPUT_CHANNEL.appendLine("Windows long paths support NOT enabled.");
        }
        return enabled;
    });
}
function verifyLongPathSupportOnWindows(rccLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.ROBOCORP_OVERRIDE_SYSTEM_REQUIREMENTS) {
            // i.e.: When set we do not try to check (this flag makes "rcc configure longpaths"
            // return an error).
            return true;
        }
        if (process.platform == "win32") {
            while (true) {
                let enabled = yield isLongPathSupportEnabledOnWindows(rccLocation);
                if (!enabled) {
                    const YES = "Yes (requires elevated shell)";
                    const MANUALLY = "Open manual instructions";
                    let result = yield vscode_1.window.showErrorMessage("Windows long paths support (required by Robocorp Code) is not enabled. Would you like to have Robocorp Code enable it now?", { "modal": true }, YES, MANUALLY
                    // Auto-cancel in modal
                    );
                    if (result == YES) {
                        // Enable it.
                        yield enableWindowsLongPathSupport(rccLocation);
                        let enabled = yield isLongPathSupportEnabledOnWindows(rccLocation);
                        if (enabled) {
                            return true;
                        }
                        else {
                            let result = yield vscode_1.window.showErrorMessage("It was not possible to automatically enable windows long path support. " +
                                "Please follow the instructions from https://robocorp.com/docs/troubleshooting/windows-long-path (press Ok to open in browser).", { "modal": true }, "Ok"
                            // Auto-cancel in modal
                            );
                            if (result == "Ok") {
                                yield vscode_1.env.openExternal(vscode_1.Uri.parse("https://robocorp.com/docs/troubleshooting/windows-long-path"));
                            }
                        }
                    }
                    else if (result == MANUALLY) {
                        yield vscode_1.env.openExternal(vscode_1.Uri.parse("https://robocorp.com/docs/troubleshooting/windows-long-path"));
                    }
                    else {
                        // Cancel
                        channel_1.OUTPUT_CHANNEL.appendLine("Extension will not be activated because Windows long paths support not enabled.");
                        return false;
                    }
                    result = yield vscode_1.window.showInformationMessage("Press Ok after Long Path support is manually enabled.", { "modal": true }, "Ok"
                    // Auto-cancel in modal
                    );
                    if (!result) {
                        channel_1.OUTPUT_CHANNEL.appendLine("Extension will not be activated because Windows long paths support not enabled.");
                        return false;
                    }
                }
                else {
                    return true;
                }
            }
        }
        return true;
    });
}
/**
 * @returns the result of running `get_env_info.py`.
 */
function createDefaultEnv(progress) {
    return __awaiter(this, void 0, void 0, function* () {
        let robotConda;
        switch (process.platform) {
            case "darwin":
                robotConda = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/conda_vscode_darwin_amd64.yaml");
                break;
            case "linux":
                robotConda = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/conda_vscode_linux_amd64.yaml");
                break;
            case "win32":
                robotConda = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/conda_vscode_windows_amd64.yaml");
                break;
            default:
                robotConda = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/conda.yaml");
                break;
        }
        if (!robotConda) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to find: ../../bin/create_env/conda.yaml in extension.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_CONDA_YAML_NOT_AVAILABLE");
            return;
        }
        const getEnvInfoPy = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/get_env_info.py");
        if (!getEnvInfoPy) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to find: ../../bin/create_env/get_env_info.py in extension.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_GET_ENV_INFO_FAIL");
            return;
        }
        let rccLocation = yield (0, rcc_1.getRccLocation)();
        if (!rccLocation) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to get rcc executable location.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_RCC_NOT_AVAILABLE");
            return;
        }
        // Check that the user has long names enabled on windows.
        if (!(yield verifyLongPathSupportOnWindows(rccLocation))) {
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_LONGPATH_SUPPORT");
            return undefined;
        }
        // Check that ROBOCORP_HOME is valid (i.e.: doesn't have any spaces in it).
        let robocorpHome = yield (0, rcc_1.getRobocorpHome)();
        let rccDiagnostics = yield (0, rcc_1.runConfigDiagnostics)(rccLocation, robocorpHome);
        if (!rccDiagnostics) {
            let msg = "There was an error getting RCC diagnostics. Robocorp Code will not be started!";
            channel_1.OUTPUT_CHANNEL.appendLine(msg);
            vscode_1.window.showErrorMessage(msg);
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_RCC_DIAGNOSTICS");
            return undefined;
        }
        while (!rccDiagnostics.isRobocorpHomeOk()) {
            const SELECT_ROBOCORP_HOME = "Set new ROBOCORP_HOME";
            const CANCEL = "Cancel";
            let result = yield vscode_1.window.showInformationMessage("The current ROBOCORP_HOME is invalid (paths with spaces/non ascii chars are not supported).", SELECT_ROBOCORP_HOME, CANCEL);
            if (!result || result == CANCEL) {
                channel_1.OUTPUT_CHANNEL.appendLine("Cancelled setting new ROBOCORP_HOME.");
                (0, rcc_1.feedbackRobocorpCodeError)("INIT_INVALID_ROBOCORP_HOME");
                return undefined;
            }
            let uriResult = yield vscode_1.window.showOpenDialog({
                "canSelectFolders": true,
                "canSelectFiles": false,
                "canSelectMany": false,
                "openLabel": "Set as ROBOCORP_HOME",
            });
            if (!uriResult) {
                channel_1.OUTPUT_CHANNEL.appendLine("Cancelled getting ROBOCORP_HOME path.");
                (0, rcc_1.feedbackRobocorpCodeError)("INIT_CANCELLED_ROBOCORP_HOME");
                return undefined;
            }
            if (uriResult.length != 1) {
                channel_1.OUTPUT_CHANNEL.appendLine("Expected 1 path to set as ROBOCORP_HOME. Found: " + uriResult.length);
                (0, rcc_1.feedbackRobocorpCodeError)("INIT_ROBOCORP_HOME_NO_PATH");
                return undefined;
            }
            robocorpHome = uriResult[0].fsPath;
            rccDiagnostics = yield (0, rcc_1.runConfigDiagnostics)(rccLocation, robocorpHome);
            if (!rccDiagnostics) {
                let msg = "There was an error getting RCC diagnostics. Robocorp Code will not be started!";
                channel_1.OUTPUT_CHANNEL.appendLine(msg);
                vscode_1.window.showErrorMessage(msg);
                (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_RCC_DIAGNOSTICS_2");
                return undefined;
            }
            if (rccDiagnostics.isRobocorpHomeOk()) {
                channel_1.OUTPUT_CHANNEL.appendLine("Selected ROBOCORP_HOME: " + robocorpHome);
                let config = vscode_1.workspace.getConfiguration("robocorp");
                yield config.update("home", robocorpHome, vscode_1.ConfigurationTarget.Global);
            }
        }
        function createOpenUrl(failedCheck) {
            return (value) => {
                if (value == "Open troubleshoot URL") {
                    vscode_1.env.openExternal(vscode_1.Uri.parse(failedCheck.url));
                }
            };
        }
        let canProceed = true;
        for (const failedCheck of rccDiagnostics.failedChecks) {
            if (failedCheck.status == rcc_1.STATUS_FATAL) {
                canProceed = false;
            }
            let func = vscode_1.window.showErrorMessage;
            if (failedCheck.status == rcc_1.STATUS_WARNING) {
                func = vscode_1.window.showWarningMessage;
            }
            if (failedCheck.url) {
                func(failedCheck.message, "Open troubleshoot URL").then(createOpenUrl(failedCheck));
            }
            else {
                func(failedCheck.message);
            }
        }
        if (!canProceed) {
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_RCC_STATUS_FATAL");
            return undefined;
        }
        progress.report({ message: "Update env (may take a few minutes)." });
        // Get information on a base package with our basic dependencies (this can take a while...).
        let rccEnvPromise = (0, rcc_1.collectBaseEnv)(robotConda, robocorpHome);
        let timing = new time_1.Timing();
        let finishedCondaRun = false;
        let onFinish = function () {
            finishedCondaRun = true;
        };
        rccEnvPromise.then(onFinish, onFinish);
        // Busy async loop so that we can show the elapsed time.
        while (true) {
            yield (0, time_2.sleep)(93); // Strange sleep so it's not always a .0 when showing ;)
            if (finishedCondaRun) {
                break;
            }
            if (timing.elapsedFromLastMeasurement(5000)) {
                progress.report({
                    message: "Update env (may take a few minutes). " + timing.getTotalElapsedAsStr() + " elapsed.",
                });
            }
        }
        let envResult = yield rccEnvPromise;
        channel_1.OUTPUT_CHANNEL.appendLine("Took: " + timing.getTotalElapsedAsStr() + " to update conda env.");
        if (!envResult) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error creating conda env.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_ERROR_CONDA_ENV");
            return undefined;
        }
        // Ok, we now have the holotree space created and just collected the environment variables. Let's now do
        // a raw python run with that information to collect information from python.
        let pythonExe = envResult.env["PYTHON_EXE"];
        if (!pythonExe) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error: PYTHON_EXE not available in the holotree environment.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_PYTHON_EXE_IN_HOLOTREE");
            return undefined;
        }
        let pythonTiming = new time_1.Timing();
        let resultPromise = (0, subprocess_1.execFilePromise)(pythonExe, [getEnvInfoPy], { env: envResult.env });
        let finishedPythonRun = false;
        let onFinishPython = function () {
            finishedPythonRun = true;
        };
        resultPromise.then(onFinishPython, onFinishPython);
        // Busy async loop so that we can show the elapsed time.
        while (true) {
            yield (0, time_2.sleep)(93); // Strange sleep so it's not always a .0 when showing ;)
            if (finishedPythonRun) {
                break;
            }
            if (timing.elapsedFromLastMeasurement(5000)) {
                progress.report({ message: "Collecting env info. " + timing.getTotalElapsedAsStr() + " elapsed." });
            }
        }
        let ret = yield resultPromise;
        channel_1.OUTPUT_CHANNEL.appendLine("Took: " + pythonTiming.getTotalElapsedAsStr() + " to collect python info.");
        return ret;
    });
}
exports.createDefaultEnv = createDefaultEnv;
function getLanguageServerPythonInfoUncached() {
    return __awaiter(this, void 0, void 0, function* () {
        let robotYaml = (0, files_1.getExtensionRelativeFile)("../../bin/create_env/robot.yaml");
        if (!robotYaml) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to find: ../../bin/create_env/robot.yaml in extension.");
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_ROBOT_YAML_NOT_AVAILABLE");
            return;
        }
        let result = yield vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: "Robocorp",
            cancellable: false,
        }, createDefaultEnv);
        function disabled(msg) {
            msg = "Robocorp Code extension disabled. Reason: " + msg;
            channel_1.OUTPUT_CHANNEL.appendLine(msg);
            vscode_1.window.showErrorMessage(msg);
            channel_1.OUTPUT_CHANNEL.show();
            return undefined;
        }
        if (!result) {
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_PYTHON_LANGUAGE_SERVER");
            return disabled("Unable to get python to launch language server.");
        }
        try {
            let jsonContents = result.stderr;
            let start = jsonContents.indexOf("JSON START>>");
            let end = jsonContents.indexOf("<<JSON END");
            if (start == -1 || end == -1) {
                (0, rcc_1.feedbackRobocorpCodeError)("INIT_NO_JSON_START_END");
                throw Error("Unable to find JSON START>> or <<JSON END");
            }
            start += "JSON START>>".length;
            jsonContents = jsonContents.substr(start, end - start);
            let contents = JSON.parse(jsonContents);
            let pythonExe = contents["python_executable"];
            channel_1.OUTPUT_CHANNEL.appendLine("Python executable: " + pythonExe);
            channel_1.OUTPUT_CHANNEL.appendLine("Python version: " + contents["python_version"]);
            channel_1.OUTPUT_CHANNEL.appendLine("Robot Version: " + contents["robot_version"]);
            let env = contents["environment"];
            if (!env) {
                channel_1.OUTPUT_CHANNEL.appendLine("Environment: NOT received");
            }
            else {
                // Print some env vars we may care about:
                channel_1.OUTPUT_CHANNEL.appendLine("Environment:");
                channel_1.OUTPUT_CHANNEL.appendLine("    PYTHONPATH: " + env["PYTHONPATH"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    APPDATA: " + env["APPDATA"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    HOMEDRIVE: " + env["HOMEDRIVE"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    HOMEPATH: " + env["HOMEPATH"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    HOME: " + env["HOME"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    ROBOT_ROOT: " + env["ROBOT_ROOT"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    ROBOT_ARTIFACTS: " + env["ROBOT_ARTIFACTS"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    RCC_INSTALLATION_ID: " + env["RCC_INSTALLATION_ID"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    ROBOCORP_HOME: " + env["ROBOCORP_HOME"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    PROCESSOR_ARCHITECTURE: " + env["PROCESSOR_ARCHITECTURE"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    OS: " + env["OS"]);
                channel_1.OUTPUT_CHANNEL.appendLine("    PATH: " + env["PATH"]);
            }
            if ((0, files_1.verifyFileExists)(pythonExe)) {
                return {
                    pythonExe: pythonExe,
                    environ: contents["environment"],
                    additionalPythonpathEntries: [],
                };
            }
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_PYTHON_LS_DOES_NOT_EXIST");
            return disabled("Python executable: " + pythonExe + " does not exist.");
        }
        catch (error) {
            (0, rcc_1.feedbackRobocorpCodeError)("INIT_UNEXPECTED");
            return disabled("Unable to get python to launch language server.\nStderr: " +
                result.stderr +
                "\nStdout (json contents): " +
                result.stdout);
        }
    });
}
exports.getLanguageServerPythonInfoUncached = getLanguageServerPythonInfoUncached;
//# sourceMappingURL=extensionCreateEnv.js.map