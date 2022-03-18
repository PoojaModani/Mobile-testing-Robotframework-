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
exports.registerViews = exports.runSelectedRobot = exports.createRccTerminalTreeSelection = exports.cloudUploadRobotTreeSelection = exports.openRobotTreeSelection = void 0;
const robocorpViews_1 = require("./robocorpViews");
const vscode = require("vscode");
const activities_1 = require("./activities");
const rccTerminal_1 = require("./rccTerminal");
const viewsRobotContent_1 = require("./viewsRobotContent");
const viewsWorkItems_1 = require("./viewsWorkItems");
const viewsCommon_1 = require("./viewsCommon");
const viewsRobocorp_1 = require("./viewsRobocorp");
const viewsRobots_1 = require("./viewsRobots");
const viewsLocators_1 = require("./viewsLocators");
function empty(array) {
    return array === undefined || array.length === 0;
}
function openRobotTreeSelection(robot) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!robot) {
            robot = (0, viewsCommon_1.getSelectedRobot)();
        }
        if (robot) {
            vscode.window.showTextDocument(robot.uri);
        }
    });
}
exports.openRobotTreeSelection = openRobotTreeSelection;
function cloudUploadRobotTreeSelection(robot) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!robot) {
            robot = (0, viewsCommon_1.getSelectedRobot)();
        }
        if (robot) {
            (0, activities_1.uploadRobot)(robot.robot);
        }
    });
}
exports.cloudUploadRobotTreeSelection = cloudUploadRobotTreeSelection;
function createRccTerminalTreeSelection(robot) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!robot) {
            robot = (0, viewsCommon_1.getSelectedRobot)();
        }
        if (robot) {
            (0, rccTerminal_1.createRccTerminal)(robot.robot);
        }
    });
}
exports.createRccTerminalTreeSelection = createRccTerminalTreeSelection;
function runSelectedRobot(noDebug, taskRobotEntry) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!taskRobotEntry) {
            taskRobotEntry = yield (0, viewsCommon_1.getSelectedRobot)({
                noSelectionMessage: "Unable to make launch (Robot task not selected in Robots Tree).",
                moreThanOneSelectionMessage: "Unable to make launch -- only 1 task must be selected.",
            });
        }
        (0, activities_1.runRobotRCC)(noDebug, taskRobotEntry.robot.filePath, taskRobotEntry.taskName);
    });
}
exports.runSelectedRobot = runSelectedRobot;
function onChangedRobotSelection(robotsTree, treeDataProvider, selection) {
    return __awaiter(this, void 0, void 0, function* () {
        if (selection === undefined) {
            selection = [];
        }
        // Remove error nodes from the selection.
        selection = selection.filter((e) => {
            return e.type != viewsCommon_1.RobotEntryType.Error;
        });
        if (empty(selection)) {
            let rootChildren = yield treeDataProvider.getValidCachedOrComputeChildren(undefined);
            if (empty(rootChildren)) {
                // i.e.: there's nothing to reselect, so, just notify as usual.
                (0, viewsCommon_1.setSelectedRobot)(undefined);
                return;
            }
            // Automatically update selection / reselect some item.
            (0, viewsCommon_1.setSelectedRobot)(rootChildren[0]);
            robotsTree.reveal(rootChildren[0], { "select": true });
            return;
        }
        if (!empty(selection)) {
            (0, viewsCommon_1.setSelectedRobot)(selection[0]);
            return;
        }
        let rootChildren = yield treeDataProvider.getValidCachedOrComputeChildren(undefined);
        if (empty(rootChildren)) {
            // i.e.: there's nothing to reselect, so, just notify as usual.
            (0, viewsCommon_1.setSelectedRobot)(undefined);
            return;
        }
        // // Automatically update selection / reselect some item.
        (0, viewsCommon_1.setSelectedRobot)(rootChildren[0]);
        robotsTree.reveal(rootChildren[0], { "select": true });
    });
}
function registerViews(context) {
    // Cloud data
    let cloudTreeDataProvider = new viewsRobocorp_1.CloudTreeDataProvider();
    let viewsCloudTree = vscode.window.createTreeView(robocorpViews_1.TREE_VIEW_ROBOCORP_CLOUD_TREE, {
        "treeDataProvider": cloudTreeDataProvider,
    });
    viewsCommon_1.treeViewIdToTreeView.set(robocorpViews_1.TREE_VIEW_ROBOCORP_CLOUD_TREE, viewsCloudTree);
    viewsCommon_1.treeViewIdToTreeDataProvider.set(robocorpViews_1.TREE_VIEW_ROBOCORP_CLOUD_TREE, cloudTreeDataProvider);
    // Robots (i.e.: list of robots, not its contents)
    let robotsTreeDataProvider = new viewsRobots_1.RobotsTreeDataProvider();
    let robotsTree = vscode.window.createTreeView(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOTS_TREE, {
        "treeDataProvider": robotsTreeDataProvider,
    });
    viewsCommon_1.treeViewIdToTreeView.set(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOTS_TREE, robotsTree);
    viewsCommon_1.treeViewIdToTreeDataProvider.set(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOTS_TREE, robotsTreeDataProvider);
    context.subscriptions.push(robotsTree.onDidChangeSelection((e) => __awaiter(this, void 0, void 0, function* () { return yield onChangedRobotSelection(robotsTree, robotsTreeDataProvider, e.selection); })));
    context.subscriptions.push(robotsTreeDataProvider.onForceSelectionFromTreeData((e) => __awaiter(this, void 0, void 0, function* () { return yield onChangedRobotSelection(robotsTree, robotsTreeDataProvider, robotsTree.selection); })));
    // Update contexts when the current robot changes.
    context.subscriptions.push((0, viewsCommon_1.onSelectedRobotChanged)((robotEntry) => __awaiter(this, void 0, void 0, function* () {
        if (!robotEntry) {
            vscode.commands.executeCommand("setContext", "robocorp-code:single-task-selected", false);
            vscode.commands.executeCommand("setContext", "robocorp-code:single-robot-selected", false);
            return;
        }
        vscode.commands.executeCommand("setContext", "robocorp-code:single-task-selected", robotEntry.type == viewsCommon_1.RobotEntryType.Task);
        vscode.commands.executeCommand("setContext", "robocorp-code:single-robot-selected", true);
    })));
    // The contents of a single robot (the one selected in the Robots tree).
    let robotContentTreeDataProvider = new viewsRobotContent_1.RobotContentTreeDataProvider();
    let robotContentTree = vscode.window.createTreeView(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOT_CONTENT_TREE, {
        "treeDataProvider": robotContentTreeDataProvider,
    });
    viewsCommon_1.treeViewIdToTreeView.set(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOT_CONTENT_TREE, robotContentTree);
    viewsCommon_1.treeViewIdToTreeDataProvider.set(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOT_CONTENT_TREE, robotContentTreeDataProvider);
    context.subscriptions.push((0, viewsCommon_1.onSelectedRobotChanged)((e) => robotContentTreeDataProvider.onRobotsTreeSelectionChanged(e)));
    context.subscriptions.push(robotContentTreeDataProvider.onForceSelectionFromTreeData((e) => __awaiter(this, void 0, void 0, function* () { return yield onChangedRobotSelection(robotsTree, robotsTreeDataProvider, robotsTree.selection); })));
    // Locators
    let locatorsDataProvider = new viewsLocators_1.LocatorsTreeDataProvider();
    let locatorsTree = vscode.window.createTreeView(robocorpViews_1.TREE_VIEW_ROBOCORP_LOCATORS_TREE, {
        "treeDataProvider": locatorsDataProvider,
    });
    viewsCommon_1.treeViewIdToTreeView.set(robocorpViews_1.TREE_VIEW_ROBOCORP_LOCATORS_TREE, locatorsTree);
    viewsCommon_1.treeViewIdToTreeDataProvider.set(robocorpViews_1.TREE_VIEW_ROBOCORP_LOCATORS_TREE, locatorsDataProvider);
    context.subscriptions.push((0, viewsCommon_1.onSelectedRobotChanged)((e) => locatorsDataProvider.onRobotsTreeSelectionChanged(e)));
    // Work items tree data provider definition
    const workItemsTreeDataProvider = new viewsWorkItems_1.WorkItemsTreeDataProvider();
    const workItemsTree = vscode.window.createTreeView(robocorpViews_1.TREE_VIEW_ROBOCORP_WORK_ITEMS_TREE, {
        "treeDataProvider": workItemsTreeDataProvider,
        "canSelectMany": true,
    });
    viewsCommon_1.treeViewIdToTreeView.set(robocorpViews_1.TREE_VIEW_ROBOCORP_WORK_ITEMS_TREE, workItemsTree);
    viewsCommon_1.treeViewIdToTreeDataProvider.set(robocorpViews_1.TREE_VIEW_ROBOCORP_WORK_ITEMS_TREE, workItemsTreeDataProvider);
    context.subscriptions.push((0, viewsCommon_1.onSelectedRobotChanged)((e) => workItemsTreeDataProvider.onRobotsTreeSelectionChanged(e)));
    let robotsWatcher = vscode.workspace.createFileSystemWatcher("**/robot.yaml");
    let onChangeRobotsYaml = (0, viewsCommon_1.debounce)(() => {
        // Note: this doesn't currently work if the parent folder is renamed or removed.
        // (https://github.com/microsoft/vscode/pull/110858)
        (0, viewsCommon_1.refreshTreeView)(robocorpViews_1.TREE_VIEW_ROBOCORP_ROBOTS_TREE);
    }, 300);
    robotsWatcher.onDidChange(onChangeRobotsYaml);
    robotsWatcher.onDidCreate(onChangeRobotsYaml);
    robotsWatcher.onDidDelete(onChangeRobotsYaml);
    let locatorsWatcher = vscode.workspace.createFileSystemWatcher("**/locators.json");
    let onChangeLocatorsJson = (0, viewsCommon_1.debounce)(() => {
        // Note: this doesn't currently work if the parent folder is renamed or removed.
        // (https://github.com/microsoft/vscode/pull/110858)
        (0, viewsCommon_1.refreshTreeView)(robocorpViews_1.TREE_VIEW_ROBOCORP_LOCATORS_TREE);
    }, 300);
    locatorsWatcher.onDidChange(onChangeLocatorsJson);
    locatorsWatcher.onDidCreate(onChangeLocatorsJson);
    locatorsWatcher.onDidDelete(onChangeLocatorsJson);
    context.subscriptions.push(robotsTree);
    context.subscriptions.push(locatorsTree);
    context.subscriptions.push(robotsWatcher);
    context.subscriptions.push(locatorsWatcher);
}
exports.registerViews = registerViews;
//# sourceMappingURL=views.js.map