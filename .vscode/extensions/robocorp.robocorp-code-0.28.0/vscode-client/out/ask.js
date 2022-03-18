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
exports.selectWorkspace = exports.getWorkspaceDescription = exports.showSelectOneStrQuickPick = exports.showSelectOneQuickPick = exports.sortCaptions = void 0;
const roboCommands = require("./robocorpCommands");
const vscode_1 = require("vscode");
function sortCaptions(captions) {
    captions.sort(function (a, b) {
        if (a.sortKey < b.sortKey) {
            return -1;
        }
        if (a.sortKey > b.sortKey) {
            return 1;
        }
        if (a.label < b.label) {
            return -1;
        }
        if (a.label > b.label) {
            return 1;
        }
        return 0;
    });
}
exports.sortCaptions = sortCaptions;
function showSelectOneQuickPick(items, message) {
    return __awaiter(this, void 0, void 0, function* () {
        let selectedItem = yield vscode_1.window.showQuickPick(items, {
            "canPickMany": false,
            "placeHolder": message,
            "ignoreFocusOut": true,
        });
        return selectedItem;
    });
}
exports.showSelectOneQuickPick = showSelectOneQuickPick;
function showSelectOneStrQuickPick(items, message) {
    return __awaiter(this, void 0, void 0, function* () {
        let selectedItem = yield vscode_1.window.showQuickPick(items, {
            "canPickMany": false,
            "placeHolder": message,
            "ignoreFocusOut": true,
        });
        return selectedItem;
    });
}
exports.showSelectOneStrQuickPick = showSelectOneStrQuickPick;
function getWorkspaceDescription(wsInfo) {
    return wsInfo.organizationName + ": " + wsInfo.workspaceName;
}
exports.getWorkspaceDescription = getWorkspaceDescription;
function selectWorkspace(title, refresh) {
    return __awaiter(this, void 0, void 0, function* () {
        SELECT_OR_REFRESH: do {
            // We ask for the information on the existing workspaces information.
            // Note that this may be cached from the last time it was asked,
            // so, we have an option to refresh it (and ask again).
            let actionResult = yield vscode_1.commands.executeCommand(roboCommands.ROBOCORP_CLOUD_LIST_WORKSPACES_INTERNAL, { "refresh": refresh });
            if (!actionResult.success) {
                vscode_1.window.showErrorMessage("Error listing Control Room workspaces: " + actionResult.message);
                return undefined;
            }
            let workspaceInfo = actionResult.result;
            if (!workspaceInfo || workspaceInfo.length == 0) {
                vscode_1.window.showErrorMessage("A Control Room Workspace must be created to submit a Robot to the Control Room.");
                return undefined;
            }
            // Now, if there are only a few items or a single workspace,
            // just show it all, otherwise do a pre-selectedItem with the workspace.
            let workspaceIdFilter = undefined;
            if (workspaceInfo.length > 1) {
                // Ok, there are many workspaces, let's provide a pre-filter for it.
                let captions = new Array();
                for (let i = 0; i < workspaceInfo.length; i++) {
                    const wsInfo = workspaceInfo[i];
                    let caption = {
                        "label": "$(folder) " + getWorkspaceDescription(wsInfo),
                        "action": { "filterWorkspaceId": wsInfo.workspaceId, "wsInfo": wsInfo },
                    };
                    captions.push(caption);
                }
                sortCaptions(captions);
                let caption = {
                    "label": "$(refresh) * Refresh list",
                    "description": "Expected Workspace is not appearing.",
                    "sortKey": "09999",
                    "action": { "refresh": true },
                };
                captions.push(caption);
                let selectedItem = yield showSelectOneQuickPick(captions, title);
                if (!selectedItem) {
                    return undefined;
                }
                if (selectedItem.action.refresh) {
                    refresh = true;
                    continue SELECT_OR_REFRESH;
                }
                else {
                    workspaceIdFilter = selectedItem.action.filterWorkspaceId;
                    return {
                        "workspaceInfo": workspaceInfo,
                        "selectedWorkspaceInfo": selectedItem.action.wsInfo,
                    };
                }
            }
            else {
                // Only 1
                return {
                    "workspaceInfo": workspaceInfo,
                    selectedWorkspaceInfo: workspaceInfo[0],
                };
            }
        } while (true);
    });
}
exports.selectWorkspace = selectWorkspace;
//# sourceMappingURL=ask.js.map