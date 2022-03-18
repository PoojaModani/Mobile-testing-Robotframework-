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
const assert = require("assert");
const vscode = require("vscode");
const robocorpCommands_1 = require("../../robocorpCommands");
const testFolderLocation = "/resources/";
suite("Robocorp Code Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");
    test("Test that robots can be listed", () => __awaiter(void 0, void 0, void 0, function* () {
        // i.e.: Jus check that we're able to get the contents.
        let workspaceFolders = vscode.workspace.workspaceFolders;
        assert.strictEqual(workspaceFolders.length, 1);
        let actionResult;
        actionResult = yield vscode.commands.executeCommand(robocorpCommands_1.ROBOCORP_LOCAL_LIST_ROBOTS_INTERNAL);
        assert.strictEqual(actionResult.success, true);
        let robotsInfo = actionResult.result;
        // Check that we're able to load at least one robot.
        assert.ok(robotsInfo.length >= 1);
    }));
});
//# sourceMappingURL=extension.test.js.map