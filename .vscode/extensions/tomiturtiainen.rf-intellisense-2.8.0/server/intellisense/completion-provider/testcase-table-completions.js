Object.defineProperty(exports, "__esModule", { value: true });
const functionCompletions = require("./functions-table-completions");
const SETTINGS = [
    "Documentation",
    "Tags",
    "Setup",
    "Teardown",
    "Template",
    "Timeout",
];
/**
 * Returns the completions for test case table
 *
 */
function getCompletions(location, locationInfo, fileAst, workspace) {
    return functionCompletions.getCompletions(location, locationInfo, fileAst, workspace, SETTINGS);
}
exports.getCompletions = getCompletions;
//# sourceMappingURL=testcase-table-completions.js.map