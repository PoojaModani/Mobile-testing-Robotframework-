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
exports.LocatorsTreeDataProvider = void 0;
const vscode = require("vscode");
const roboCommands = require("./robocorpCommands");
const viewsCommon_1 = require("./viewsCommon");
class LocatorsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.lastRobotEntry = undefined;
    }
    fireRootChange() {
        this._onDidChangeTreeData.fire(null);
    }
    onRobotsTreeSelectionChanged(robotEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.lastRobotEntry && !robotEntry) {
                // nothing changed
                return;
            }
            if (!this.lastRobotEntry && robotEntry) {
                // i.e.: we didn't have a selection previously: refresh.
                this.fireRootChange();
                return;
            }
            if (!robotEntry && this.lastRobotEntry) {
                this.fireRootChange();
                return;
            }
            if (robotEntry.robot.filePath != this.lastRobotEntry.robot.filePath) {
                // i.e.: the selection changed: refresh.
                this.fireRootChange();
                return;
            }
        });
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            // i.e.: the contents of this tree depend on what's selected in the robots tree.
            const robotEntry = (0, viewsCommon_1.getSelectedRobot)();
            if (!robotEntry) {
                this.lastRobotEntry = undefined;
                return [
                    {
                        name: "<Waiting for Robot Selection...>",
                        type: "info",
                        line: 0,
                        column: 0,
                        filePath: undefined,
                    },
                ];
            }
            let actionResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_GET_LOCATORS_JSON_INFO, { "robotYaml": robotEntry.robot.filePath });
            if (!actionResult["success"]) {
                this.lastRobotEntry = undefined;
                return [
                    {
                        name: actionResult.message,
                        type: "error",
                        line: 0,
                        column: 0,
                        filePath: robotEntry.robot.filePath,
                    },
                ];
            }
            this.lastRobotEntry = robotEntry;
            return actionResult["result"];
        });
    }
    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.name);
        // https://microsoft.github.io/vscode-codicons/dist/codicon.html
        let iconPath = "file-media";
        if (element.type === "browser") {
            iconPath = "browser";
        }
        else if (element.type === "error") {
            iconPath = "error";
        }
        // Only add context to actual locator items
        if (element.type !== "error") {
            treeItem.contextValue = "locatorEntry";
        }
        treeItem.iconPath = new vscode.ThemeIcon(iconPath);
        return treeItem;
    }
}
exports.LocatorsTreeDataProvider = LocatorsTreeDataProvider;
//# sourceMappingURL=viewsLocators.js.map