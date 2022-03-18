Object.defineProperty(exports, "__esModule", { value: true });
const position_1 = require("../utils/position");
const vscode_languageserver_1 = require("vscode-languageserver");
const formatters_1 = require("./formatters");
const type_guards_1 = require("./type-guards");
/**
 * Returns all symbols for given file
 *
 * @param filePath
 * @param workspaceTree
 */
function getFileSymbols(file, useFileNameAsContainer = false, query = "") {
    const idMatches = _createIdMatcherFn(query);
    const createVariableSymbol = (node) => _createVariableSymbol(node, file, useFileNameAsContainer);
    const createKeywordSymbol = (node) => _createKeywordSymbol(node, file, useFileNameAsContainer);
    const createTestCaseSymbol = (node) => _createTestCaseSymbol(node, file, useFileNameAsContainer);
    const variableSymbols = file.variables
        .filter(idMatches)
        .map(createVariableSymbol);
    const keywordSymbols = file.keywords
        .filter(idMatches)
        .map(createKeywordSymbol);
    const testCases = file.ast.testCasesTable
        ? file.ast.testCasesTable.testCases
        : [];
    const testCaseSymbols = testCases.filter(idMatches).map(createTestCaseSymbol);
    return [...variableSymbols, ...keywordSymbols, ...testCaseSymbols];
}
exports.getFileSymbols = getFileSymbols;
/**
 * Returns all symbols in the workspace that match the given search string
 *
 * @param workspace
 */
function getWorkspaceSymbols(workspace, query) {
    return Array.from(workspace.getFiles())
        .map(files => getFileSymbols(files, true, query))
        .reduce((fileSymbols, allSymbols) => {
        return allSymbols.concat(fileSymbols);
    }, []);
}
exports.getWorkspaceSymbols = getWorkspaceSymbols;
/**
 * Creates a function that checks if given identifier is
 * a match to given query string. Comparison is done
 * case insensitive.
 *
 * @param query
 *
 * @returns {function}
 */
function _createIdMatcherFn(query) {
    const lowerQuery = query.toLowerCase();
    return (node) => {
        if (query.includes(".") && type_guards_1.isUserKeyword(node)) {
            // Query must be considered an explicit keyword to match this node.
            // Only keywords with namespaces shall match.
            if (node.id.namespace) {
                return node.id.fullName.toLowerCase().includes(lowerQuery);
            }
        }
        const toMatch = type_guards_1.isVariableDeclaration(node)
            ? formatters_1.formatVariable(node)
            : node.id.name;
        return toMatch.toLowerCase().includes(lowerQuery);
    };
}
function _createVariableSymbol(node, file, useFileNameAsContainer) {
    return {
        name: formatters_1.formatVariable(node),
        kind: vscode_languageserver_1.SymbolKind.Variable,
        location: {
            uri: file.uri,
            range: position_1.nodeLocationToRange(node),
        },
        containerName: useFileNameAsContainer ? file.relativePath : undefined,
    };
}
function _createTestCaseSymbol(node, file, useFileNameAsContainer) {
    return {
        name: node.id.name,
        kind: vscode_languageserver_1.SymbolKind.Function,
        location: {
            uri: file.uri,
            range: position_1.nodeLocationToRange(node),
        },
        containerName: useFileNameAsContainer ? file.relativePath : "<test case>",
    };
}
function _createKeywordSymbol(node, file, useFileNameAsContainer) {
    return {
        name: node.id.name,
        kind: vscode_languageserver_1.SymbolKind.Function,
        location: {
            uri: file.uri,
            range: position_1.nodeLocationToRange(node),
        },
        containerName: useFileNameAsContainer ? file.relativePath : "<keyword>",
    };
}
//# sourceMappingURL=symbol-provider.js.map