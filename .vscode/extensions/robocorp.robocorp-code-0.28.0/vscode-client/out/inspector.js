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
exports._internalOpenRobocorpInspector = exports.openRobocorpInspector = void 0;
const path = require("path");
const vscode_1 = require("vscode");
const extension_1 = require("./extension");
const files_1 = require("./files");
const activities_1 = require("./activities");
const viewsCommon_1 = require("./viewsCommon");
const subprocess_1 = require("./subprocess");
const channel_1 = require("./channel");
let _openingInspector = false;
let _startingRootWindowNotified = false;
function openRobocorpInspector(locatorType, locator) {
    return __awaiter(this, void 0, void 0, function* () {
        if (locatorType === "windows" && process.platform !== "win32") {
            vscode_1.window.showInformationMessage("This feature is Windows specific and not supported on other platforms.");
            return; // Windows only feature
        }
        if (_openingInspector) {
            if (!_startingRootWindowNotified) {
                return; // We should be showing the progress already, so, don't do anything.
            }
            vscode_1.window.showInformationMessage("The Locators UI is already opened, so, please use the existing UI (or close it/wait for it to be closed).");
            return;
        }
        try {
            _openingInspector = true;
            return yield _internalOpenRobocorpInspector(locatorType, locator);
        }
        finally {
            _openingInspector = false;
            _startingRootWindowNotified = false;
        }
    });
}
exports.openRobocorpInspector = openRobocorpInspector;
function _internalOpenRobocorpInspector(locatorType, locator) {
    return __awaiter(this, void 0, void 0, function* () {
        let locatorJson;
        const args = [];
        let selectedEntry = (0, viewsCommon_1.getSelectedRobot)({
            noSelectionMessage: "Please select a robot first.",
        });
        let robot = selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.robot;
        if (!robot) {
            // Ask for the robot to be used and then show dialog with the options.
            robot = yield (0, activities_1.listAndAskRobotSelection)("Please select the Robot where the locators should be saved.", "Unable to create locator (no Robot detected in the Workspace).");
            if (!robot) {
                return;
            }
        }
        locatorJson = path.join(robot.directory, "locators.json");
        locatorJson = (0, files_1.verifyFileExists)(locatorJson, false) ? locatorJson : undefined;
        const inspectorLaunchInfo = yield (0, extension_1.getLanguageServerPythonInfo)();
        if (!inspectorLaunchInfo) {
            channel_1.OUTPUT_CHANNEL.appendLine("Unable to get Robocorp Inspector launch info.");
            return;
        }
        // add locators.json path to args
        if (locatorJson) {
            args.push("--database", locatorJson);
        }
        // if locatorType is given prioritize that. Else Ensure that a locator is selected!
        if (locatorType) {
            args.push("add");
            args.push(locatorType);
        }
        else {
            const locatorSelected = locator !== null && locator !== void 0 ? locator : (yield (0, viewsCommon_1.getSelectedLocator)({
                noSelectionMessage: "Please select a locator first.",
                moreThanOneSelectionMessage: "Please select only one locator.",
            }));
            if (locatorSelected.type === "error") {
                channel_1.OUTPUT_CHANNEL.appendLine("Trying to edit non-existing locator.");
                return;
            }
            if (locatorSelected) {
                args.push("edit", locatorSelected.name);
            }
            else {
                channel_1.OUTPUT_CHANNEL.appendLine("Unable to open Robocorp Inspector. Select a locator first.");
                return;
            }
        }
        let resolveProgress = undefined;
        vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: "Robocorp",
            cancellable: false,
        }, (progress) => {
            progress.report({ message: "Opening Inspector..." });
            return new Promise((resolve) => {
                resolveProgress = resolve;
            });
        });
        try {
            // Required due to how conda packages python, and MacOS requiring
            // a signed package for displaying windows (supplied through python.app)
            function replaceNewLines(s) {
                return s.replace(/(?:\r\n|\r|\n)/g, "\n  i> ");
            }
            let first = true;
            function append(s) {
                if (first) {
                    channel_1.OUTPUT_CHANNEL.append("  i> ");
                    first = false;
                }
                channel_1.OUTPUT_CHANNEL.append(replaceNewLines(s));
            }
            const configChildProcess = function (childProcess) {
                childProcess.stderr.on("data", function (data) {
                    const s = "" + data;
                    append(s);
                    if (s.includes("Starting root window")) {
                        _startingRootWindowNotified = true;
                        resolveProgress();
                    }
                });
                childProcess.stdout.on("data", function (data) {
                    append("" + data);
                });
            };
            const pythonExecutablePath = process.platform === "darwin"
                ? path.join(path.dirname(inspectorLaunchInfo.pythonExe), "pythonw")
                : inspectorLaunchInfo.pythonExe;
            const launchResult = yield startInspectorCLI(pythonExecutablePath, args, robot.directory, inspectorLaunchInfo.environ, configChildProcess);
        }
        finally {
            resolveProgress();
        }
    });
}
exports._internalOpenRobocorpInspector = _internalOpenRobocorpInspector;
function startInspectorCLI(pythonExecutable, args, cwd, environ, configChildProcess) {
    return __awaiter(this, void 0, void 0, function* () {
        const inspectorCmd = ["-m", "inspector.cli"];
        const completeArgs = inspectorCmd.concat(args);
        channel_1.OUTPUT_CHANNEL.appendLine(`Using cwd root for inspector: "${cwd}"`);
        return (0, subprocess_1.execFilePromise)(pythonExecutable, completeArgs, {
            env: (0, subprocess_1.mergeEnviron)(environ),
            cwd,
        }, {
            "configChildProcess": configChildProcess,
        });
    });
}
//# sourceMappingURL=inspector.js.map