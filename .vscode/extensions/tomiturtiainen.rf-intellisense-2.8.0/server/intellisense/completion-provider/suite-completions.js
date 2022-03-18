Object.defineProperty(exports, "__esModule", { value: true });
const completion_helper_1 = require("./completion-helper");
/**
 * Return the completions for data tables
 */
function getCompletions(location, locationInfo, fileAst) {
    const { row, cell, textBefore: text } = locationInfo;
    if (row.indexOf(cell) !== 0 || !text.startsWith("*")) {
        return [];
    }
    const missingTables = _getMissingTables(fileAst);
    const sanitizedText = text.replace(/\*/g, "").replace(/ /g, "");
    return completion_helper_1.getSyntaxCompletions(sanitizedText, missingTables);
}
exports.getCompletions = getCompletions;
function _getMissingTables(ast) {
    const tables = [];
    if (!ast.settingsTable) {
        tables.push("Settings");
    }
    if (!ast.variablesTable) {
        tables.push("Variables");
    }
    if (!ast.keywordsTable) {
        tables.push("Keywords");
    }
    if (!ast.testCasesTable) {
        tables.push("Test Cases");
    }
    return tables;
}
//# sourceMappingURL=suite-completions.js.map