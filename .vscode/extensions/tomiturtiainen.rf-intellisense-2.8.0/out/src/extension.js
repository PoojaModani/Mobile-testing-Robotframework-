"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const command_handler_1 = require("./command-handler");
const rf_server_client_1 = require("./rf-server-client");
const config_1 = require("./utils/config");
const migration_helper_1 = require("./migration-helper");
let rfLanguageServerClient;
let commandHandler;
function activate(context) {
    rfLanguageServerClient = new rf_server_client_1.default(context);
    commandHandler = new command_handler_1.default(rfLanguageServerClient);
    migration_helper_1.runMigrations();
    context.subscriptions.push(vscode_1.commands.registerCommand("rfIntellisense.reportBug", commandHandler.reportBug));
    context.subscriptions.push(vscode_1.commands.registerCommand("rfIntellisense.rebuildSources", () => commandHandler.parseAll()));
    rfLanguageServerClient.start().then(() => commandHandler.parseAll());
    let currentIncludePattern = config_1.Config.getInclude();
    const disposable = vscode_1.workspace.onDidChangeConfiguration(() => {
        const newIncludePattern = config_1.Config.getInclude();
        if (currentIncludePattern === newIncludePattern) {
            return;
        }
        currentIncludePattern = newIncludePattern;
        console.log("Configuration has changed. Restarting language server..");
        rfLanguageServerClient.restart().then(() => commandHandler.parseAll());
    });
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(rfLanguageServerClient);
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map