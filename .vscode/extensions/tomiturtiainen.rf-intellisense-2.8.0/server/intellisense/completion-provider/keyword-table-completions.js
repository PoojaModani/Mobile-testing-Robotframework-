Object.defineProperty(exports, "__esModule", { value: true });
const functionCompletions = require("./functions-table-completions");
const SETTINGS = [
    "Documentation",
    "Tags",
    "Arguments",
    "Return",
    "Teardown",
    "Timeout",
];
function getCompletions(location, locationInfo, fileAst, workspace) {
    return functionCompletions.getCompletions(location, locationInfo, fileAst, workspace, SETTINGS);
}
exports.getCompletions = getCompletions;
//# sourceMappingURL=keyword-table-completions.js.map