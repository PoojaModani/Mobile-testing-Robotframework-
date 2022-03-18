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
exports.registerDebugger = exports.RobocorpCodeDebugConfigurationProvider = void 0;
const path = require("path");
const fs = require("fs");
const vscode_1 = require("vscode");
const roboConfig = require("./robocorpSettings");
const channel_1 = require("./channel");
const activities_1 = require("./activities");
const robocorpCommands_1 = require("./robocorpCommands");
const extension_1 = require("./extension");
class RobocorpCodeDebugConfigurationProvider {
    provideDebugConfigurations(folder, token) {
        let configurations = [];
        configurations.push({
            "type": "robocorp-code",
            "name": "Robocorp Code: Launch task from robot.yaml",
            "request": "launch",
            "robot": '^"\\${file}"',
            "task": "",
        });
        return configurations;
    }
    resolveDebugConfigurationWithSubstitutedVariables(folder, debugConfiguration, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(debugConfiguration.robot)) {
                vscode_1.window.showWarningMessage('Error. Expected: specified "robot": ' + debugConfiguration.robot + " to exist.");
                return;
            }
            let interpreter = undefined;
            let interpreterResult = yield (0, activities_1.resolveInterpreter)(debugConfiguration.robot);
            if (!interpreterResult.success) {
                vscode_1.window.showWarningMessage("Error resolving interpreter info: " + interpreterResult.message);
                return;
            }
            interpreter = interpreterResult.result;
            if (!interpreter) {
                vscode_1.window.showWarningMessage("Unable to resolve interpreter for: " + debugConfiguration.robot);
                return;
            }
            if (!interpreter.environ) {
                vscode_1.window.showErrorMessage("Unable to resolve interpreter environment based on: " + debugConfiguration.robot);
                return;
            }
            // Resolve environment
            let env = interpreter.environ;
            try {
                let newEnv = yield vscode_1.commands.executeCommand(robocorpCommands_1.ROBOCORP_UPDATE_LAUNCH_ENV, {
                    "targetRobot": debugConfiguration.robot,
                    "env": env,
                });
                if (newEnv === "cancelled") {
                    channel_1.OUTPUT_CHANNEL.appendLine("Launch cancelled");
                    return;
                }
                else {
                    env = newEnv;
                }
            }
            catch (error) {
                // The command may not be available.
            }
            if (debugConfiguration.noDebug) {
                let vaultInfoActionResult = yield vscode_1.commands.executeCommand(robocorpCommands_1.ROBOCORP_GET_CONNECTED_VAULT_WORKSPACE_INTERNAL);
                if ((vaultInfoActionResult === null || vaultInfoActionResult === void 0 ? void 0 : vaultInfoActionResult.success) && vaultInfoActionResult.result) {
                    debugConfiguration.workspaceId = vaultInfoActionResult.result.workspaceId;
                }
                // Not running with debug: just use rcc to launch.
                debugConfiguration.env = env;
                return debugConfiguration;
            }
            // If it's a debug run, we need to get the input contents -- something as:
            // "type": "robocorp-code",
            // "name": "Robocorp Code: Launch task from current robot.yaml",
            // "request": "launch",
            // "robot": "c:/robot.yaml",
            // "task": "entrypoint",
            //
            // and convert it to the contents expected by robotframework-lsp:
            //
            // "type": "robotframework-lsp",
            // "name": "Robot: Current File",
            // "request": "launch",
            // "cwd": "${workspaceFolder}",
            // "target": "c:/task.robot",
            //
            // (making sure that we can actually do this and it's a robot launch for the task)
            let actionResult = yield vscode_1.commands.executeCommand(robocorpCommands_1.ROBOCORP_COMPUTE_ROBOT_LAUNCH_FROM_ROBOCORP_CODE_LAUNCH, {
                "name": debugConfiguration.name,
                "request": debugConfiguration.request,
                "robot": debugConfiguration.robot,
                "task": debugConfiguration.task,
                "additionalPythonpathEntries": interpreter.additionalPythonpathEntries,
                "env": env,
                "pythonExe": interpreter.pythonExe,
            });
            if (!actionResult.success) {
                vscode_1.window.showErrorMessage(actionResult.message);
                return;
            }
            let result = actionResult.result;
            if (result && result.type && result.type == "python") {
                let extension = vscode_1.extensions.getExtension("ms-python.python");
                if (extension) {
                    if (!extension.isActive) {
                        // i.e.: Auto-activate python extension for the launch as the extension
                        // is only activated for debug on the resolution, whereas in this case
                        // the launch is already resolved.
                        yield extension.activate();
                    }
                }
            }
            return result;
        });
    }
}
exports.RobocorpCodeDebugConfigurationProvider = RobocorpCodeDebugConfigurationProvider;
function registerDebugger() {
    function createDebugAdapterExecutable(config) {
        return __awaiter(this, void 0, void 0, function* () {
            let env = config.env;
            if (!env) {
                env = {};
            }
            let robotHome = roboConfig.getHome();
            if (robotHome && robotHome.length > 0) {
                if (env) {
                    env["ROBOCORP_HOME"] = robotHome;
                }
                else {
                    env = { "ROBOCORP_HOME": robotHome };
                }
            }
            let targetMain = path.resolve(__dirname, "../../src/robocorp_code_debug_adapter/__main__.py");
            if (!fs.existsSync(targetMain)) {
                vscode_1.window.showWarningMessage("Error. Expected: " + targetMain + " to exist.");
                return;
            }
            if (!extension_1.globalCachedPythonInfo) {
                vscode_1.window.showWarningMessage("Error. Expected globalCachedPythonInfo to be set when launching debugger.");
                return;
            }
            const pythonExecutable = extension_1.globalCachedPythonInfo.pythonExe;
            if (!fs.existsSync(pythonExecutable)) {
                vscode_1.window.showWarningMessage("Error. Expected: " + pythonExecutable + " to exist.");
                return;
            }
            if (env) {
                return new vscode_1.DebugAdapterExecutable(pythonExecutable, ["-u", targetMain], { "env": env });
            }
            else {
                return new vscode_1.DebugAdapterExecutable(pythonExecutable, ["-u", targetMain]);
            }
        });
    }
    vscode_1.debug.registerDebugAdapterDescriptorFactory("robocorp-code", {
        createDebugAdapterDescriptor: (session) => {
            const config = session.configuration;
            return createDebugAdapterExecutable(config);
        },
    });
    vscode_1.debug.registerDebugConfigurationProvider("robocorp-code", new RobocorpCodeDebugConfigurationProvider());
}
exports.registerDebugger = registerDebugger;
//# sourceMappingURL=debugger.js.map