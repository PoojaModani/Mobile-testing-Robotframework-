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
exports.collectBaseEnv = exports.feedbackAnyError = exports.feedbackRobocorpCodeError = exports.feedback = exports.submitIssue = exports.runConfigDiagnostics = exports.RCCDiagnostics = exports.STATUS_WARNING = exports.STATUS_FAIL = exports.STATUS_FATAL = exports.STATUS_OK = exports.submitIssueUI = exports.getRccLocation = exports.createEnvWithRobocorpHome = exports.getRobocorpHome = void 0;
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const pathModule = require("path");
const requestLight_1 = require("./requestLight");
const files_1 = require("./files");
const vscode_1 = require("vscode");
const channel_1 = require("./channel");
const time_1 = require("./time");
const subprocess_1 = require("./subprocess");
const roboConfig = require("./robocorpSettings");
function getRobocorpHome() {
    return __awaiter(this, void 0, void 0, function* () {
        let robocorpHome = roboConfig.getHome();
        if (!robocorpHome || robocorpHome.length == 0) {
            robocorpHome = process.env["ROBOCORP_HOME"];
            if (!robocorpHome) {
                // Default from RCC (maybe it should provide an API to get it before creating an env?)
                if (process.platform == "win32") {
                    robocorpHome = path.join(process.env.LOCALAPPDATA, "robocorp");
                }
                else {
                    robocorpHome = path.join(process.env.HOME, ".robocorp");
                }
            }
        }
        channel_1.OUTPUT_CHANNEL.appendLine("ROBOCORP_HOME: " + robocorpHome);
        return robocorpHome;
    });
}
exports.getRobocorpHome = getRobocorpHome;
function createEnvWithRobocorpHome(robocorpHome) {
    let env = (0, subprocess_1.mergeEnviron)({ "ROBOCORP_HOME": robocorpHome });
    return env;
}
exports.createEnvWithRobocorpHome = createEnvWithRobocorpHome;
function envArrayToEnvMap(envArray, robocorpHome) {
    let env = createEnvWithRobocorpHome(robocorpHome);
    for (let index = 0; index < envArray.length; index++) {
        const element = envArray[index];
        let key = element["key"];
        if (process.platform == "win32") {
            key = key.toUpperCase();
        }
        env[key] = element["value"];
    }
    return env;
}
function checkCachedEnvValid(env) {
    return __awaiter(this, void 0, void 0, function* () {
        let pythonExe = env["PYTHON_EXE"];
        if (!pythonExe || !fs.existsSync(pythonExe)) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error. PYTHON_EXE not valid in env cache.");
            return false;
        }
        let condaPrefix = env["CONDA_PREFIX"];
        if (!condaPrefix || !fs.existsSync(condaPrefix)) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error. CONDA_PREFIX not valid in env cache.");
            return false;
        }
        let condaPrefixIdentityYaml = path.join(condaPrefix, "identity.yaml");
        if (!fs.existsSync(condaPrefixIdentityYaml)) {
            channel_1.OUTPUT_CHANNEL.appendLine("Error. " + condaPrefixIdentityYaml + " no longer exists.");
            return false;
        }
        let execFileReturn = yield (0, subprocess_1.execFilePromise)(pythonExe, ["-c", 'import threading;print("OK")'], {
            env: env,
        });
        if (execFileReturn.stderr) {
            channel_1.OUTPUT_CHANNEL.appendLine("Expected no output in stderr from cached python (" + pythonExe + "). Found:\n" + execFileReturn.stderr);
            return false;
        }
        if (!execFileReturn.stdout) {
            channel_1.OUTPUT_CHANNEL.appendLine("No output received when checking cached python (" + pythonExe + ").");
            return false;
        }
        if (!execFileReturn.stdout.includes("OK")) {
            channel_1.OUTPUT_CHANNEL.appendLine("Expected 'OK' in output from cached python (" + pythonExe + "). Found:\n" + execFileReturn.stdout);
            return false;
        }
        return true;
    });
}
function downloadRcc(progress, token) {
    return __awaiter(this, void 0, void 0, function* () {
        // Configure library with http settings.
        // i.e.: https://code.visualstudio.com/docs/setup/network
        let httpSettings = vscode_1.workspace.getConfiguration("http");
        (0, requestLight_1.configure)(httpSettings.get("proxy"), httpSettings.get("proxyStrictSSL"));
        let location = getExpectedRccLocation();
        let relativePath;
        if (process.platform == "win32") {
            if (process.arch === "x64" || process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432")) {
                // Check if node is a 64 bit process or if it's a 32 bit process running in a 64 bit processor.
                relativePath = "/windows64/rcc.exe";
            }
            else {
                // Do we even have a way to test a 32 bit build?
                relativePath = "/windows32/rcc.exe";
            }
        }
        else if (process.platform == "darwin") {
            relativePath = "/macos64/rcc";
        }
        else {
            // Linux
            if (process.arch === "x64") {
                relativePath = "/linux64/rcc";
            }
            else {
                relativePath = "/linux32/rcc";
            }
        }
        const RCC_VERSION = "v11.6.6";
        const prefix = "https://downloads.robocorp.com/rcc/releases/" + RCC_VERSION;
        const url = prefix + relativePath;
        // Downloads can go wrong (so, retry a few times before giving up).
        const maxTries = 3;
        let timing = new time_1.Timing();
        channel_1.OUTPUT_CHANNEL.appendLine("Downloading rcc from: " + url);
        for (let i = 0; i < maxTries; i++) {
            function onProgress(currLen, totalLen) {
                if (timing.elapsedFromLastMeasurement(300) || currLen == totalLen) {
                    currLen /= 1024 * 1024;
                    totalLen /= 1024 * 1024;
                    let currProgress = (currLen / totalLen) * 100;
                    let msg = "Downloaded: " +
                        currLen.toFixed(1) +
                        "MB of " +
                        totalLen.toFixed(1) +
                        "MB (" +
                        currProgress.toFixed(1) +
                        "%)";
                    if (i > 0) {
                        msg = "Attempt: " + (i + 1) + " - " + msg;
                    }
                    progress.report({ message: msg });
                    channel_1.OUTPUT_CHANNEL.appendLine(msg);
                }
            }
            try {
                let response = yield (0, requestLight_1.xhr)({
                    "url": url,
                    "onProgress": onProgress,
                });
                if (response.status == 200) {
                    // Ok, we've been able to get it.
                    // Note: only write to file after we get all contents to avoid
                    // having partial downloads.
                    channel_1.OUTPUT_CHANNEL.appendLine("Finished downloading in: " + timing.getTotalElapsedAsStr());
                    channel_1.OUTPUT_CHANNEL.appendLine("Writing to: " + location);
                    progress.report({ message: "Finished downloading (writing to file)." });
                    let s = fs.createWriteStream(location, { "encoding": "binary", "mode": 0o744 });
                    try {
                        response.responseData.forEach((element) => {
                            s.write(element);
                        });
                    }
                    finally {
                        s.close();
                    }
                    // If we don't sleep after downloading, the first activation seems to fail on Windows and Mac
                    // (EBUSY on Windows, undefined on Mac).
                    yield (0, time_1.sleep)(200);
                    return location;
                }
                else {
                    throw Error("Unable to download from " +
                        url +
                        ". Response status: " +
                        response.status +
                        "Response message: " +
                        response.responseText);
                }
            }
            catch (error) {
                channel_1.OUTPUT_CHANNEL.appendLine("Error downloading (" + i + " of " + maxTries + "). Error: " + error.message);
                if (i == maxTries - 1) {
                    return undefined;
                }
            }
        }
    });
}
function getExpectedRccLocation() {
    let location;
    if (process.platform == "win32") {
        location = (0, files_1.getExtensionRelativeFile)("../../bin/rcc.exe", false);
    }
    else {
        location = (0, files_1.getExtensionRelativeFile)("../../bin/rcc", false);
    }
    return location;
}
// We can't really ship rcc per-platform right now (so, we need to either
// download it or ship it along).
// See: https://github.com/microsoft/vscode/issues/6929
// See: https://github.com/microsoft/vscode/issues/23251
// In particular, if we download things, we should use:
// https://www.npmjs.com/package/request-light according to:
// https://github.com/microsoft/vscode/issues/6929#issuecomment-222153748
function getRccLocation() {
    return __awaiter(this, void 0, void 0, function* () {
        let location = getExpectedRccLocation();
        if (!(yield (0, files_1.fileExists)(location))) {
            yield vscode_1.window.withProgress({
                location: vscode_1.ProgressLocation.Notification,
                title: "Download conda manager (rcc).",
                cancellable: false,
            }, downloadRcc);
        }
        return location;
    });
}
exports.getRccLocation = getRccLocation;
function submitIssueUI(logPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Collect the issue information and send it using RCC.
        let email;
        let askEmailMsg = "Please provide your e-mail for the issue report";
        do {
            email = yield vscode_1.window.showInputBox({
                "prompt": askEmailMsg,
                "ignoreFocusOut": true,
            });
            if (!email) {
                return;
            }
            // if it doesn't have an @, ask again
            askEmailMsg = "Invalid e-mail provided. Please provide your e-mail for the issue report";
        } while (email.indexOf("@") == -1);
        let issueDescription = yield vscode_1.window.showInputBox({
            "prompt": "Please provide a brief description of the issue (confirming will *SEND* the issue with the collected logs)",
            "ignoreFocusOut": true,
        });
        if (!issueDescription) {
            return;
        }
        yield submitIssue(logPath, "Robocorp Code", email, "Robocorp Code", "Robocorp Code", issueDescription);
    });
}
exports.submitIssueUI = submitIssueUI;
exports.STATUS_OK = "ok";
exports.STATUS_FATAL = "fatal";
exports.STATUS_FAIL = "fail";
exports.STATUS_WARNING = "warning";
class RCCDiagnostics {
    constructor(checks) {
        this.roboHomeOk = true;
        this.failedChecks = [];
        for (const check of checks) {
            if (check.status != exports.STATUS_OK) {
                this.failedChecks.push(check);
                if (check.type == "RPA" && check.message.indexOf("ROBOCORP_HOME") != -1) {
                    this.roboHomeOk = false;
                }
            }
        }
    }
    isRobocorpHomeOk() {
        return this.roboHomeOk;
    }
}
exports.RCCDiagnostics = RCCDiagnostics;
/**
 * @param robocorpHome if given, this will be passed as the ROBOCORP_HOME environment variable.
 */
function runConfigDiagnostics(rccLocation, robocorpHome) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let timing = new time_1.Timing();
            let env = (0, subprocess_1.mergeEnviron)({ "ROBOCORP_HOME": robocorpHome });
            let configureLongpathsOutput = yield (0, subprocess_1.execFilePromise)(rccLocation, ["configure", "diagnostics", "-j", "--controller", "RobocorpCode"], { env: env });
            channel_1.OUTPUT_CHANNEL.appendLine("RCC Diagnostics:" +
                "\nStdout:\n" +
                configureLongpathsOutput.stdout +
                "\nStderr:\n" +
                configureLongpathsOutput.stderr +
                "\nTook " +
                timing.getTotalElapsedAsStr() +
                " to obtain diagnostics.");
            let outputAsJSON = JSON.parse(configureLongpathsOutput.stdout);
            let checks = outputAsJSON.checks;
            return new RCCDiagnostics(checks);
        }
        catch (error) {
            (0, channel_1.logError)("Error getting RCC diagnostics.", error, "RCC_DIAGNOSTICS");
            return undefined;
        }
    });
}
exports.runConfigDiagnostics = runConfigDiagnostics;
function submitIssue(logPath, dialogMessage, email, errorName, errorCode, errorMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        let errored = false;
        try {
            let rccLocation = yield getRccLocation();
            if (rccLocation) {
                if (!fs.existsSync(rccLocation)) {
                    let msg = "Unable to send issue report (" + rccLocation + ") does not exist.";
                    channel_1.OUTPUT_CHANNEL.appendLine(msg);
                    vscode_1.window.showErrorMessage(msg);
                    return;
                }
                function acceptLogFile(f) {
                    let lower = path.basename(f).toLowerCase();
                    if (!lower.endsWith(".log")) {
                        return false;
                    }
                    // Whitelist what we want so that we don't gather unwanted info.
                    if (lower.includes("robocorp code") || lower.includes("robot framework") || lower.includes("exthost")) {
                        return true;
                    }
                    return false;
                }
                // This should be parent directory for the logs.
                let logsRootDir = path.dirname(logPath);
                channel_1.OUTPUT_CHANNEL.appendLine("Log path: " + logsRootDir);
                let logFiles = [];
                const stat = yield fs.promises.stat(logsRootDir);
                if (stat.isDirectory()) {
                    // Get the .log files under the logsRootDir and subfolders.
                    const files = yield fs.promises.readdir(logsRootDir);
                    for (const fileI of files) {
                        let f = path.join(logsRootDir, fileI);
                        const stat = yield fs.promises.stat(f);
                        if (acceptLogFile(f) && stat.isFile()) {
                            logFiles.push(f);
                        }
                        else if (stat.isDirectory()) {
                            // No need to recurse (we just go 1 level deep).
                            let currDir = f;
                            const innerFiles = yield fs.promises.readdir(currDir);
                            for (const fileI of innerFiles) {
                                let f = path.join(currDir, fileI);
                                const stat = yield fs.promises.stat(f);
                                if (acceptLogFile(f) && stat.isFile()) {
                                    logFiles.push(f);
                                }
                            }
                        }
                    }
                }
                let version = vscode_1.extensions.getExtension("robocorp.robocorp-code").packageJSON.version;
                const metadata = {
                    logsRootDir,
                    platform: os.platform(),
                    osRelease: os.release(),
                    nodeVersion: process.version,
                    version: version,
                    controller: "rcc.robocorpcode",
                    dialogMessage,
                    email,
                    errorName,
                    errorCode,
                    errorMessage,
                };
                const reportPath = path.join(os.tmpdir(), `robocode_issue_report_${Date.now()}.json`);
                fs.writeFileSync(reportPath, JSON.stringify(metadata, null, 4), { encoding: "utf-8" });
                let args = ["feedback", "issue", "-r", reportPath, "--controller", "RobocorpCode"];
                for (const file of logFiles) {
                    args.push("-a");
                    args.push(file);
                }
                yield (0, subprocess_1.execFilePromise)(rccLocation, args, {});
            }
        }
        catch (err) {
            errored = true;
            (0, channel_1.logError)("Error sending issue.", err, "RCC_SEND_ISSUE");
            vscode_1.window.showErrorMessage("The issue report was not sent. Please see the OUTPUT for more information.");
            channel_1.OUTPUT_CHANNEL.show();
        }
        if (!errored) {
            channel_1.OUTPUT_CHANNEL.appendLine("Issue sent.");
            vscode_1.window.showInformationMessage("Thank you for your issue report. Please check you e-mail (" + email + ") for confirmation.");
        }
        return;
    });
}
exports.submitIssue = submitIssue;
function feedback(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const rccLocation = yield getRccLocation();
        let args = ["feedback", "metric", "-t", "vscode", "-n", name, "-v", "+1"];
        yield (0, subprocess_1.execFilePromise)(rccLocation, args, {}, { "hideCommandLine": true });
    });
}
exports.feedback = feedback;
function feedbackRobocorpCodeError(errorCode) {
    return __awaiter(this, void 0, void 0, function* () {
        yield feedbackAnyError("vscode.code.error", errorCode);
    });
}
exports.feedbackRobocorpCodeError = feedbackRobocorpCodeError;
/**
 * Submit feedback on some predefined error code.
 *
 * @param errorSource Something as "vscode.code.error"
 * @param errorCode The error code to be shown.
 */
function feedbackAnyError(errorSource, errorCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const rccLocation = yield getRccLocation();
        let args = ["feedback", "metric", "-t", "vscode", "-n", errorSource, "-v", errorCode];
        yield (0, subprocess_1.execFilePromise)(rccLocation, args, {}, { "hideCommandLine": true });
    });
}
exports.feedbackAnyError = feedbackAnyError;
/**
 * This function creates the base holotree space with RCC and then returns its info
 * to start up the language server.
 *
 * @param robocorpHome usually roboConfig.getHome()
 */
function collectBaseEnv(condaFilePath, robocorpHome) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = (yield fs.promises.readFile(condaFilePath, "utf-8")).replace(/(?:\r\n|\r)/g, "\n");
        const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex");
        let spaceName = "vscode-base-v01-" + hash.substring(0, 6);
        let robocorpCodePath = path.join(robocorpHome, ".robocorp_code");
        let spaceInfoPath = path.join(robocorpCodePath, spaceName);
        let rccEnvInfoCachePath = path.join(spaceInfoPath, "rcc_env_info.json");
        try {
            if (!fs.existsSync(spaceInfoPath)) {
                fs.mkdirSync(spaceInfoPath, { "recursive": true });
            }
        }
        catch (err) {
            (0, channel_1.logError)("Error creating directory: " + spaceInfoPath, err, "RCC_COLLECT_BASE_ENV_MKDIR");
        }
        const rccLocation = yield getRccLocation();
        if (!rccLocation) {
            vscode_1.window.showErrorMessage("Unable to find RCC.");
            return;
        }
        // If the robot is located in a directory that has '/devdata/env.json', we must automatically
        // add the -e /path/to/devdata/env.json.
        let robotDirName = pathModule.dirname(condaFilePath);
        let envFilename = pathModule.join(robotDirName, "devdata", "env.json");
        let args = ["holotree", "variables", "--space", spaceName, "--json", condaFilePath];
        if (yield (0, files_1.fileExists)(envFilename)) {
            args.push("-e");
            args.push(envFilename);
        }
        args.push("--controller");
        args.push("RobocorpCode");
        let envArray = undefined;
        try {
            if (fs.existsSync(rccEnvInfoCachePath)) {
                let contents = fs.readFileSync(rccEnvInfoCachePath, { "encoding": "utf-8" });
                envArray = JSON.parse(contents);
                let cachedEnv = envArrayToEnvMap(envArray, robocorpHome);
                try {
                    // Ok, we have the python exe and the env seems valid. Let's make sure it actually works.
                    let cachedPythonOk = yield checkCachedEnvValid(cachedEnv);
                    if (!cachedPythonOk) {
                        envArray = undefined;
                    }
                }
                catch (error) {
                    (0, channel_1.logError)("Error: error verifying if env is still valid.", error, "RCC_VERIFY_ENV_STILL_VALID");
                    envArray = undefined;
                }
                if (envArray) {
                    channel_1.OUTPUT_CHANNEL.appendLine("Loading base environment from: " + rccEnvInfoCachePath);
                }
            }
        }
        catch (err) {
            (0, channel_1.logError)("Unable to use cached environment info (recomputing)...", err, "RCC_UNABLE_TO_USE_CACHED");
            envArray = undefined;
        }
        // If the env array is undefined, compute it now and cache the info to be reused later.
        if (!envArray) {
            let execFileReturn = yield (0, subprocess_1.execFilePromise)(rccLocation, args, { "env": createEnvWithRobocorpHome(robocorpHome) }, { "showOutputInteractively": true });
            if (!execFileReturn.stdout) {
                feedbackRobocorpCodeError("RCC_NO_RCC_ENV_STDOUT");
                channel_1.OUTPUT_CHANNEL.appendLine("Error: Unable to collect environment from RCC.");
                return undefined;
            }
            try {
                envArray = JSON.parse(execFileReturn.stdout);
            }
            catch (error) {
                (0, channel_1.logError)("Error parsing env from RCC: " + execFileReturn.stdout, error, "RCC_NO_RCC_ENV_STDOUT");
            }
            if (!envArray) {
                channel_1.OUTPUT_CHANNEL.appendLine("Error: Unable to collect env array.");
                return undefined;
            }
            try {
                fs.writeFileSync(rccEnvInfoCachePath, JSON.stringify(envArray));
            }
            catch (err) {
                (0, channel_1.logError)("Error writing environment cache.", err, "RCC_ERROR_WRITE_ENV_CACHE");
            }
        }
        let timestampPath = path.join(spaceInfoPath, "last_usage");
        try {
            fs.writeFileSync(timestampPath, "" + Date.now());
        }
        catch (err) {
            (0, channel_1.logError)("Error writing last usage time to: " + timestampPath, err, "RCC_UPDATE_FILE_USAGE");
        }
        let finalEnv = envArrayToEnvMap(envArray, robocorpHome);
        let tempDir = finalEnv["TEMP"];
        if (tempDir) {
            try {
                // Try to remove the file related to recycling this dir (we don't want to
                // recycle the TEMP dir of this particular env).
                fs.unlink(path.join(tempDir, "recycle.now"), (err) => { });
            }
            catch (err) { }
            try {
                // Create the temp dir (if not there)
                fs.mkdir(tempDir, { "recursive": true }, (err) => { });
            }
            catch (err) { }
        }
        return { "env": finalEnv, "robocorpHome": robocorpHome, "rccLocation": rccLocation };
    });
}
exports.collectBaseEnv = collectBaseEnv;
//# sourceMappingURL=rcc.js.map