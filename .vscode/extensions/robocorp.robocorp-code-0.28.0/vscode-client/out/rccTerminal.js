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
exports.createRccTerminal = exports.askAndCreateRccTerminal = void 0;
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const pathModule = require("path");
const activities_1 = require("./activities");
const rcc_1 = require("./rcc");
const subprocess_1 = require("./subprocess");
function askAndCreateRccTerminal() {
    return __awaiter(this, void 0, void 0, function* () {
        let robot = yield (0, activities_1.listAndAskRobotSelection)("Please select the target Robot for the terminal.", "Unable to create terminal (no Robot detected in the Workspace).");
        if (robot) {
            yield createRccTerminal(robot);
        }
    });
}
exports.askAndCreateRccTerminal = askAndCreateRccTerminal;
function createRccTerminal(robotInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        if (robotInfo) {
            function startShell(progress) {
                return __awaiter(this, void 0, void 0, function* () {
                    const rccLocation = yield (0, rcc_1.getRccLocation)();
                    if (!rccLocation) {
                        let msg = "Unable to find RCC.";
                        channel_1.OUTPUT_CHANNEL.appendLine("Unable to collect environment to create terminal with RCC:" +
                            rccLocation +
                            " for Robot: " +
                            robotInfo.name);
                        vscode_1.window.showErrorMessage("Unable to find RCC.");
                        return;
                    }
                    let result = yield (0, activities_1.resolveInterpreter)(robotInfo.filePath);
                    if (!result.success) {
                        vscode_1.window.showWarningMessage("Error resolving interpreter info: " + result.message);
                        return;
                    }
                    let interpreter = result.result;
                    if (!interpreter || !interpreter.pythonExe) {
                        vscode_1.window.showWarningMessage("Unable to obtain interpreter information from: " + robotInfo.filePath);
                        return;
                    }
                    let env = (0, subprocess_1.mergeEnviron)();
                    // Update env to contain rcc location.
                    if (interpreter.environ) {
                        for (let key of Object.keys(interpreter.environ)) {
                            let value = interpreter.environ[key];
                            let isPath = false;
                            if (process.platform == "win32") {
                                key = key.toUpperCase();
                                if (key == "PATH") {
                                    isPath = true;
                                }
                            }
                            else {
                                if (key == "PATH") {
                                    isPath = true;
                                }
                            }
                            if (isPath) {
                                value = pathModule.dirname(rccLocation) + pathModule.delimiter + value;
                            }
                            env[key] = value;
                        }
                    }
                    channel_1.OUTPUT_CHANNEL.appendLine("Create terminal with RCC:" + rccLocation + " for Robot: " + robotInfo.name);
                    const terminal = vscode_1.window.createTerminal({
                        name: robotInfo.name + " Robot environment",
                        env: env,
                        cwd: pathModule.dirname(robotInfo.filePath),
                    });
                    terminal.show();
                    return undefined;
                });
            }
            yield vscode_1.window.withProgress({
                location: vscode_1.ProgressLocation.Notification,
                title: "Robocorp: start RCC shell for: " + robotInfo.name + " Robot",
                cancellable: false,
            }, startShell);
        }
    });
}
exports.createRccTerminal = createRccTerminal;
//# sourceMappingURL=rccTerminal.js.map