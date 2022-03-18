"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDebugger = void 0;
const vscode = require("vscode");
const expandVars_1 = require("./expandVars");
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const extension_1 = require("./extension");
const path = require("path");
const fs = require("fs");
function removeEscaping(s) {
    if (s instanceof Array) {
        let ret = [];
        for (const it of s) {
            ret.push(removeEscaping(it));
        }
        return ret;
    }
    let str = s;
    if (str.startsWith('^"\\') && str.endsWith('"')) {
        str = str.substring(3, str.length - 1);
    }
    else if (str.startsWith('^"') && str.endsWith('"')) {
        str = str.substring(2, str.length - 1);
    }
    else if (str.startsWith('"') && str.endsWith('"')) {
        str = str.substring(1, str.length - 1);
    }
    return str;
}
class RobotDebugConfigurationProvider {
    provideDebugConfigurations(folder, token) {
        let configurations = [];
        configurations.push({
            "type": "robotframework-lsp",
            "name": "Robot Framework: Launch .robot file",
            "request": "launch",
            "cwd": '^"\\${workspaceFolder}"',
            "target": '^"\\${file}"',
            "terminal": "integrated",
            "env": {},
            "args": [],
        });
        return configurations;
    }
    async resolveDebugConfigurationWithSubstitutedVariables(folder, debugConfiguration, token) {
        // When we resolve a configuration we add the pythonpath and variables to the command line.
        let args = debugConfiguration.args;
        let config = vscode_1.workspace.getConfiguration("robot");
        let pythonpath = (0, expandVars_1.getArrayStrFromConfigExpandingVars)(config, "pythonpath");
        let variables = config.get("variables");
        debugConfiguration.target = removeEscaping(debugConfiguration.target);
        let targetRobot = debugConfiguration.target;
        if (targetRobot instanceof Array && targetRobot.length > 0) {
            targetRobot = targetRobot[0];
        }
        // If it's not specified in the language, let's check if some plugin wants to provide an implementation.
        let interpreter = await vscode_1.commands.executeCommand("robot.resolveInterpreter", targetRobot);
        if (interpreter) {
            pythonpath = pythonpath.concat(interpreter.additionalPythonpathEntries);
            if (interpreter.environ) {
                if (!debugConfiguration.env) {
                    debugConfiguration.env = interpreter.environ;
                }
                else {
                    for (let key of Object.keys(interpreter.environ)) {
                        debugConfiguration.env[key] = interpreter.environ[key];
                    }
                }
            }
            // Also, overridde env variables in the launch config.
            try {
                let newEnv = await vscode_1.commands.executeCommand("robocorp.updateLaunchEnv", {
                    "targetRobot": targetRobot,
                    "env": debugConfiguration.env,
                });
                if (newEnv == "cancelled") {
                    channel_1.OUTPUT_CHANNEL.appendLine("Launch cancelled");
                    return undefined;
                }
                debugConfiguration.env = newEnv;
            }
            catch (error) {
                // The command may not be available.
            }
        }
        let newArgs = [];
        pythonpath.forEach((element) => {
            newArgs.push("--pythonpath");
            newArgs.push(element);
        });
        for (let key in variables) {
            if (variables.hasOwnProperty(key)) {
                newArgs.push("--variable");
                newArgs.push(key + ":" + (0, expandVars_1.expandVars)(variables[key]));
            }
        }
        if (args) {
            args = args.concat(newArgs);
        }
        else {
            args = newArgs;
        }
        debugConfiguration.args = args;
        let uri = vscode.Uri.file(targetRobot);
        let wsFolder = vscode_1.workspace.getWorkspaceFolder(uri);
        if (!wsFolder) {
            wsFolder = folder;
        }
        if (debugConfiguration.cwd) {
            debugConfiguration.cwd = removeEscaping(debugConfiguration.cwd);
            let stat;
            try {
                stat = await vscode.workspace.fs.stat(vscode.Uri.file(debugConfiguration.cwd));
            }
            catch (err) {
                vscode_1.window.showErrorMessage("Unable to launch. Reason: the cwd: " + debugConfiguration.cwd + " does not exist.");
                return undefined;
            }
            if ((stat.type | vscode.FileType.File) == 1) {
                vscode_1.window.showErrorMessage("Unable to launch. Reason: the cwd: " +
                    debugConfiguration.cwd +
                    " seems to be a file and not a directory.");
                return undefined;
            }
        }
        else {
            if (wsFolder) {
                debugConfiguration.cwd = wsFolder?.uri?.fsPath;
            }
        }
        return debugConfiguration;
    }
}
function registerDebugger() {
    async function createDebugAdapterExecutable(env, targetRobot) {
        let dapPythonExecutable = undefined;
        const inConfig = (0, expandVars_1.getStrFromConfigExpandingVars)(vscode_1.workspace.getConfiguration("robot"), "python.executable");
        if (inConfig) {
            dapPythonExecutable = [inConfig];
        }
        // Even if it's specified in the language, let's check if some plugin wants to provide an implementation.
        const interpreter = await vscode_1.commands.executeCommand("robot.resolveInterpreter", targetRobot);
        if (interpreter) {
            dapPythonExecutable = [interpreter.pythonExe];
            if (interpreter.environ) {
                if (!env) {
                    env = interpreter.environ;
                }
                else {
                    for (let key of Object.keys(interpreter.environ)) {
                        env[key] = interpreter.environ[key];
                    }
                }
            }
        }
        else if ((!dapPythonExecutable || dapPythonExecutable.length === 0) && env) {
            // If a `PYTHON_EXE` is specified in the env, give it priority vs using the language server
            // executable.
            const inEnv = env["PYTHON_EXE"];
            if (inEnv) {
                dapPythonExecutable = [inEnv];
            }
        }
        if (!dapPythonExecutable || dapPythonExecutable.length === 0) {
            // If the dapPythonExecutable is not specified, use the default language server executable.
            if (!extension_1.lastLanguageServerExecutable) {
                vscode_1.window.showWarningMessage("Error getting language server python executable for creating a debug adapter.");
                return;
            }
            dapPythonExecutable = extension_1.lastLanguageServerExecutable;
        }
        if (!dapPythonExecutable || dapPythonExecutable.length === 0) {
            vscode_1.window.showWarningMessage("Error. Unable to resolve the python executable to launch debug adapter.");
            return;
        }
        const targetMain = path.resolve(__dirname, "../../src/robotframework_debug_adapter/__main__.py");
        if (!fs.existsSync(targetMain)) {
            vscode_1.window.showWarningMessage("Error. Expected: " + targetMain + " to exist.");
            return;
        }
        if (!fs.existsSync(dapPythonExecutable[0])) {
            vscode_1.window.showWarningMessage("Error. Expected: " + dapPythonExecutable[0] + " to exist.");
            return;
        }
        channel_1.OUTPUT_CHANNEL.appendLine("Launching debug adapter with python: " + dapPythonExecutable);
        const args = [];
        for (let index = 1; index < dapPythonExecutable.length; index++) {
            args.push(dapPythonExecutable[index]);
        }
        args.push("-u");
        args.push(targetMain);
        if (env) {
            return new vscode_1.DebugAdapterExecutable(dapPythonExecutable[0], args, { "env": env });
        }
        else {
            return new vscode_1.DebugAdapterExecutable(dapPythonExecutable[0], args);
        }
    }
    try {
        vscode_1.debug.registerDebugConfigurationProvider("robotframework-lsp", new RobotDebugConfigurationProvider());
        vscode_1.debug.registerDebugAdapterDescriptorFactory("robotframework-lsp", {
            createDebugAdapterDescriptor: (session) => {
                let env = session.configuration.env;
                let target = session.configuration.target;
                return createDebugAdapterExecutable(env, target);
            },
        });
        vscode.languages.registerEvaluatableExpressionProvider("robotframework", {
            provideEvaluatableExpression(document, position, token) {
                return extension_1.languageServerClient
                    .sendRequest("robot/provideEvaluatableExpression", {
                    "uri": document.uri.toString(),
                    "position": { "line": position.line, "character": position.character },
                }, token)
                    .then((r) => {
                    if (!r) {
                        return undefined;
                    }
                    const range = r.range;
                    if (!range) {
                        return undefined;
                    }
                    let start = new vscode.Position(range.start.line, range.start.character);
                    let end = new vscode.Position(range.end.line, range.end.character);
                    return new vscode.EvaluatableExpression(new vscode.Range(start, end), r.expression);
                });
            },
        });
    }
    catch (error) {
        // i.e.: https://github.com/microsoft/vscode/issues/118562
        (0, channel_1.logError)("Error registering debugger.", error, "EXT_REGISTER_DEBUGGER");
    }
}
exports.registerDebugger = registerDebugger;
//# sourceMappingURL=debugger.js.map