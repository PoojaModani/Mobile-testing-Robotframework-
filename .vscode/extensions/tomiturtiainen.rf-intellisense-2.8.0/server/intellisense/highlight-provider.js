Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const typeGuards = require("./type-guards");
const logger_1 = require("../logger");
const position_1 = require("../utils/position");
const ast_util_1 = require("../utils/ast-util");
const node_locator_1 = require("./node-locator");
/**
 *
 * @param location
 * @param workspace
 */
function findFileHighlights(location, workspace) {
    const file = workspace.getFile(location.filePath);
    if (!file) {
        logger_1.ConsoleLogger.info(`Definition not found. File '${location.filePath}' not parsed`);
        return [];
    }
    const nodeInPos = node_locator_1.findNodeInPos(location.position, file);
    const variableHighlights = _tryFindVariableHighlights(nodeInPos);
    if (variableHighlights) {
        return variableHighlights;
    }
    const keywordHighlights = _tryFindKeywordHighlights(nodeInPos);
    if (keywordHighlights) {
        return keywordHighlights;
    }
    const settingHighlights = _tryFindSettingHighlights(nodeInPos);
    if (settingHighlights) {
        return settingHighlights;
    }
    // if (_isSettingDeclaration(nodeInPos)) {
    // }
    return [];
}
exports.findFileHighlights = findFileHighlights;
/**
 * Tries to find highlights for variables
 *
 * @param nodeInPos
 *
 * @return null if there isn't a variable in the position,
 * otherwise highlights for the variables
 */
function _tryFindVariableHighlights(nodeInPos) {
    const lastNode = nodeInPos.node;
    const secondLast = _.last(nodeInPos.path);
    let variable;
    if (typeGuards.isVariableDeclaration(lastNode)) {
        variable = lastNode;
    }
    else if (typeGuards.isIdentifier(lastNode)) {
        if (typeGuards.isVariableDeclaration(secondLast)) {
            variable = secondLast;
        }
        else if (typeGuards.isVariableExpression(secondLast)) {
            variable = secondLast;
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
    const functionNode = _tryFindFunctionDeclaration(nodeInPos);
    let searchScope = nodeInPos.file.ast;
    if (functionNode) {
        // Might be a local variable
        const locals = node_locator_1.findLocalVariables(functionNode);
        const localVariable = locals.findVariable(variable.kind, variable.id.name);
        if (localVariable) {
            // Search only within the function
            searchScope = functionNode;
        }
    }
    return ast_util_1.filter(searchScope, node => {
        if (typeGuards.isVariableDeclaration(node) ||
            typeGuards.isVariableExpression(node)) {
            return (node.kind === variable.kind &&
                node.id.name.toLowerCase() === variable.id.name.toLowerCase());
        }
        else {
            return false;
        }
    }).map(node => {
        const highlightFor = typeGuards.isVariableDeclaration(node)
            ? node.id
            : node;
        return _createSymbolHighlight(highlightFor);
    });
}
/**
 * Tries to find highlights for user keywords
 *
 * @param nodeInPos
 *
 * @return null if there isn't a variable in the position,
 * otherwise highlights for the variables
 */
function _tryFindKeywordHighlights(nodeInPos) {
    const lastNode = nodeInPos.node;
    const secondLast = _.last(nodeInPos.path);
    let keywordName;
    if (!typeGuards.isIdentifier(lastNode)) {
        return null;
    }
    if (typeGuards.isCallExpression(secondLast)) {
        keywordName = secondLast.callee.name;
    }
    else if (typeGuards.isUserKeyword(secondLast)) {
        keywordName = secondLast.id.name;
    }
    else {
        return null;
    }
    // TODO: Support keywords with embedded arguments
    return ast_util_1.filter(nodeInPos.file.ast, node => {
        if (typeGuards.isCallExpression(node)) {
            return node.callee.name.toLowerCase() === keywordName.toLowerCase();
        }
        else if (typeGuards.isUserKeyword(node)) {
            return node.id.name.toLowerCase() === keywordName.toLowerCase();
        }
        else {
            return false;
        }
    }).map(node => {
        if (typeGuards.isCallExpression(node)) {
            return _createSymbolHighlight(node.callee);
        }
        else if (typeGuards.isUserKeyword(node)) {
            return _createSymbolHighlight(node.id);
        }
        else {
            return undefined;
        }
    });
}
function _tryFindSettingHighlights(nodeInPos) {
    const lastNode = nodeInPos.node;
    const secondLast = _.last(nodeInPos.path);
    if (!typeGuards.isIdentifier(lastNode) ||
        !typeGuards.isSettingDeclaration(secondLast)) {
        return null;
    }
    const settings = ast_util_1.filter(nodeInPos.file.ast, node => typeGuards.isSettingDeclaration(node) && node.kind === secondLast.kind);
    return settings.map(node => _createSymbolHighlight(node.id));
}
function _tryFindFunctionDeclaration(nodeInPos) {
    return [nodeInPos.node, ...nodeInPos.path].find(typeGuards.isFunctionDeclaration);
}
function _createSymbolHighlight(node) {
    return {
        range: position_1.nodeLocationToRange(node),
    };
}
//# sourceMappingURL=highlight-provider.js.map