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
exports.debounce = exports.basename = exports.getSelectedLocator = exports.getSelectedRobot = exports.setSelectedRobot = exports.onSelectedRobotChanged = exports.refreshTreeView = exports.treeViewIdToTreeDataProvider = exports.treeViewIdToTreeView = exports.RobotEntryType = void 0;
const vscode = require("vscode");
const robocorpViews_1 = require("./robocorpViews");
var RobotEntryType;
(function (RobotEntryType) {
    RobotEntryType[RobotEntryType["Robot"] = 0] = "Robot";
    RobotEntryType[RobotEntryType["Task"] = 1] = "Task";
    RobotEntryType[RobotEntryType["Error"] = 2] = "Error";
})(RobotEntryType = exports.RobotEntryType || (exports.RobotEntryType = {}));
exports.treeViewIdToTreeView = new Map();
exports.treeViewIdToTreeDataProvider = new Map();
function refreshTreeView(treeViewId) {
    let dataProvider = exports.treeViewIdToTreeDataProvider.get(treeViewId);
    if (dataProvider) {
        dataProvider.fireRootChange();
    }
}
exports.refreshTreeView = refreshTreeView;
function getSingleTreeSelection(treeId, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const noSelectionMessage = opts === null || opts === void 0 ? void 0 : opts.noSelectionMessage;
        const moreThanOneSelectionMessage = opts === null || opts === void 0 ? void 0 : opts.moreThanOneSelectionMessage;
        const robotsTree = exports.treeViewIdToTreeView.get(treeId);
        if (!robotsTree || robotsTree.selection.length == 0) {
            if (noSelectionMessage) {
                vscode.window.showWarningMessage(noSelectionMessage);
            }
            return undefined;
        }
        if (robotsTree.selection.length > 1) {
            if (moreThanOneSelectionMessage) {
                vscode.window.showWarningMessage(moreThanOneSelectionMessage);
            }
            return undefined;
        }
        let element = robotsTree.selection[0];
        return element;
    });
}
let _onSelectedRobotChanged = new vscode.EventEmitter();
exports.onSelectedRobotChanged = _onSelectedRobotChanged.event;
let lastSelectedRobot = undefined;
function setSelectedRobot(robotEntry) {
    lastSelectedRobot = robotEntry;
    _onSelectedRobotChanged.fire(robotEntry);
}
exports.setSelectedRobot = setSelectedRobot;
/**
 * Returns the selected robot or undefined if there are no robots or if more than one robot is selected.
 *
 * If the messages are passed as a parameter, a warning is shown with that message if the selection is invalid.
 */
function getSelectedRobot(opts) {
    let ret = lastSelectedRobot;
    if (!ret) {
        if (opts === null || opts === void 0 ? void 0 : opts.noSelectionMessage) {
            vscode.window.showWarningMessage(opts.noSelectionMessage);
        }
    }
    return ret;
}
exports.getSelectedRobot = getSelectedRobot;
function getSelectedLocator(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getSingleTreeSelection(robocorpViews_1.TREE_VIEW_ROBOCORP_LOCATORS_TREE, opts);
    });
}
exports.getSelectedLocator = getSelectedLocator;
function basename(s) {
    return s.split("\\").pop().split("/").pop();
}
exports.basename = basename;
const debounce = (func, wait) => {
    let timeout;
    return function wrapper(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
exports.debounce = debounce;
//# sourceMappingURL=viewsCommon.js.map