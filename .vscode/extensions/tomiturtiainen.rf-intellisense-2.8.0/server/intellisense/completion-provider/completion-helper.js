Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const search_tree_1 = require("../search-tree");
const logger_1 = require("../../logger");
const formatters_1 = require("../formatters");
const vscode_languageserver_1 = require("vscode-languageserver");
const VARIABLE_PREFIXES = new Set(["$", "@", "%", "&"]);
/**
 * Get completions for syntax keywords
 *
 * @param textToSearch
 * @param syntaxKeywords
 */
function getSyntaxCompletions(textToSearch, syntaxKeywords) {
    const lowerText = textToSearch.toLowerCase();
    return syntaxKeywords
        .filter(keyword => keyword.toLowerCase().startsWith(lowerText))
        .map(keyword => ({
        label: keyword,
        kind: vscode_languageserver_1.CompletionItemKind.Keyword,
    }));
}
exports.getSyntaxCompletions = getSyntaxCompletions;
/**
 *
 * @param textToSearch
 * @param workspace
 * @param localVariables
 */
function getKeywordCompletions(textToSearch, workspace, localVariables) {
    if (_isInVariable(textToSearch)) {
        return getVariableCompletions(textToSearch, workspace.variables, localVariables);
    }
    logger_1.ConsoleLogger.debug(`Searching keywords with ${textToSearch}`);
    const [namespace, identifier] = _tryParseNamespacedIdentifier(textToSearch);
    logger_1.ConsoleLogger.debug(`Searching from namespace '${namespace}' with text '${identifier}'`);
    if (namespace) {
        // Search within single namespace
        const symbols = workspace.getSymbolsByNamespace(namespace);
        if (!symbols) {
            logger_1.ConsoleLogger.info(`No corresponding file found with namespace ${namespace}`);
            // Unknown namespace
            return [];
        }
        const keywords = symbols.keywords.findByPrefix(identifier);
        const suggestions = keywords.map(keyword => {
            // tslint:disable-next-line:prefer-const
            let [insertText, insertTextFormat] = _createKeywordSnippet(keyword, false);
            const detail = _getKeywordArgs(keyword);
            const documentation = _getKeywordDocumentation(keyword);
            if (identifier.includes(" ")) {
                // VSCode completion handles only complete words and not spaces,
                // so everything before the last space needs to be trimmed
                // from the insert text for it to work correctly
                const textBeforeLastSpace = identifier.substr(0, identifier.lastIndexOf(" ") + 1);
                insertText = _removeFromBeginning(insertText, textBeforeLastSpace);
            }
            return {
                label: keyword.id.name,
                kind: vscode_languageserver_1.CompletionItemKind.Function,
                insertText,
                insertTextFormat,
                detail,
                documentation,
            };
        });
        return suggestions;
    }
    else {
        const keywordGroups = workspace.findKeywords(textToSearch);
        const keywords = keywordGroups.map(keywordGroup => {
            // A keyword is ambiguous when there are multiples in the
            // global workspace with the same name.
            const shouldSuggestNamespace = keywordGroup.length > 1;
            return keywordGroup.map(keyword => {
                // tslint:disable-next-line:prefer-const
                let [insertText, insertTextFormat] = _createKeywordSnippet(keyword, shouldSuggestNamespace);
                const detail = _getKeywordArgs(keyword);
                const documentation = _getKeywordDocumentation(keyword);
                if (textToSearch.includes(" ")) {
                    // VSCode completion handles only complete words and not spaces,
                    // so everything before the last space needs to be trimmed
                    // from the insert text for it to work correctly
                    const textBeforeLastSpace = textToSearch.substr(0, textToSearch.lastIndexOf(" ") + 1);
                    insertText = _removeFromBeginning(insertText, textBeforeLastSpace);
                }
                return {
                    label: shouldSuggestNamespace ? keyword.id.fullName : keyword.id.name,
                    kind: vscode_languageserver_1.CompletionItemKind.Function,
                    insertText,
                    insertTextFormat,
                    detail,
                    documentation,
                };
            });
        });
        const namespaces = workspace
            .findModulesByNamespace(textToSearch)
            .map(foundModule => ({
            label: foundModule.namespace,
            kind: vscode_languageserver_1.CompletionItemKind.Module,
            insertText: foundModule.namespace,
            insertTextFormat: vscode_languageserver_1.InsertTextFormat.PlainText,
            detail: "",
            documentation: foundModule.documentation,
        }));
        return _.flatten(keywords).concat(namespaces);
    }
}
exports.getKeywordCompletions = getKeywordCompletions;
/**
 *
 * @param textToSearch
 * @param globalVariables
 * @param localVariables
 */
function getVariableCompletions(textToSearch, globalVariables, localVariables = search_tree_1.VariableContainer.Empty, suiteVariables = search_tree_1.VariableContainer.Empty) {
    if (!_isInVariable(textToSearch)) {
        return [];
    }
    const searchText = _getVariableSearchText(textToSearch);
    logger_1.ConsoleLogger.debug(`Searching variables with ${searchText}`);
    const localCompletions = localVariables
        .findByPrefix(searchText)
        .map(_localVarToCompletionItem);
    const suiteCompletions = suiteVariables
        .findByPrefix(searchText)
        .map(_suiteVarToCompletionItem);
    const globalCompletions = globalVariables
        .findByPrefix(searchText)
        .map(_globalVarToCompletionItem);
    return [...localCompletions, ...suiteCompletions, ...globalCompletions];
}
exports.getVariableCompletions = getVariableCompletions;
const _localVarToCompletionItem = (variable) => _variableToCompletionItem(`0-${variable.id.name}`, variable);
const _suiteVarToCompletionItem = (variable) => _variableToCompletionItem(`1-${variable.id.name}`, variable);
const _globalVarToCompletionItem = (variable) => _variableToCompletionItem(`2-${variable.id.name}`, variable);
function _variableToCompletionItem(sortText, variable) {
    const variableLabel = formatters_1.formatVariable(variable);
    const variableName = variable.id.name;
    return {
        label: variableLabel,
        insertText: variableName,
        kind: vscode_languageserver_1.CompletionItemKind.Variable,
        sortText,
    };
}
function _isInVariable(text) {
    const lastStartingCurlyIdx = text.lastIndexOf("{");
    if (lastStartingCurlyIdx < 0) {
        return false;
    }
    const lastEndingCurlyIdx = text.lastIndexOf("}");
    if (lastStartingCurlyIdx < lastEndingCurlyIdx) {
        return false;
    }
    const charBeforeCurly = text[lastStartingCurlyIdx - 1];
    if (!VARIABLE_PREFIXES.has(charBeforeCurly)) {
        return false;
    }
    return true;
}
function _getVariableSearchText(textBefore) {
    const curlyBeforeIdx = textBefore.lastIndexOf("{");
    return textBefore.substring(curlyBeforeIdx - 1);
}
/**
 * Creates a signature from given keyword. If the keyword has arguments,
 * the signature is returned as a snippet
 *
 * @param keyword
 */
function _createKeywordSnippet(keyword, suggestNamespace) {
    const keywordName = suggestNamespace ? keyword.id.fullName : keyword.id.name;
    if (keyword.arguments) {
        const args = keyword.arguments.values
            .map((arg, idx) => `\${${idx + 1}:${arg.id.name}}`)
            .join("  ");
        return [`${keywordName}  ${args}`, vscode_languageserver_1.InsertTextFormat.Snippet];
    }
    else {
        return [keywordName, vscode_languageserver_1.InsertTextFormat.PlainText];
    }
}
function _removeFromBeginning(toCheck, partToRemove) {
    const regex = new RegExp(`^${_.escapeRegExp(partToRemove)}`, "i");
    return toCheck.replace(regex, "");
}
function _getKeywordArgs(keyword) {
    if (keyword.arguments) {
        return keyword.arguments.values.map(arg => formatters_1.formatVariable(arg)).join("  ");
    }
    else {
        return undefined;
    }
}
function _getKeywordDocumentation(keyword) {
    if (keyword.documentation && keyword.documentation.value) {
        return {
            kind: vscode_languageserver_1.MarkupKind.Markdown,
            value: keyword.documentation.value.value,
        };
    }
    else {
        return undefined;
    }
}
/**
 * Tries to parse a namespace and keyword identifier from given string
 *
 * @example
 * _tryParseNamespacedIdentifier("Keyword")
 * // --> ["", "Keyword"]
 *
 * _tryParseNamespacedIdentifier("Lib.K")
 * // --> ["Lib", "K"]
 */
const _tryParseNamespacedIdentifier = (text) => {
    const dotIndex = text.indexOf(".");
    if (dotIndex === -1) {
        return ["", text];
    }
    else {
        const namespace = text.substring(0, dotIndex);
        const identifier = text.substring(dotIndex + 1);
        return [namespace, identifier];
    }
};
//# sourceMappingURL=completion-helper.js.map