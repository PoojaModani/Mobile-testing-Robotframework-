"use strict";
/**
 * The idea is doing an Interactive Console for Robot Framework inside of VSCode.
 *
 * There is previous work on this in https://github.com/microsoft/vscode-jupyter.
 *
 * Interesting docs related to webviews:
 * https://medium.com/younited-tech-blog/reactception-extending-vs-code-extension-with-webviews-and-react-12be2a5898fd
 * https://github.com/Ciaanh/reactception/
 * https://code.visualstudio.com/api/extension-guides/webview
 * https://marketplace.visualstudio.com/items?itemName=leocll.vscode-extension-webview-template
 * https://github.com/leocll/vscode-extension-webview-template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInteractiveCommands = void 0;
const vscode_1 = require("vscode");
const vscode = require("vscode");
const channel_1 = require("../channel");
const extension_1 = require("../extension");
const RF_INTERACTIVE_LOCAL_RESOURCE_ROOT = process.env.RF_INTERACTIVE_LOCAL_RESOURCE_ROOT;
function getWebviewOptions(localResourceRoot) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // We may have a lot of context in the interactive shell webview, and it may be tricky to save/restore it all.
        retainContextWhenHidden: true,
        // And restrict the webview to only loading content from our extension's directory.
        localResourceRoots: [localResourceRoot],
    };
}
async function executeCheckedCommand(commandId, args) {
    try {
        return await vscode_1.commands.executeCommand(commandId, args);
    }
    catch (err) {
        return {
            "success": false,
            "message": "" + err.message,
            "result": undefined,
        };
    }
}
let _lastActive = undefined;
class InteractiveShellPanel {
    constructor(panel, localResourceRoot, interpreterId, persistable) {
        this.disposables = [];
        this._lastMessageId = 0;
        this._panel = panel;
        this._localResourceRoot = localResourceRoot;
        this._interpreterId = interpreterId;
        this._persistable = persistable;
        let interactiveShell = this;
        this.initialized = new Promise((resolve, reject) => {
            interactiveShell._finishInitialized = resolve;
        });
        // Set the webview's initial html content
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this.disposables);
        let nextMessageSeq = this.nextMessageSeq.bind(this);
        async function handleEvaluate(message) {
            let result = { "success": false, "message": "<error evaluating>", "result": undefined };
            try {
                let code = message.arguments["expression"];
                result = await executeCheckedCommand("robot.internal.rfinteractive.evaluate", {
                    "interpreter_id": interpreterId,
                    "code": code,
                });
            }
            catch (err) {
                (0, channel_1.logError)("Error in evaluation.", err, "INTERACTIVE_EVAL");
            }
            finally {
                let response = {
                    type: "response",
                    seq: nextMessageSeq(),
                    command: message.command,
                    request_seq: message.seq,
                    body: "<evaluated from vscode>",
                };
                webview.postMessage(response); // Send the response, even if it was an error.
            }
            // Errors should be shown in the console already...
            // if (!result['success']) {
            //     window.showErrorMessage('Error evaluating in interactive console: ' + result['message'])
            // }
        }
        async function handleSemanticTokens(message) {
            let result = undefined;
            try {
                let code = message.arguments["code"];
                // result is {'data': [...], 'resultId': ...}
                result = await vscode_1.commands.executeCommand("robot.internal.rfinteractive.semanticTokens", {
                    "interpreter_id": interpreterId,
                    "code": code,
                });
            }
            catch (err) {
                (0, channel_1.logError)("Error getting semantic tokens.", err, "INTERACTIVE_SEMANTIC_TOKS");
            }
            finally {
                let response = {
                    type: "response",
                    seq: nextMessageSeq(),
                    command: message.command,
                    request_seq: message.seq,
                    body: result,
                };
                webview.postMessage(response);
            }
        }
        async function handleResolveCompletion(message) {
            let result = undefined;
            try {
                let completionItem = message.arguments["completionItem"];
                // result is {'suggestions': [...], ...}
                result = await vscode_1.commands.executeCommand("robot.internal.rfinteractive.resolveCompletion", {
                    "interpreter_id": interpreterId,
                    "completionItem": completionItem,
                });
            }
            catch (err) {
                (0, channel_1.logError)("Error resolving completion.", err, "INTERACTIVE_RESOLVE_COMPLETION");
            }
            finally {
                let response = {
                    type: "response",
                    seq: nextMessageSeq(),
                    command: message.command,
                    request_seq: message.seq,
                    body: result,
                };
                webview.postMessage(response);
            }
        }
        async function handleCompletions(message) {
            let result = undefined;
            try {
                let code = message.arguments["code"];
                let position = message.arguments["position"];
                let context = message.arguments["context"];
                // result is {'suggestions': [...], ...}
                result = await vscode_1.commands.executeCommand("robot.internal.rfinteractive.completions", {
                    "interpreter_id": interpreterId,
                    "code": code,
                    "position": {
                        "line": position["lineNumber"] - 1,
                        "character": position["column"] - 1,
                    },
                    "context": context,
                });
            }
            catch (err) {
                (0, channel_1.logError)("Error getting completions.", err, "INTERACTIVE_COMPLETIONS");
            }
            finally {
                let response = {
                    type: "response",
                    seq: nextMessageSeq(),
                    command: message.command,
                    request_seq: message.seq,
                    body: result,
                };
                webview.postMessage(response);
            }
        }
        async function handlePersistState(message) {
            let result = undefined;
            try {
                let stateToPersist = message.arguments["state"];
                persistable.setState(stateToPersist);
            }
            catch (err) {
                (0, channel_1.logError)("Error persisting state.", err, "INTERACTIVE_STATE");
            }
            finally {
                let response = {
                    type: "response",
                    seq: nextMessageSeq(),
                    command: message.command,
                    request_seq: message.seq,
                    body: result,
                };
                webview.postMessage(response);
            }
        }
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (message.type == "request") {
                let result = undefined;
                switch (message.command) {
                    case "evaluate":
                        await handleEvaluate(message);
                        return;
                    case "semanticTokens":
                        await handleSemanticTokens(message);
                        return;
                    case "completions":
                        await handleCompletions(message);
                        return;
                    case "resolveCompletion":
                        await handleResolveCompletion(message);
                        return;
                    case "persistState":
                        await handlePersistState(message);
                        return;
                }
            }
            else if (message.type == "event") {
                if (message.event == "initialized") {
                    interactiveShell._finishInitialized();
                }
            }
        }, null, this.disposables);
    }
    nextMessageSeq() {
        this._lastMessageId += 1;
        return this._lastMessageId;
    }
    static async create(extensionUri, interpreterId, persistable) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        let localResourceRoot = vscode.Uri.joinPath(extensionUri, "src", "robotframework_ls", "vendored", "vscode-interpreter-webview");
        if (RF_INTERACTIVE_LOCAL_RESOURCE_ROOT) {
            localResourceRoot = vscode.Uri.file(RF_INTERACTIVE_LOCAL_RESOURCE_ROOT);
        }
        const panel = vscode.window.createWebviewPanel(InteractiveShellPanel.viewType, "Robot Framework Interactive Console", (column || vscode.ViewColumn.One) + 1, getWebviewOptions(localResourceRoot));
        let interactiveShellPanel = new InteractiveShellPanel(panel, localResourceRoot, interpreterId, persistable);
        _lastActive = interactiveShellPanel;
        panel.onDidChangeViewState(() => {
            if (panel.active) {
                channel_1.OUTPUT_CHANNEL.appendLine("Changed active: " + interactiveShellPanel._interpreterId);
                _lastActive = interactiveShellPanel;
            }
        });
        panel.onDidDispose(() => {
            if (_lastActive === interactiveShellPanel) {
                _lastActive = undefined;
            }
        });
        return interactiveShellPanel;
    }
    onOutput(category, output) {
        this._panel.webview.postMessage({
            "type": "event",
            "seq": this.nextMessageSeq(),
            "event": "output",
            "category": category,
            "output": output,
        });
    }
    dispose() {
        // Clean up our resources
        this._panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _getHtmlForWebview(webview) {
        // Note: we can't really load from file://
        // See: https://github.com/microsoft/vscode/issues/87282
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._localResourceRoot, "bundle.js"));
        const initialState = JSON.stringify(this._persistable.getState());
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Robot Framework Interactive Console</title>
                <script>
                const vscode = acquireVsCodeApi();
                const initialState = ${initialState};
                </script>
                <script defer src="${scriptUri}"></script>
            </head>
			<body style="padding: 0 0 0 0">
			</body>
			</html>`;
    }
    evaluate(args) {
        const webview = this._panel.webview;
        let request = {
            type: "request",
            seq: this.nextMessageSeq(),
            command: "evaluate",
            body: args,
        };
        // We have to ask the UI to evaluate it (to add it to the UI and
        // then actually do the work in the backend).
        webview.postMessage(request);
    }
}
InteractiveShellPanel.viewType = "InteractiveShellPanel";
async function registerInteractiveCommands(context) {
    let extensionUri = context.extensionUri;
    async function interactiveShellCreateOrSendContentToEvaluate(args) {
        let uri;
        if (args) {
            // If we have an active window, use it.
            if (_lastActive) {
                _lastActive.evaluate(args);
                return;
            }
            uri = args.uri;
        }
        else {
            let activeFile = vscode.window.activeTextEditor?.document;
            let currUri = activeFile?.uri;
            let msg = "Unable to create Robot Framework Interactive Console. Please open the related .robot/.resource file to provide the path used to create the Interactive Console.";
            if (!currUri) {
                vscode_1.window.showErrorMessage(msg);
                return;
            }
            if (!currUri.fsPath.endsWith(".robot") && !currUri.fsPath.endsWith(".resource")) {
                vscode_1.window.showErrorMessage(msg);
                return;
            }
            uri = currUri.toString();
        }
        let interpreterId = -1;
        let buffered = new Array();
        let interactiveShellPanel = undefined;
        async function onOutput(args) {
            if (args["interpreter_id"] === interpreterId) {
                let category = args["category"];
                let output = args["output"];
                interactiveShellPanel?.onOutput(category, output);
            }
        }
        if (extension_1.languageServerClient === undefined) {
            vscode_1.window.showErrorMessage("Unable to create interactive console because the language server is not currently initialized.");
            return;
        }
        let disposeNotification = extension_1.languageServerClient.onNotification("interpreter/output", (args) => {
            if (buffered !== undefined) {
                buffered.push(args);
            }
            else {
                onOutput(args);
            }
        });
        context.subscriptions.push(disposeNotification);
        // Note that during the creation, it's possible that we already have output, so, we
        // need to buffer anything up to the point where we actually have the interpreter.
        let result = await vscode_1.commands.executeCommand("robot.internal.rfinteractive.start", { "uri": uri });
        if (!result["success"]) {
            vscode_1.window.showErrorMessage("Error creating interactive console: " + result["message"]);
            return;
        }
        interpreterId = result["result"]["interpreter_id"];
        const SAVE_IN_KEY = "interactiveConsoleState";
        let persistable = {
            setState: (state) => {
                let currState = persistable.getState();
                if (!currState) {
                    context.globalState.update(SAVE_IN_KEY, state);
                }
                else {
                    // Note: merge the keys in the existing state.
                    Object.entries(state).forEach(([key, value]) => (currState[key] = value));
                    context.globalState.update(SAVE_IN_KEY, currState);
                }
            },
            getState: () => {
                return context.globalState.get(SAVE_IN_KEY);
            },
        };
        interactiveShellPanel = await InteractiveShellPanel.create(extensionUri, interpreterId, persistable);
        interactiveShellPanel.disposables.push(disposeNotification);
        function disposeInterpreter() {
            executeCheckedCommand("robot.internal.rfinteractive.stop", {
                "interpreter_id": interpreterId,
            });
        }
        interactiveShellPanel.disposables.push({
            "dispose": disposeInterpreter,
        });
        channel_1.OUTPUT_CHANNEL.appendLine("Waiting for Robot Framework Interactive Console UI (id: " + interpreterId + ") initialization.");
        await interactiveShellPanel.initialized;
        channel_1.OUTPUT_CHANNEL.appendLine("Robot Framework Interactive Console UI (id: " + interpreterId + ") initialized.");
        while (buffered.length) {
            buffered.splice(0, buffered.length).forEach((el) => {
                onOutput(el);
            });
        }
        // Start sending contents directly to the interactive shell now that we processed the
        // output backlog from the startup.
        buffered = undefined;
        if (args) {
            interactiveShellPanel.evaluate(args);
        }
    }
    context.subscriptions.push(vscode_1.commands.registerCommand("robot.interactiveShell", interactiveShellCreateOrSendContentToEvaluate));
}
exports.registerInteractiveCommands = registerInteractiveCommands;
//# sourceMappingURL=rfInteractive.js.map