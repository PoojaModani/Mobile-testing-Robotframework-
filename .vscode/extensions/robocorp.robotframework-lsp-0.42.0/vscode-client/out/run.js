"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRunCommands = exports.readLaunchTemplate = exports.robotDebugSuite = exports.robotRunSuite = exports.robotDebug = exports.robotRun = void 0;
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const path = require("path");
const escape_1 = require("./escape");
async function robotRun(params) {
    try {
        await _debug(params, true);
    }
    catch (error) {
        (0, channel_1.logError)("Error running robot.", error, "RUN_ROBOT_RUN");
    }
}
exports.robotRun = robotRun;
async function robotDebug(params) {
    try {
        await _debug(params, false);
    }
    catch (error) {
        (0, channel_1.logError)("Error debugging robot.", error, "RUN_ROBOT_DEBUG");
    }
}
exports.robotDebug = robotDebug;
async function robotRunSuite(resource) {
    await _debugSuite(resource, true);
}
exports.robotRunSuite = robotRunSuite;
async function robotDebugSuite(resource) {
    await _debugSuite(resource, false);
}
exports.robotDebugSuite = robotDebugSuite;
async function readLaunchTemplate(workspaceFolder) {
    const launch = vscode_1.workspace.getConfiguration("launch", workspaceFolder);
    const launchConfigurations = launch.inspect("configurations");
    if (launchConfigurations) {
        const entries = [
            ["Workspace Folder Language Value", launchConfigurations.workspaceFolderLanguageValue],
            ["Workspace Folder Value", launchConfigurations.workspaceFolderValue],
            ["Workspace Language Value", launchConfigurations.workspaceLanguageValue],
            ["Workspace Value", launchConfigurations.workspaceValue],
            ["Global Language Value", launchConfigurations.globalLanguageValue],
            ["Global Value", launchConfigurations.globalValue],
        ];
        for (const entry of entries) {
            let configs = entry[1];
            if (configs) {
                for (const cfg of configs) {
                    channel_1.OUTPUT_CHANNEL.appendLine(`Found ${entry[0]} configuration: ${cfg.type} - ${cfg.name}.`);
                    if (cfg.type == "robotframework-lsp" &&
                        cfg.name &&
                        cfg.name.toLowerCase() == "robot framework: launch template") {
                        channel_1.OUTPUT_CHANNEL.appendLine(`-- matched as launch template.`);
                        return cfg;
                    }
                }
            }
        }
    }
    else {
        channel_1.OUTPUT_CHANNEL.appendLine('Did not find any launch configuration when searching for the "Robot Framework: Launch Template".');
    }
    return undefined;
}
exports.readLaunchTemplate = readLaunchTemplate;
async function _debugSuite(resource, noDebug) {
    try {
        if (!resource) {
            // i.e.: collect the tests from the file and ask which one to run.
            let activeTextEditor = vscode_1.window.activeTextEditor;
            if (!activeTextEditor) {
                vscode_1.window.showErrorMessage("Can only run a test/task suite if the related file is currently opened.");
                return;
            }
            resource = activeTextEditor.document.uri;
        }
        await _debug({ "uri": resource.toString(), "path": resource.fsPath, "name": "*" }, noDebug);
    }
    catch (error) {
        (0, channel_1.logError)("Error debugging suite.", error, "RUN_DEBUG_SUITE");
    }
}
async function _debug(params, noDebug) {
    let executeUri;
    let executePath;
    let executeName;
    if (!params) {
        // i.e.: collect the tests from the file and ask which one to run.
        let activeTextEditor = vscode_1.window.activeTextEditor;
        if (!activeTextEditor) {
            vscode_1.window.showErrorMessage("Can only run a test/task if the related file is currently opened.");
            return;
        }
        let uri = activeTextEditor.document.uri;
        let tests = await vscode_1.commands.executeCommand("robot.listTests", { "uri": uri.toString() });
        if (!tests) {
            vscode_1.window.showErrorMessage("No tests/tasks found in the currently opened editor.");
            return;
        }
        executeUri = uri;
        executePath = uri.fsPath;
        if (tests.length == 1) {
            executeName = tests[0].name;
        }
        else {
            let items = [];
            for (const el of tests) {
                items.push(el.name);
            }
            let selectedItem = await vscode_1.window.showQuickPick(items, {
                "canPickMany": false,
                "placeHolder": "Please select Test / Task to run.",
                "ignoreFocusOut": true,
            });
            if (!selectedItem) {
                return;
            }
            executeName = selectedItem;
        }
    }
    else {
        executeUri = vscode_1.Uri.file(params.path);
        executePath = params.path;
        executeName = params.name;
    }
    let workspaceFolder = vscode_1.workspace.getWorkspaceFolder(executeUri);
    if (!workspaceFolder) {
        let folders = vscode_1.workspace.workspaceFolders;
        if (folders) {
            // Use the currently opened folder.
            workspaceFolder = folders[0];
        }
    }
    let cwd;
    let launchTemplate = undefined;
    if (workspaceFolder) {
        cwd = workspaceFolder.uri.fsPath;
        launchTemplate = await readLaunchTemplate(workspaceFolder);
    }
    else {
        cwd = path.dirname(executePath);
    }
    let args = [];
    let debugConfiguration = {
        "type": "robotframework-lsp",
        "name": "Robot Framework: Launch " + executeName,
        "request": "launch",
        "cwd": cwd,
        "terminal": "integrated",
        "args": args,
    };
    if (launchTemplate) {
        for (var key of Object.keys(launchTemplate)) {
            if (key !== "type" && key !== "name" && key !== "request") {
                let value = launchTemplate[key];
                if (value !== undefined) {
                    if (key === "args") {
                        try {
                            debugConfiguration.args = debugConfiguration.args.concat(value);
                        }
                        catch (err) {
                            (0, channel_1.logError)("Unable to concatenate: " + debugConfiguration.args + " to: " + value, err, "RUN_CONCAT_ARGS");
                        }
                    }
                    else {
                        debugConfiguration[key] = value;
                    }
                }
            }
        }
    }
    if (debugConfiguration.makeSuite === undefined) {
        // Not in template (default == true)
        debugConfiguration.makeSuite = true;
    }
    // Note that target is unused if RFLS_PRERUN_FILTER_TESTS is specified and makeSuite == true.
    debugConfiguration.target = executePath;
    let envFiltering = (0, escape_1.jsonEscapeUTF)(JSON.stringify({
        "include": [[executePath, executeName]],
        "exclude": [],
    }));
    if (debugConfiguration.env) {
        debugConfiguration.env["RFLS_PRERUN_FILTER_TESTS"] = envFiltering;
    }
    else {
        debugConfiguration.env = { "RFLS_PRERUN_FILTER_TESTS": envFiltering };
    }
    let debugSessionOptions = { "noDebug": noDebug };
    vscode_1.debug.startDebugging(workspaceFolder, debugConfiguration, debugSessionOptions);
}
async function registerRunCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand("robot.runTest", robotRun));
    context.subscriptions.push(vscode_1.commands.registerCommand("robot.debugTest", robotDebug));
    context.subscriptions.push(vscode_1.commands.registerCommand("robot.runSuite", robotRunSuite));
    context.subscriptions.push(vscode_1.commands.registerCommand("robot.debugSuite", robotDebugSuite));
}
exports.registerRunCommands = registerRunCommands;
//# sourceMappingURL=run.js.map