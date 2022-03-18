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
exports.disconnectVault = exports.connectVault = void 0;
const roboCommands = require("./robocorpCommands");
const vscode = require("vscode");
const activities_1 = require("./activities");
const ask_1 = require("./ask");
function connectVault() {
    return __awaiter(this, void 0, void 0, function* () {
        let isLoginNeededActionResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_IS_LOGIN_NEEDED_INTERNAL);
        if (!isLoginNeededActionResult) {
            vscode.window.showInformationMessage("Error getting if login is needed.");
            return;
        }
        if (isLoginNeededActionResult.result) {
            let loggedIn = yield (0, activities_1.cloudLogin)();
            if (!loggedIn) {
                return;
            }
        }
        const workspaceSelection = yield (0, ask_1.selectWorkspace)("Please provide the workspace to connect the online Vault secrets", false);
        if (workspaceSelection === undefined) {
            return;
        }
        let setVaultResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_SET_CONNECTED_VAULT_WORKSPACE_INTERNAL, {
            "workspaceId": workspaceSelection.selectedWorkspaceInfo.workspaceId,
            "organizationName": workspaceSelection.selectedWorkspaceInfo.organizationName,
            "workspaceName": workspaceSelection.selectedWorkspaceInfo.workspaceName,
        });
        if (!setVaultResult) {
            vscode.window.showInformationMessage("Error connecting to vault.");
            return;
        }
        if (!setVaultResult.success) {
            vscode.window.showInformationMessage("Error connecting to vault: " + setVaultResult.message);
            return;
        }
        vscode.window.showInformationMessage("Connected to vault.");
    });
}
exports.connectVault = connectVault;
function disconnectVault() {
    return __awaiter(this, void 0, void 0, function* () {
        let setVaultResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_SET_CONNECTED_VAULT_WORKSPACE_INTERNAL, {
            "workspaceId": null,
        });
        if (!setVaultResult) {
            vscode.window.showInformationMessage("Error disconnecting from vault.");
            return;
        }
        if (!setVaultResult.success) {
            vscode.window.showInformationMessage("Error disconnecting from vault: " + setVaultResult.message);
            return;
        }
        vscode.window.showInformationMessage("Disconnected from vault.");
    });
}
exports.disconnectVault = disconnectVault;
//# sourceMappingURL=vault.js.map