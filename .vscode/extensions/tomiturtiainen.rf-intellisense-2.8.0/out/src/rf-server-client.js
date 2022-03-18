"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const config_1 = require("./utils/config");
const SERVER_PATH = path.join("server", "server.js");
const BuildFromFilesRequestType = new vscode_languageclient_1.RequestType("buildFromFiles");
/**
 * Client to connect to the language server
 */
class RFServerClient {
    constructor(context) {
        this._context = context;
    }
    dispose() {
        this.stop();
    }
    start() {
        if (this._client) {
            throw new Error("Client already running");
        }
        this._client = this._createClient();
        this._client.start();
        return this._client.onReady();
    }
    restart() {
        return this.stop().then(() => this.start());
    }
    stop() {
        if (this._client) {
            const stopPromise = this._client.stop();
            this._client = null;
            return stopPromise;
        }
        else {
            return Promise.resolve();
        }
    }
    sendBuildFilesRequest(files) {
        this._client.onReady().then(() => {
            this._client.sendRequest(BuildFromFilesRequestType, {
                files,
            });
        });
    }
    _createClient() {
        // The server is implemented in node
        const serverModule = this._context.asAbsolutePath(SERVER_PATH);
        // The debug options for the server
        const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
        const include = config_1.Config.getInclude();
        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions = {
            run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: vscode_languageclient_1.TransportKind.ipc,
                options: debugOptions,
            },
        };
        // Options to control the language client
        const clientOptions = {
            // Register the server for robot and resource documents
            documentSelector: ["robot", "resource"],
            synchronize: {
                // Synchronize the setting section to the server
                configurationSection: config_1.CONFIG_BLOCK_NAME,
                fileEvents: vscode_1.workspace.createFileSystemWatcher(include),
            },
        };
        return new vscode_languageclient_1.LanguageClient("rfLanguageServer", "Robot Framework Intellisense Server", serverOptions, clientOptions, true);
    }
}
exports.default = RFServerClient;
//# sourceMappingURL=rf-server-client.js.map