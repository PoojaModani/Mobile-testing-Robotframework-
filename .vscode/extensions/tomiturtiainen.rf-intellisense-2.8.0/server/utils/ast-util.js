Object.defineProperty(exports, "__esModule", { value: true });
const traverse_1 = require("../traverse/traverse");
/**
 * Traverses given abstract syntax tree and returns the nodes
 * for which the matchFn returns a truthy value.
 *
 * @param ast  abstract syntax tree
 * @param matchFn
 */
function filter(ast, matchFn) {
    const nodes = [];
    traverse_1.traverse(ast, {
        enter: (node) => {
            if (matchFn(node)) {
                nodes.push(node);
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return nodes;
}
exports.filter = filter;
//# sourceMappingURL=ast-util.js.map