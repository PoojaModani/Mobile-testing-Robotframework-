Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const typeGuards = require("../type-guards");
const node_locator_1 = require("../node-locator");
const traverse_1 = require("../../traverse/traverse");
const position_1 = require("../../utils/position");
const completion_helper_1 = require("./completion-helper");
const search_tree_1 = require("../search-tree");
const VARIABLE_CHARS = new Set(["$", "@", "&", "%"]);
function getCompletions(location, locationInfo, fileAst, workspace, settings) {
    const { row, cell, textBefore } = locationInfo;
    const cellIndex = row.indexOf(cell);
    const line = location.position.line;
    if (cellIndex === 0 || !row.first().isEmpty()) {
        return [];
    }
    else if (cellIndex === 1) {
        if (_startsSetting(textBefore)) {
            // Setting, e.g. [Arguments]
            return completion_helper_1.getSyntaxCompletions(textBefore.substring(1), settings);
        }
        else if (_startsVariable(textBefore)) {
            // Variable declaration, e.g. ${var}
            return [];
        }
        // else: It's a call expression
        const functionNode = _findFunction(line, fileAst);
        const localVariables = functionNode
            ? node_locator_1.findLocalVariables(functionNode, line)
            : search_tree_1.VariableContainer.Empty;
        return completion_helper_1.getKeywordCompletions(textBefore, workspace, localVariables);
    }
    else {
        const functionNode = _findFunction(line, fileAst);
        const nodeOnLine = _findNodeOnLine(line, functionNode);
        if (!nodeOnLine) {
            return [];
        }
        const noCompletions = [
            typeGuards.isDocumentation,
            typeGuards.isTags,
            typeGuards.isArguments,
            typeGuards.isTimeout,
        ];
        if (_.some(noCompletions, f => f(nodeOnLine))) {
            return [];
        }
        const localVariables = node_locator_1.findLocalVariables(functionNode, line);
        const keywordCompletions = [
            typeGuards.isSetup,
            typeGuards.isTeardown,
            typeGuards.isTemplate,
        ];
        if (cellIndex === 2 && _.some(keywordCompletions, f => f(nodeOnLine))) {
            return completion_helper_1.getKeywordCompletions(textBefore, workspace, localVariables);
        }
        else if (typeGuards.isStep(nodeOnLine) &&
            typeGuards.isVariableDeclaration(nodeOnLine.body)) {
            return completion_helper_1.getKeywordCompletions(textBefore, workspace, localVariables);
        }
        return completion_helper_1.getVariableCompletions(textBefore, workspace.variables, localVariables);
    }
}
exports.getCompletions = getCompletions;
function _startsSetting(text) {
    return text.startsWith("[");
}
function _startsVariable(text) {
    return VARIABLE_CHARS.has(text.charAt(0));
}
function _findFunction(line, ast) {
    const isNodeOnLine = (node) => position_1.isOnLine(line, node);
    if (isNodeOnLine(ast.keywordsTable)) {
        return ast.keywordsTable.keywords.find(isNodeOnLine);
    }
    else if (isNodeOnLine(ast.testCasesTable)) {
        return ast.testCasesTable.testCases.find(isNodeOnLine);
    }
    else {
        return null;
    }
}
function _findNodeOnLine(line, functionNode) {
    if (!functionNode) {
        return null;
    }
    let foundNode;
    const isNodeOnLine = (node) => position_1.isOnLine(line, node);
    traverse_1.traverse(functionNode, {
        enter: (node, parent) => {
            if (foundNode) {
                return traverse_1.VisitorOption.Break;
            }
            if (parent === functionNode && isNodeOnLine(node)) {
                foundNode = node;
                return traverse_1.VisitorOption.Break;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return foundNode;
}
//# sourceMappingURL=functions-table-completions.js.map