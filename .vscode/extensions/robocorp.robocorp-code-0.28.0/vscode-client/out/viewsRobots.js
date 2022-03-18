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
exports.RobotsTreeDataProvider = void 0;
const vscode = require("vscode");
const channel_1 = require("./channel");
const files_1 = require("./files");
const roboCommands = require("./robocorpCommands");
const viewsCommon_1 = require("./viewsCommon");
let _globalSentMetric = false;
function empty(array) {
    return array === undefined || array.length === 0;
}
function getRobotLabel(robotInfo) {
    let label = undefined;
    if (robotInfo.yamlContents) {
        label = robotInfo.yamlContents["name"];
    }
    if (!label) {
        if (robotInfo.directory) {
            label = (0, viewsCommon_1.basename)(robotInfo.directory);
        }
    }
    if (!label) {
        label = "";
    }
    return label;
}
class RobotsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._onForceSelectionFromTreeData = new vscode.EventEmitter();
        this.onForceSelectionFromTreeData = this._onForceSelectionFromTreeData.event;
        this.lastRoot = undefined;
    }
    fireRootChange() {
        this._onDidChangeTreeData.fire(null);
    }
    /**
     * Note that we make sure to only return valid entries here (i.e.: no entries
     * where RobotEntry.type === RobotEntryType.Error).
     */
    getValidCachedOrComputeChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (element === undefined) {
                if (this.lastRoot !== undefined) {
                    let ret = this.lastRoot.filter((e) => {
                        return e.type !== viewsCommon_1.RobotEntryType.Error;
                    });
                    if (ret.length > 0) {
                        // We need to check whether entries still exist.
                        let foundAll = true;
                        for (const entry of ret) {
                            if (!(yield (0, files_1.uriExists)(entry.uri))) {
                                foundAll = false;
                                break;
                            }
                        }
                        if (foundAll) {
                            return ret;
                        }
                    }
                }
            }
            let ret = yield this.getChildren(element);
            // Remove any "error" entries
            return ret.filter((e) => {
                return e.type !== viewsCommon_1.RobotEntryType.Error;
            });
        });
    }
    /**
     * This function will compute the children and store the `lastRoot`
     * cache (if element === undefined).
     */
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = yield this.computeChildren(element);
            if (element === undefined) {
                // i.e.: this is the root entry, so, we've
                // collected the actual robots here.
                let notifySelection = false;
                if (empty(this.lastRoot) && empty(ret)) {
                    // Don't notify of anything, nothing changed...
                }
                else if (empty(this.lastRoot)) {
                    // We had nothing and now we have something, notify.
                    if (!empty(ret)) {
                        notifySelection = true;
                    }
                }
                else {
                    // lastRoot is valid
                    // We had something and now we have nothing, notify.
                    if (empty(ret)) {
                        notifySelection = true;
                    }
                }
                if (!empty(ret) && !notifySelection) {
                    // Verify if the last selection is still valid (if it's not we need
                    // to notify).
                    let currentSelectedRobot = (0, viewsCommon_1.getSelectedRobot)();
                    let found = false;
                    for (const entry of ret) {
                        if (currentSelectedRobot == entry) {
                            found = true;
                        }
                    }
                    if (!found) {
                        notifySelection = true;
                    }
                }
                this.lastRoot = ret;
                if (notifySelection) {
                    setTimeout(() => {
                        this._onForceSelectionFromTreeData.fire(this.lastRoot);
                    }, 50);
                }
                if (ret.length === 0) {
                    // No robot was actually found, so, we'll return a dummy entry
                    // giving more instructions to the user.
                    let added = false;
                    for (const label of [
                        "No robots found.",
                        "Three ways to get started:",
                        "➔ Run the “Robocorp: Create Robot” action",
                        "➔ Open a robot folder (with a “robot.yaml” file)",
                        "➔ Open a parent folder (with multiple robots)",
                    ]) {
                        ret.push({
                            "label": label,
                            "uri": undefined,
                            "robot": undefined,
                            "taskName": undefined,
                            "iconPath": added ? "" : "error",
                            "type": viewsCommon_1.RobotEntryType.Error,
                            "parent": element,
                        });
                        added = true;
                    }
                }
            }
            return ret;
        });
    }
    getParent(element) {
        return __awaiter(this, void 0, void 0, function* () {
            return element.parent;
        });
    }
    computeChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (element) {
                if (element.type === viewsCommon_1.RobotEntryType.Error) {
                    return [];
                }
                // Get child elements.
                if (element.type === viewsCommon_1.RobotEntryType.Task) {
                    return []; // Tasks don't have children.
                }
                let yamlContents = element.robot.yamlContents;
                if (!yamlContents) {
                    return [];
                }
                let tasks = yamlContents["tasks"];
                if (!tasks) {
                    return [];
                }
                const robotInfo = element.robot;
                return Object.keys(tasks).map((task) => ({
                    "label": task,
                    "uri": vscode.Uri.file(robotInfo.filePath),
                    "robot": robotInfo,
                    "taskName": task,
                    "iconPath": "debug-alt-small",
                    "type": viewsCommon_1.RobotEntryType.Task,
                    "parent": element,
                }));
            }
            if (!_globalSentMetric) {
                _globalSentMetric = true;
                vscode.commands.executeCommand(roboCommands.ROBOCORP_SEND_METRIC, {
                    "name": "vscode.treeview.used",
                    "value": "1",
                });
            }
            // Get root elements.
            let actionResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_LOCAL_LIST_ROBOTS_INTERNAL);
            if (!actionResult.success) {
                channel_1.OUTPUT_CHANNEL.appendLine(actionResult.message);
                return [];
            }
            let robotsInfo = actionResult.result;
            if (empty(robotsInfo)) {
                return [];
            }
            return robotsInfo.map((robotInfo) => ({
                "label": getRobotLabel(robotInfo),
                "uri": vscode.Uri.file(robotInfo.filePath),
                "robot": robotInfo,
                "iconPath": "package",
                "type": viewsCommon_1.RobotEntryType.Robot,
                "parent": element,
            }));
        });
    }
    getTreeItem(element) {
        const isTask = element.type === viewsCommon_1.RobotEntryType.Task;
        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
        if (element.type === viewsCommon_1.RobotEntryType.Robot) {
            treeItem.contextValue = "robotItem";
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        }
        else if (isTask) {
            treeItem.contextValue = "taskItem";
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
        else if (element.type === viewsCommon_1.RobotEntryType.Error) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
        if (element.iconPath) {
            treeItem.iconPath = new vscode.ThemeIcon(element.iconPath);
        }
        return treeItem;
    }
}
exports.RobotsTreeDataProvider = RobotsTreeDataProvider;
//# sourceMappingURL=viewsRobots.js.map