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
exports.WorkItemsTreeDataProvider = exports.openWorkItemHelp = exports.deleteWorkItemInWorkItemsTree = exports.newWorkItemInWorkItemsTree = exports.convertOutputWorkItemToInput = void 0;
const vscode = require("vscode");
const path_1 = require("path");
const channel_1 = require("./channel");
const robocorpCommands_1 = require("./robocorpCommands");
const viewsCommon_1 = require("./viewsCommon");
const robocorpViews_1 = require("./robocorpViews");
const viewsRobotSelectionTreeBase_1 = require("./viewsRobotSelectionTreeBase");
const activities_1 = require("./activities");
const rcc_1 = require("./rcc");
const WORK_ITEM_TEMPLATE = `[
  {
      "payload": {
         "message": "Hello World!"
      },
      "files": {
          "orders.xlsx": "orders.xlsx"
      }
  }
]`;
function getWorkItemInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        let workItemsTreeDataProvider = (viewsCommon_1.treeViewIdToTreeDataProvider.get(robocorpViews_1.TREE_VIEW_ROBOCORP_WORK_ITEMS_TREE));
        if (workItemsTreeDataProvider) {
            let workItemsInfo = workItemsTreeDataProvider.getWorkItemsInfo();
            if (workItemsInfo) {
                // If the tree is available and the info was loaded, use it.
                return workItemsInfo;
            }
        }
        // In general we shouldn't really use this code (as the action which uses this function
        // can only be activated from the tree, but let's leave it as a fallback in case we
        // do want it in the future).
        const currTreeDir = yield (0, viewsRobotSelectionTreeBase_1.getCurrRobotDir)();
        if (!currTreeDir) {
            return;
        }
        const workItemsResult = yield vscode.commands.executeCommand(robocorpCommands_1.ROBOCORP_LIST_WORK_ITEMS_INTERNAL, { robot: (0, path_1.resolve)(currTreeDir.filePath), "increment_output": false });
        if (!workItemsResult.success) {
            return;
        }
        return workItemsResult.result;
    });
}
function createNewWorkItem(workItemInfo, workItemName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (workItemName) {
            workItemName = workItemName.trim();
        }
        if (!(workItemInfo === null || workItemInfo === void 0 ? void 0 : workItemInfo.input_folder_path) || !workItemName) {
            return;
        }
        const targetFolder = (0, path_1.join)(workItemInfo.input_folder_path, workItemName);
        const targetFile = (0, path_1.join)(targetFolder, "work-items.json");
        try {
            let fileUri = vscode.Uri.file(targetFile);
            try {
                yield vscode.workspace.fs.stat(fileUri); // this will raise if the file doesn't exist.
                let OVERRIDE = "Override";
                let ret = yield vscode.window.showInformationMessage("File " + targetFile + " already exists.", { "modal": true }, OVERRIDE);
                if (ret != OVERRIDE) {
                    return;
                }
            }
            catch (err) {
                // ok, file does not exist
            }
            // No need to await.
            (0, rcc_1.feedback)("vscode.workitem.input.created");
            yield vscode.workspace.fs.createDirectory(vscode.Uri.file(targetFolder));
            yield vscode.workspace.fs.writeFile(fileUri, Buffer.from(WORK_ITEM_TEMPLATE));
            vscode.window.showTextDocument(fileUri);
        }
        catch (err) {
            (0, channel_1.logError)("Unable to create file.", err, "WORK_ITEM_CREATE");
            vscode.window.showErrorMessage("Unable to create file. Error: " + err.message);
        }
    });
}
function convertOutputWorkItemToInput(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (item && item.kind == "outputWorkItem" && item.workItem) {
            let workItemInfo = yield getWorkItemInfo();
            if (!(workItemInfo === null || workItemInfo === void 0 ? void 0 : workItemInfo.input_folder_path)) {
                vscode.window.showErrorMessage("Unable to convert output work item to input because input folder could not be found.");
                return;
            }
            let workItemName = yield vscode.window.showInputBox({
                "prompt": "Please provide name for converted input work item",
                "ignoreFocusOut": true,
            });
            if (!workItemName) {
                return;
            }
            let target = (0, path_1.join)(workItemInfo.input_folder_path, workItemName);
            try {
                let stat = yield vscode.workspace.fs.stat(vscode.Uri.file(target));
                // Target already exists...
                let OVERRIDE = "Override";
                let ret = yield vscode.window.showInformationMessage("File " + target + " already exists.", { "modal": true }, OVERRIDE);
                if (ret != OVERRIDE) {
                    return;
                }
            }
            catch (error) {
                // Ok, does not exist
            }
            try {
                let workItem = item.workItem;
                // Call to make sure that it exists.
                yield vscode.workspace.fs.createDirectory(vscode.Uri.file(workItemInfo.input_folder_path));
                yield vscode.workspace.fs.copy(vscode.Uri.file((0, path_1.dirname)(workItem.json_path)), // src
                vscode.Uri.file(target), // dest
                { "overwrite": true });
                vscode.window.showInformationMessage("Finished converting output work item to input work item.");
            }
            catch (error) {
                let msg = "Error converting output work item to input.";
                (0, channel_1.logError)(msg, error, "WORKITEM_CONVERT");
                vscode.window.showErrorMessage(msg);
            }
        }
    });
}
exports.convertOutputWorkItemToInput = convertOutputWorkItemToInput;
function newWorkItemInWorkItemsTree() {
    return __awaiter(this, void 0, void 0, function* () {
        const workItemInfo = yield getWorkItemInfo();
        let workItemName = yield vscode.window.showInputBox({
            "prompt": "Please provide work item name",
            "ignoreFocusOut": true,
        });
        yield createNewWorkItem(workItemInfo, workItemName);
    });
}
exports.newWorkItemInWorkItemsTree = newWorkItemInWorkItemsTree;
function deleteWorkItemInWorkItemsTree(item) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!item || !item.filePath) {
            yield vscode.window.showInformationMessage("No robot selected for work item deletion.");
            return undefined;
        }
        const workItemPath = (0, path_1.dirname)(item.filePath);
        let uri = vscode.Uri.file(workItemPath);
        let stat;
        try {
            stat = yield vscode.workspace.fs.stat(uri);
        }
        catch (err) {
            // unable to get stat (file may have been removed in the meanwhile).
        }
        if (stat) {
            try {
                yield vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
            }
            catch (err) {
                let DELETE_PERMANENTLY = "Delete permanently";
                let msg = yield vscode.window.showErrorMessage("Unable to move to trash: " + workItemPath + ". How to proceed?", { "modal": true }, DELETE_PERMANENTLY);
                if (msg == DELETE_PERMANENTLY) {
                    yield vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
                }
                else {
                    return;
                }
            }
        }
    });
}
exports.deleteWorkItemInWorkItemsTree = deleteWorkItemInWorkItemsTree;
function openWorkItemHelp() {
    vscode.env.openExternal(vscode.Uri.parse("https://robocorp.com/docs/developer-tools/visual-studio-code/extension-features#using-work-items"));
}
exports.openWorkItemHelp = openWorkItemHelp;
class WorkItemsTreeDataProvider extends viewsRobotSelectionTreeBase_1.RobotSelectionTreeDataProviderBase {
    constructor() {
        super(...arguments);
        this.workItemsInfo = undefined;
        this.PATTERN_TO_LISTEN = "**/devdata/**";
    }
    getWorkItemsInfo() {
        return this.workItemsInfo;
    }
    handleRoot() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const elements = [];
            const robotEntry = (0, viewsCommon_1.getSelectedRobot)();
            if (!robotEntry) {
                this.lastRobotEntry = undefined;
                return [
                    {
                        name: "<Waiting for Robot Selection...>",
                        isDirectory: false,
                        filePath: undefined,
                        kind: undefined,
                    },
                ];
            }
            this.lastRobotEntry = robotEntry;
            let robot = (0, path_1.resolve)(this.lastRobotEntry.uri.fsPath);
            const workItemsResult = yield vscode.commands.executeCommand(robocorpCommands_1.ROBOCORP_LIST_WORK_ITEMS_INTERNAL, { "robot": robot, "increment_output": false });
            if (!workItemsResult.success) {
                this.workItemsInfo = undefined;
                return [
                    {
                        name: workItemsResult.message,
                        isDirectory: false,
                        filePath: undefined,
                        kind: undefined,
                    },
                ];
            }
            this.workItemsInfo = workItemsResult.result;
            let hasInputFolder = (_a = workItemsResult.result) === null || _a === void 0 ? void 0 : _a.input_folder_path;
            let hasOutputFolder = (_b = workItemsResult.result) === null || _b === void 0 ? void 0 : _b.output_folder_path;
            if (hasInputFolder || hasOutputFolder) {
                let errorMsg = yield this.collectRpaFrameworkRequirementsErrorMessage(robot);
                if (errorMsg) {
                    elements.push({
                        name: errorMsg,
                        isDirectory: false,
                        filePath: undefined,
                        kind: undefined,
                    });
                }
            }
            if (hasInputFolder) {
                elements.push({
                    name: (0, path_1.basename)(workItemsResult.result.input_folder_path),
                    isDirectory: true,
                    filePath: workItemsResult.result.input_folder_path,
                    kind: "inputWorkItemDir",
                });
            }
            if (hasOutputFolder) {
                elements.push({
                    name: (0, path_1.basename)(workItemsResult.result.output_folder_path),
                    isDirectory: true,
                    filePath: workItemsResult.result.output_folder_path,
                    kind: "outputWorkItemDir",
                });
            }
            return elements;
        });
    }
    /**
     *
     * @returns an error message if something isn't correct with the rpa framework or an empty string otherwise.
     */
    collectRpaFrameworkRequirementsErrorMessage(robot) {
        return __awaiter(this, void 0, void 0, function* () {
            let interpreter = undefined;
            let interpreterResult = yield (0, activities_1.resolveInterpreter)(robot);
            let msg = "";
            if (!interpreterResult.success) {
                return "Error resolving interpreter info: " + interpreterResult.message;
            }
            interpreter = interpreterResult.result;
            if (!interpreter) {
                return "Unable to resolve interpreter for: " + robot;
            }
            if (!interpreter.environ) {
                return "Unable to resolve interpreter environment based on: " + robot;
            }
            let env = interpreter.environ;
            let condaPrefix = env["CONDA_PREFIX"];
            if (!condaPrefix) {
                return "CONDA_PREFIX not available in environment.";
            }
            let libraryVersionInfoActionResult;
            try {
                libraryVersionInfoActionResult = yield vscode.commands.executeCommand(robocorpCommands_1.ROBOCORP_VERIFY_LIBRARY_VERSION_INTERNAL, {
                    "conda_prefix": condaPrefix,
                    "library": "rpaframework",
                    "version": "11.3",
                });
                if (!libraryVersionInfoActionResult["success"]) {
                    return libraryVersionInfoActionResult["message"];
                }
            }
            catch (error) {
                msg = "Error verifying rpaframework version.";
                (0, channel_1.logError)(msg, error, "WORKITEM_VERIFY_RPA_VERSION");
                return msg;
            }
            return "";
        });
    }
    handleChild(element) {
        let elements = [];
        if (!this.workItemsInfo) {
            return elements;
        }
        if (element.name === "work-items-in") {
            elements = this.workItemsInfo.input_work_items.map((workItem) => {
                return {
                    name: workItem.name,
                    isDirectory: false,
                    filePath: workItem.json_path,
                    kind: "inputWorkItem",
                    workItem: workItem,
                };
            });
        }
        if (element.name === "work-items-out") {
            elements = this.workItemsInfo.output_work_items.map((workItem) => {
                return {
                    name: workItem.name,
                    isDirectory: false,
                    filePath: workItem.json_path,
                    kind: "outputWorkItem",
                    workItem: workItem,
                };
            });
        }
        return elements;
    }
    /**
     * If element is not defined, it's the root element.
     * Get the work item info from lsp when root is received and define the input and output folders.
     * Save the query to the object, so that every child object doesn't have to query the same data.
     *
     * With child elements list the found work items to the correct parent folder.
     *
     * @param element
     */
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            let elements = [];
            if (!element) {
                elements = yield this.handleRoot();
            }
            else {
                elements = this.handleChild(element);
            }
            return elements;
        });
    }
    getTreeItem(element) {
        let treeItem = super.getTreeItem(element);
        if (element.isDirectory) {
            // Make directory expanded by default.
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        }
        if (element.kind) {
            treeItem.contextValue = element.kind;
        }
        return treeItem;
    }
}
exports.WorkItemsTreeDataProvider = WorkItemsTreeDataProvider;
//# sourceMappingURL=viewsWorkItems.js.map