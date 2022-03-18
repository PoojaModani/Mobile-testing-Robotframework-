Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const logger_1 = require("../logger");
const position_1 = require("../utils/position");
const node_locator_1 = require("./node-locator");
const completion_providers_1 = require("./completion-provider/completion-providers");
function findCompletionItems(location, workspace) {
    const position = location.position;
    const file = workspace.getFile(location.filePath);
    if (!file) {
        logger_1.ConsoleLogger.info(`Definition not found. File '${location.filePath}' not parsed`);
        return [];
    }
    const ast = file.ast;
    const locationInfo = node_locator_1.findLocationInfo(location, file.tables);
    if (!locationInfo) {
        logger_1.ConsoleLogger.info(`Location info not available. Location '${location.position}' not available`);
        return [];
    }
    const suiteCompletions = completion_providers_1.getSuiteCompletion(location, locationInfo, ast);
    if (!_.isEmpty(suiteCompletions)) {
        return suiteCompletions;
    }
    if (position_1.isInRange(position, ast.settingsTable)) {
        return completion_providers_1.getSettingsTableCompletions(location, locationInfo, ast, workspace);
    }
    else if (position_1.isInRange(position, ast.variablesTable)) {
        return completion_providers_1.getVariableTableCompletions(location, locationInfo, ast, workspace);
    }
    else if (position_1.isInRange(position, ast.keywordsTable)) {
        return completion_providers_1.getKeywordTableCompletions(location, locationInfo, ast, workspace);
    }
    else if (position_1.isInRange(position, ast.testCasesTable)) {
        return completion_providers_1.getTestCaseTableCompletions(location, locationInfo, ast, workspace);
    }
    return [];
}
exports.findCompletionItems = findCompletionItems;
//# sourceMappingURL=completion-provider.js.map