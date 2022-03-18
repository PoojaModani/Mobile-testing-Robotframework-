Object.defineProperty(exports, "__esModule", { value: true });
const typeGuards = require("../type-guards");
const traverse_1 = require("../../traverse/traverse");
const position_1 = require("../../utils/position");
const completion_helper_1 = require("./completion-helper");
const KEYWORDS = [
    "Default Tags",
    "Documentation",
    "Force Tags",
    "Library",
    "Metadata",
    "Resource",
    "Suite Setup",
    "Suite Teardown",
    "Test Setup",
    "Test Teardown",
    "Test Template",
    "Test Timeout",
];
function getCompletions(location, locationInfo, fileAst, workspace) {
    const { row, cell, textBefore } = locationInfo;
    const cellIndex = row.indexOf(cell);
    const isFirstCell = cellIndex === 0;
    if (isFirstCell) {
        return completion_helper_1.getSyntaxCompletions(textBefore, KEYWORDS);
    }
    const nodeOnLine = _findNodeOnLine(location.position.line, fileAst);
    if (!nodeOnLine) {
        return [];
    }
    if (typeGuards.isDocumentation(nodeOnLine)) {
        return [];
    }
    if (typeGuards.isSuiteSetting(nodeOnLine)) {
        return _getSuiteSettingCompletions(textBefore, nodeOnLine, cellIndex, workspace);
    }
    return completion_helper_1.getVariableCompletions(textBefore, workspace.variables);
}
exports.getCompletions = getCompletions;
function _getSuiteSettingCompletions(textBefore, suiteSetting, cellIndex, workspace) {
    if (_isSetupOrTeardown(suiteSetting) && cellIndex === 1) {
        return completion_helper_1.getKeywordCompletions(textBefore, workspace);
    }
    else {
        return completion_helper_1.getVariableCompletions(textBefore, workspace.variables);
    }
}
function _isSetupOrTeardown(setting) {
    const settingName = setting.name.name.toLowerCase();
    return [
        "suite setup",
        "suite teardown",
        "test setup",
        "test teardown",
    ].includes(settingName);
}
function _findNodeOnLine(line, ast) {
    let foundNode;
    traverse_1.traverse(ast.settingsTable, {
        enter: (node) => {
            if (foundNode) {
                return traverse_1.VisitorOption.Break;
            }
            if (typeGuards.isSettingsTable(node)) {
                return traverse_1.VisitorOption.Continue;
            }
            if (position_1.isOnLine(line, node)) {
                foundNode = node;
                return traverse_1.VisitorOption.Break;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return foundNode;
}
//# sourceMappingURL=settings-table-completions.js.map