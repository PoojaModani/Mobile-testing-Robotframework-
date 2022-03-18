Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const row_iterator_1 = require("./row-iterator");
const models_1 = require("./models");
const SettingParser = require("./setting-parser");
const primitive_parsers_1 = require("./primitive-parsers");
const function_parsers_1 = require("./function-parsers");
const keywordSettings = new Set([
    "[Documentation]",
    "[Arguments]",
    "[Return]",
    "[Teardown]",
    "[Tags]",
    "[Timeout]",
]);
function parseKeywordsTable(dataTable, namespace) {
    const keywordsTable = new models_1.KeywordsTable(dataTable.location);
    let currentKeyword;
    const iterator = new row_iterator_1.TableRowIterator(dataTable);
    while (!iterator.isDone()) {
        const row = iterator.takeRow();
        if (row.isEmpty()) {
            continue;
        }
        if (startsKeyword(row)) {
            const identifier = primitive_parsers_1.parseIdentifier(row.first());
            const namespacedIdentifier = new models_1.NamespacedIdentifier(namespace, identifier.name, identifier.location);
            currentKeyword = new models_1.UserKeyword(namespacedIdentifier, row.location.start);
            keywordsTable.addKeyword(currentKeyword);
        }
        else if (currentKeyword) {
            const firstRowDataCells = row.getCellsByRange(1);
            const continuedRows = iterator.takeRowWhile(rowContinues);
            const continuedCells = joinRows(continuedRows);
            const [firstCell, ...restCells] = firstRowDataCells.concat(continuedCells);
            if (keywordSettings.has(firstCell.content)) {
                const setting = SettingParser.parseSetting(firstCell, restCells);
                setKeywordSetting(currentKeyword, setting);
                currentKeyword.location.end = setting.location.end;
            }
            else {
                const step = function_parsers_1.parseStep(firstCell, restCells);
                currentKeyword.addStep(step);
                currentKeyword.location.end = step.location.end;
            }
        }
    }
    return keywordsTable;
}
exports.parseKeywordsTable = parseKeywordsTable;
function startsKeyword(row) {
    return !row.first().isEmpty();
}
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
function setKeywordSetting(keyword, setting) {
    if (SettingParser.isDocumentation(setting)) {
        keyword.documentation = setting;
    }
    else if (SettingParser.isArguments(setting)) {
        keyword.arguments = setting;
    }
    else if (SettingParser.isReturn(setting)) {
        keyword.return = setting;
    }
    else if (SettingParser.isTimeout(setting)) {
        keyword.timeout = setting;
    }
    else if (SettingParser.isTeardown(setting)) {
        keyword.teardown = setting;
    }
    else if (SettingParser.isTags(setting)) {
        keyword.tags = setting;
    }
}
//# sourceMappingURL=keywords-table-parser.js.map