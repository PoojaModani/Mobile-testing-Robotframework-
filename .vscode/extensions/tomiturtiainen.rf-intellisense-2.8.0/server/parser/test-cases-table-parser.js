Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const row_iterator_1 = require("./row-iterator");
const models_1 = require("./models");
const SettingParser = require("./setting-parser");
const primitive_parsers_1 = require("./primitive-parsers");
const function_parsers_1 = require("./function-parsers");
const testCaseSettings = new Set([
    "[Documentation]",
    "[Teardown]",
    "[Tags]",
    "[Timeout]",
    "[Setup]",
]);
function parseTestCasesTable(dataTable) {
    const testCasesTable = new models_1.TestCasesTable(dataTable.location);
    let currentTestCase;
    const iterator = new row_iterator_1.TableRowIterator(dataTable);
    while (!iterator.isDone()) {
        const row = iterator.takeRow();
        if (row.isEmpty()) {
            continue;
        }
        if (startsTestCase(row)) {
            const identifier = primitive_parsers_1.parseIdentifier(row.first());
            currentTestCase = new models_1.TestCase(identifier, row.location.start);
            testCasesTable.addTestCase(currentTestCase);
        }
        else if (currentTestCase) {
            const firstRowDataCells = row.getCellsByRange(1);
            const continuedRows = iterator.takeRowWhile(rowContinues);
            const continuedCells = joinRows(continuedRows);
            const [firstCell, ...restCells] = firstRowDataCells.concat(continuedCells);
            if (testCaseSettings.has(firstCell.content)) {
                const setting = SettingParser.parseSetting(firstCell, restCells);
                setTestCaseSetting(currentTestCase, setting);
                currentTestCase.location.end = setting.location.end;
            }
            else {
                const step = function_parsers_1.parseStep(firstCell, restCells);
                currentTestCase.addStep(step);
                currentTestCase.location.end = step.location.end;
            }
        }
    }
    return testCasesTable;
}
exports.parseTestCasesTable = parseTestCasesTable;
function rowContinues(row) {
    return row.isRowContinuation({
        requireFirstEmpty: true,
    });
}
function joinRows(rows) {
    const shouldTakeCell = (cell) => !cell.isRowContinuation();
    return rows.reduce((allCells, row) => {
        const rowCells = _.takeRightWhile(row.cells, shouldTakeCell);
        return allCells.concat(rowCells);
    }, []);
}
function setTestCaseSetting(testCase, setting) {
    if (SettingParser.isDocumentation(setting)) {
        testCase.documentation = setting;
    }
    else if (SettingParser.isTimeout(setting)) {
        testCase.timeout = setting;
    }
    else if (SettingParser.isSetup(setting)) {
        testCase.setup = setting;
    }
    else if (SettingParser.isTeardown(setting)) {
        testCase.teardown = setting;
    }
    else if (SettingParser.isTags(setting)) {
        testCase.tags = setting;
    }
}
function startsTestCase(row) {
    return !row.first().isEmpty();
}
//# sourceMappingURL=test-cases-table-parser.js.map