Object.defineProperty(exports, "__esModule", { value: true });
const typeGuards = require("./type-guards");
const traverse_1 = require("../traverse/traverse");
const position_1 = require("../utils/position");
const search_tree_1 = require("./search-tree");
/**
 * Find the most specific node in the given document position
 *
 * @param pos
 * @param fileToSearch
 */
function findNodeInPos(pos, fileToSearch) {
    const pathToNode = [];
    let leafNode = null;
    traverse_1.traverse(fileToSearch.ast, {
        enter: (node, parent) => {
            if (!position_1.isInRange(pos, node)) {
                return traverse_1.VisitorOption.Skip;
            }
            else {
                if (leafNode) {
                    pathToNode.push(leafNode);
                }
                leafNode = node;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return {
        file: fileToSearch,
        path: pathToNode,
        node: leafNode,
    };
}
exports.findNodeInPos = findNodeInPos;
/**
 *
 * @param location
 * @param tables
 */
function findLocationInfo(location, tables) {
    const isOnLine = (loc) => loc.start.line <= location.position.line &&
        location.position.line <= loc.end.line;
    const isOnCell = (loc) => loc.start.column <= location.position.column &&
        location.position.column <= loc.end.column;
    const table = tables.find(t => isOnLine(t.location));
    if (!table) {
        return null;
    }
    const row = table.rows.find(r => isOnLine(r.location)) || table.header;
    const cell = row.cells.find(c => isOnCell(c.location));
    let textBefore = "";
    let textAfter = "";
    if (cell) {
        const columnRelativeToCell = location.position.column - cell.location.start.column;
        textBefore = cell.content.substring(0, columnRelativeToCell);
        textAfter = cell.content.substring(columnRelativeToCell);
    }
    return {
        row,
        cell,
        textBefore,
        textAfter,
    };
}
exports.findLocationInfo = findLocationInfo;
/**
 * Find local variables in a keyword or test case, including arguments.
 * If beforeLine is given, returns only those that are declared
 * before the given line.
 *
 * @param testCase
 * @param beforeLine
 */
function findLocalVariables(functionNode, beforeLine) {
    const variables = new search_tree_1.VariableContainer();
    const isBeforeLine = (node) => beforeLine === undefined || node.location.start.line < beforeLine;
    if (typeGuards.isUserKeyword(functionNode) && functionNode.arguments) {
        functionNode.arguments.values.forEach(arg => variables.add(arg));
    }
    functionNode.steps.forEach(step => {
        if (typeGuards.isVariableDeclaration(step.body) && isBeforeLine(step)) {
            variables.add(step.body);
        }
    });
    return variables;
}
exports.findLocalVariables = findLocalVariables;
//# sourceMappingURL=node-locator.js.map