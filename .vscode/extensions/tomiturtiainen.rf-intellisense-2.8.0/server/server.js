var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const minimatch = require("minimatch");
const vscode_uri_1 = require("vscode-uri");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const workspace_1 = require("./intellisense/workspace/workspace");
const definition_finder_1 = require("./intellisense/definition-finder");
const reference_finder_1 = require("./intellisense/reference-finder");
const completion_provider_1 = require("./intellisense/completion-provider");
const symbol_provider_1 = require("./intellisense/symbol-provider");
const highlight_provider_1 = require("./intellisense/highlight-provider");
const settings_1 = require("./utils/settings");
const logger_1 = require("./logger");
const asyncFs = require("./utils/async-fs");
const robot_file_1 = require("./intellisense/workspace/robot-file");
const python_file_1 = require("./intellisense/workspace/python-file");
const library_1 = require("./intellisense/workspace/library");
const LIBRARY_PATH = path.resolve(__dirname, "./library-docs");
const parsersByFile = new Map([
    [".robot", robot_file_1.createRobotFile],
    [".resource", robot_file_1.createRobotFile],
    [".txt", robot_file_1.createRobotFile],
    [".py", python_file_1.createPythonFile],
]);
const workspace = new workspace_1.default();
// Create a connection for the server
const connection = process.argv.length <= 2
    ? vscode_languageserver_1.createConnection(process.stdin, process.stdout)
    : vscode_languageserver_1.createConnection();
const logger = logger_1.ConsoleLogger;
exports.BuildFromFilesRequest = new vscode_languageserver_1.RequestType("buildFromFiles");
// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot;
connection.onInitialize(onInitialize);
connection.onDocumentHighlight(onDocumentHighlight);
connection.onDidChangeConfiguration(onDidChangeConfiguration);
connection.onDocumentSymbol(onDocumentSymbol);
connection.onWorkspaceSymbol(onWorkspaceSymbol);
connection.onDefinition(onDefinition);
connection.onReferences(onReferences);
connection.onCompletion(onCompletion);
connection.onRequest(exports.BuildFromFilesRequest, onBuildFromFiles);
// Called when contents of a file changes
connection.onDidChangeTextDocument(onDidChangeTextDocument);
// Called when a file gets deleted or added
connection.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
/**
 * Parse files
 */
function onBuildFromFiles(message) {
    logger.info("buildFromFiles", message);
    workspace.clear();
    message.files.filter(_shouldAcceptFile).forEach(_readAndParseFile);
    settings_1.Config.getLibraries().forEach(_readAndParseLibrary);
}
/**
 * Provides completion items for given text position
 */
function onCompletion(textDocumentPosition) {
    logger.info("onCompletion...");
    const location = _textPositionToLocation(textDocumentPosition);
    const completionItems = completion_provider_1.findCompletionItems(location, workspace);
    logger.debug(JSON.stringify(completionItems, null, 2));
    return completionItems;
}
/**
 * Finds the definition for an item in the cursor position
 */
function onDefinition(textDocumentPosition) {
    logger.info("onDefinition...");
    const filePath = _filePathFromUri(textDocumentPosition.textDocument.uri);
    const found = definition_finder_1.findDefinition({
        filePath,
        position: {
            line: textDocumentPosition.position.line,
            column: textDocumentPosition.position.character,
        },
    }, workspace);
    if (!found) {
        return null;
    }
    return {
        uri: found.uri,
        range: found.range,
    };
}
/**
 * Configuration has changed
 */
function onDidChangeConfiguration(change) {
    logger.info("onDidChangeConfiguration...");
    if (change.settings && change.settings.rfLanguageServer) {
        const librariesBefore = settings_1.Config.getLibraries();
        settings_1.Config.setSettings(change.settings.rfLanguageServer);
        const librariesAfter = settings_1.Config.getLibraries();
        if (!_.isEqual(librariesBefore, librariesAfter)) {
            logger.info("Library configuration changed, reparsing...");
            workspace.removeAllLibraries();
            librariesAfter.forEach(_readAndParseLibrary);
        }
    }
}
/**
 * Message sent when the content of a text document did change in VSCode.
 */
function onDidChangeTextDocument(params) {
    logger.info("onDidChangeTextDocument", params.textDocument.uri);
    const filePath = _filePathFromUri(params.textDocument.uri);
    if (!_shouldAcceptFile(filePath)) {
        return;
    }
    // Because syncKind is set to Full, entire file content is received
    const firstChange = params.contentChanges[0];
    if (firstChange) {
        const fileData = firstChange.text;
        _parseFile(filePath, fileData);
    }
}
function onDidChangeWatchedFiles(params) {
    logger.info("onDidChangeWatchedFiles", params.changes.map(f => `[${_fileEventTypeToString(f)} ${f.uri}]`).join(" "));
    const urisOfDeletedFiles = params.changes
        .filter(change => change.type === vscode_languageserver_1.FileChangeType.Deleted)
        .map(deletedFile => _filePathFromUri(deletedFile.uri));
    // Remove deleted files
    urisOfDeletedFiles.forEach(deletedFilePath => {
        logger.info("Removing file", deletedFilePath);
        workspace.removeFileByPath(deletedFilePath);
    });
    const urisOfCreatedFiles = params.changes
        .filter(change => change.type === vscode_languageserver_1.FileChangeType.Created)
        .map(createdFile => _filePathFromUri(createdFile.uri));
    // There are no 'onDidChangeTextDocument' events for python files, because
    // the extension is not configured to work with .py files.
    const urisOfChangedPyFiles = params.changes
        .filter(change => change.type === vscode_languageserver_1.FileChangeType.Changed)
        .map(createdFile => _filePathFromUri(createdFile.uri))
        .filter(_isPythonFile);
    [...urisOfCreatedFiles, ...urisOfChangedPyFiles]
        // In some cases there can be a create and delete events for the same file.
        // Such as in the case of VSCode python extension, which creates temp
        // files when formatting.
        .filter(uri => !urisOfDeletedFiles.includes(uri) && _shouldAcceptFile(uri))
        .forEach(_readAndParseFile);
}
function onDocumentHighlight(textDocumentPosition) {
    logger.info("onDocumentHighlight...");
    const location = _textPositionToLocation(textDocumentPosition);
    const highlights = highlight_provider_1.findFileHighlights(location, workspace);
    return highlights;
}
/**
 * Provides document symbols
 */
function onDocumentSymbol(documentSymbol) {
    logger.info("onDocumentSymbol...");
    const filePath = _filePathFromUri(documentSymbol.textDocument.uri);
    const file = workspace.getFile(filePath);
    if (!file) {
        return [];
    }
    return symbol_provider_1.getFileSymbols(file);
}
/**
 *
 * @param params
 */
function onInitialize(params) {
    logger.info("Initializing...");
    const rootUri = params.rootUri;
    if (rootUri) {
        workspaceRoot = vscode_uri_1.default.parse(rootUri).fsPath;
    }
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: vscode_languageserver_1.TextDocumentSyncKind.Full,
            definitionProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            referencesProvider: true,
            documentHighlightProvider: true,
            completionProvider: {
                triggerCharacters: ["[", "{", "*", "."],
            },
        },
    };
}
/**
 * Finds references for the symbol in document position
 */
function onReferences(referenceParams) {
    logger.info("onReferences...");
    const filePath = _filePathFromUri(referenceParams.textDocument.uri);
    const foundReferences = reference_finder_1.findReferences({
        filePath,
        position: {
            line: referenceParams.position.line,
            column: referenceParams.position.character,
        },
    }, workspace);
    return foundReferences;
}
/**
 * Provides workspace symbols
 */
function onWorkspaceSymbol(workspaceSymbol) {
    logger.info("onWorkspaceSymbol...");
    const query = workspaceSymbol.query;
    return symbol_provider_1.getWorkspaceSymbols(workspace, query);
}
function _shouldAcceptFile(filePath) {
    const fileExt = path.extname(filePath);
    if (!parsersByFile.has(fileExt)) {
        logger.debug(`Not accepting file ${filePath}. Extension ${fileExt} is not supported.`);
        return false;
    }
    const { include, exclude } = settings_1.Config.getIncludeExclude();
    const hasIncludePatterns = include.length > 0;
    const hasExcludePatterns = exclude.length > 0;
    const shouldInclude = !hasIncludePatterns ||
        _.some(include, pattern => minimatch(filePath, pattern));
    const shouldExclude = hasExcludePatterns &&
        _.some(exclude, pattern => minimatch(filePath, pattern));
    if (!shouldInclude) {
        logger.debug(`Not accepting file ${filePath}. It doesn't match any include pattern.`);
    }
    else if (shouldExclude) {
        logger.debug(`Not accepting file ${filePath}. It matches an exclude pattern.`);
    }
    return shouldInclude && !shouldExclude;
}
const _isPythonFile = (filePath) => path.extname(filePath) === ".py";
function _parseFile(filePath, fileContents) {
    try {
        const createFn = _getParserFn(filePath);
        const file = _createWorkspaceFile(filePath, fileContents, createFn);
        workspace.addFile(file);
    }
    catch (error) {
        logger.error("Failed to parse", filePath, error);
    }
}
function _readAndParseFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const createFn = _getParserFn(filePath);
            const fileContents = yield asyncFs.readFileAsync(filePath, "utf-8");
            const file = _createWorkspaceFile(filePath, fileContents, createFn);
            workspace.addFile(file);
        }
        catch (error) {
            logger.error("Failed to parse file", filePath, error);
        }
    });
}
function _readAndParseLibrary(libraryName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let libraryDefinition;
            if (typeof libraryName === "string") {
                const filePath = path.join(LIBRARY_PATH, `${libraryName}.json`);
                const fileContents = yield asyncFs.readFileAsync(filePath, "utf-8");
                logger.info("Parsing library", filePath);
                libraryDefinition = JSON.parse(fileContents);
            }
            else {
                libraryDefinition = libraryName;
            }
            const file = library_1.createLibraryFile(libraryDefinition);
            workspace.addLibrary(file);
        }
        catch (error) {
            logger.error("Failed to parse library", libraryName, error);
        }
    });
}
function _getParserFn(filePath) {
    const fileExt = path.extname(filePath);
    const parserFn = parsersByFile.get(fileExt);
    if (!parserFn) {
        throw new Error(`Unsupported file extension ${fileExt}`);
    }
    return parserFn;
}
function _createWorkspaceFile(filePath, fileContents, createFn) {
    const relativePath = workspaceRoot
        ? path.relative(workspaceRoot, filePath)
        : filePath;
    logger.info("Parsing file", filePath);
    return createFn(fileContents, filePath, relativePath);
}
function _filePathFromUri(uri) {
    return vscode_uri_1.default.parse(uri).fsPath;
}
function _textPositionToLocation(position) {
    const filePath = _filePathFromUri(position.textDocument.uri);
    return {
        filePath,
        position: {
            line: position.position.line,
            column: position.position.character,
        },
    };
}
const _fileEventTypeToString = (fileEvent) => fileEvent.type === vscode_languageserver_1.FileChangeType.Created
    ? "Cr"
    : fileEvent.type === vscode_languageserver_1.FileChangeType.Changed
        ? "Ch"
        : "De";
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map