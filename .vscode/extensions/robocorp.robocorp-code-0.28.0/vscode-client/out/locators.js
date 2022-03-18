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
exports.removeLocator = exports.copySelectedToClipboard = void 0;
const roboCommands = require("./robocorpCommands");
const vscode_1 = require("vscode");
const activities_1 = require("./activities");
const viewsCommon_1 = require("./viewsCommon");
const channel_1 = require("./channel");
function copySelectedToClipboard(locator) {
    return __awaiter(this, void 0, void 0, function* () {
        let locatorSelected = locator || (yield (0, viewsCommon_1.getSelectedLocator)());
        if (locatorSelected) {
            vscode_1.env.clipboard.writeText(locatorSelected.name);
        }
    });
}
exports.copySelectedToClipboard = copySelectedToClipboard;
function removeLocator(locator) {
    return __awaiter(this, void 0, void 0, function* () {
        // Confirmation dialog button texts
        const DELETE = "Delete";
        let locatorSelected = locator || (yield (0, viewsCommon_1.getSelectedLocator)());
        if (!locatorSelected) {
            channel_1.OUTPUT_CHANNEL.appendLine("Warning: Trying to delete locator when there is no locator selected");
            return;
        }
        let selectedEntry = (0, viewsCommon_1.getSelectedRobot)({
            noSelectionMessage: "Please select a robot first.",
        });
        let robot = selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.robot;
        if (!robot) {
            // Ask for the robot to be used and then show dialog with the options.
            robot = yield (0, activities_1.listAndAskRobotSelection)("Please select the Robot where the locator should be removed.", "Unable to remove locator (no Robot detected in the Workspace).");
            if (!robot) {
                channel_1.OUTPUT_CHANNEL.appendLine("Warning: Trying to delete locator when there is no robot selected");
                return;
            }
        }
        const result = yield vscode_1.window.showWarningMessage(`Are you sure you want to delete the locator "${locatorSelected === null || locatorSelected === void 0 ? void 0 : locatorSelected.name}"?`, { "modal": true }, DELETE);
        if (result === DELETE) {
            const actionResult = yield vscode_1.commands.executeCommand(roboCommands.ROBOCORP_REMOVE_LOCATOR_FROM_JSON_INTERNAL, {
                robotYaml: robot.filePath,
                name: locatorSelected === null || locatorSelected === void 0 ? void 0 : locatorSelected.name,
            });
            if (actionResult.success) {
                channel_1.OUTPUT_CHANNEL.appendLine(`Locator "${locatorSelected === null || locatorSelected === void 0 ? void 0 : locatorSelected.name} removed successfully`);
            }
            else {
                channel_1.OUTPUT_CHANNEL.appendLine(`Unable to remove Locator "${locatorSelected === null || locatorSelected === void 0 ? void 0 : locatorSelected.name}, because of:\n${actionResult.message}`);
            }
        }
    });
}
exports.removeLocator = removeLocator;
//# sourceMappingURL=locators.js.map