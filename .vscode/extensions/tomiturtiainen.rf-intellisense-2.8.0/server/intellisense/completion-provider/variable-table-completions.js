Object.defineProperty(exports, "__esModule", { value: true });
const completion_helper_1 = require("./completion-helper");
function getCompletions(location, locationInfo, fileAst, workspace) {
    const { row, cell, textBefore } = locationInfo;
    const isFirstCell = row.indexOf(cell) === 0;
    if (isFirstCell) {
        return [];
    }
    return completion_helper_1.getVariableCompletions(textBefore, workspace.variables);
}
exports.getCompletions = getCompletions;
//# sourceMappingURL=variable-table-completions.js.map