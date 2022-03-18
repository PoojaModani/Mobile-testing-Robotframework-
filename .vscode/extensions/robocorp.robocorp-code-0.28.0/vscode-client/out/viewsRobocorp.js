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
exports.refreshCloudTreeView = exports.CloudTreeDataProvider = void 0;
const vscode = require("vscode");
const roboCommands = require("./robocorpCommands");
const viewsCommon_1 = require("./viewsCommon");
const robocorpCommands_1 = require("./robocorpCommands");
const robocorpViews_1 = require("./robocorpViews");
const ask_1 = require("./ask");
class CloudTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.refreshOnce = false;
    }
    fireRootChange() {
        this._onDidChangeTreeData.fire(null);
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                let accountInfoResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_GET_LINKED_ACCOUNT_INFO_INTERNAL);
                let ret = [];
                if (!accountInfoResult.success) {
                    ret.push({
                        "label": "Link to Control Room",
                        "iconPath": "link",
                        "viewItemContextValue": "cloudLoginItem",
                        "command": {
                            "title": "Link to Control Room",
                            "command": roboCommands.ROBOCORP_CLOUD_LOGIN,
                        },
                    });
                }
                else {
                    let accountInfo = accountInfoResult.result;
                    ret.push({
                        "label": "Linked: " + accountInfo["fullname"] + " (" + accountInfo["email"] + ")",
                        "iconPath": "link",
                        "viewItemContextValue": "cloudLogoutItem",
                    });
                    let vaultInfoResult = yield vscode.commands.executeCommand(roboCommands.ROBOCORP_GET_CONNECTED_VAULT_WORKSPACE_INTERNAL);
                    if (!vaultInfoResult || !vaultInfoResult.success || !vaultInfoResult.result) {
                        ret.push({
                            "label": "Vault: disconnected.",
                            "iconPath": "unlock",
                            "viewItemContextValue": "vaultDisconnected",
                        });
                    }
                    else {
                        const result = vaultInfoResult.result;
                        ret.push({
                            "label": "Vault: connected to: " + (0, ask_1.getWorkspaceDescription)(result),
                            "iconPath": "lock",
                            "viewItemContextValue": "vaultConnected",
                        });
                    }
                }
                ret.push({
                    "label": "Robot Development Guide",
                    "iconPath": "book",
                    "command": {
                        "title": "Open https://robocorp.com/docs/development-guide",
                        "command": "vscode.open",
                        "arguments": [vscode.Uri.parse("https://robocorp.com/docs/development-guide")],
                    },
                });
                ret.push({
                    "label": "Keyword Libraries Documentation",
                    "iconPath": "notebook",
                    "command": {
                        "title": "Open https://robocorp.com/docs/libraries",
                        "command": "vscode.open",
                        "arguments": [vscode.Uri.parse("https://robocorp.com/docs/libraries")],
                    },
                });
                ret.push({
                    "label": "Submit issue to Robocorp",
                    "iconPath": "report",
                    "command": {
                        "title": "Submit issue to Robocorp",
                        "command": robocorpCommands_1.ROBOCORP_SUBMIT_ISSUE,
                    },
                });
                return ret;
            }
            if (element.children) {
                return element.children;
            }
            return [];
        });
    }
    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.label, element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        treeItem.command = element.command;
        treeItem.iconPath = new vscode.ThemeIcon(element.iconPath);
        if (element.viewItemContextValue) {
            treeItem.contextValue = element.viewItemContextValue;
        }
        return treeItem;
    }
}
exports.CloudTreeDataProvider = CloudTreeDataProvider;
function refreshCloudTreeView() {
    let dataProvider = (viewsCommon_1.treeViewIdToTreeDataProvider.get(robocorpViews_1.TREE_VIEW_ROBOCORP_CLOUD_TREE));
    if (dataProvider) {
        dataProvider.refreshOnce = true;
        dataProvider.fireRootChange();
    }
}
exports.refreshCloudTreeView = refreshCloudTreeView;
//# sourceMappingURL=viewsRobocorp.js.map