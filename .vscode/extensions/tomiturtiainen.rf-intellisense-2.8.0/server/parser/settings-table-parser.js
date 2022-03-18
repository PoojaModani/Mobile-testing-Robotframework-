Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const positionHelper = require("./position-helper");
const row_iterator_1 = require("./row-iterator");
const models_1 = require("./models");
const primitive_parsers_1 = require("./primitive-parsers");
const settingsParser = require("./setting-parser");
const settingParserMap = new Map([
    ["Documentation", parseDocumentation],
    ["Library", parseLibraryImport],
    ["Resource", parseResourceImport],
    ["Variables", parseVariableImport],
    ["Suite Setup", createParseSettingFn("suiteSetup")],
    ["Suite Teardown", createParseSettingFn("suiteTeardown")],
    ["Test Setup", createParseSettingFn("testSetup")],
    ["Test Teardown", createParseSettingFn("testTeardown")],
]);
/**
 * Parses given table as settings table
 */
function parseSettingsTable(dataTable) {
    const settingsTable = new models_1.SettingsTable(dataTable.location);
    const iterator = new row_iterator_1.TableRowIterator(dataTable);
    while (!iterator.isDone()) {
        const row = iterator.takeRow();
        if (row.isEmpty()) {
            continue;
        }
        const continuedRows = iterator.takeRowWhile(rowContinues);
        const continuedCells = joinRows(continuedRows);
        const [firstCell, ...restCells] = row.cells.concat(continuedCells);
        const parseRowFn = getParserFn(firstCell);
        parseRowFn(settingsTable, firstCell, restCells);
    }
    return settingsTable;
}
exports.parseSettingsTable = parseSettingsTable;
function rowContinues(row) {
    return row.isRowContinuation({
        requireFirstEmpty: false,
    });
}
function joinRows(rows) {
    const shouldTakeCell = (cell) => !cell.isRowContinuation();
    return rows.reduce((allCells, row) => {
        const rowCells = _.takeRightWhile(row.cells, shouldTakeCell);
        return allCells.concat(rowCells);
    }, []);
}
function getParserFn(cell) {
    const name = cell.content;
    const parser = settingParserMap.get(name);
    return parser || _.noop;
}
function parseDocumentation(settingsTable, firstCell, restCells) {
    const id = primitive_parsers_1.parseIdentifier(firstCell);
    const documentation = settingsParser.parseDocumentation(id, restCells);
    settingsTable.documentation = documentation;
}
function parseLibraryImport(settingsTable, firstCell, restCells) {
    const [firstDataCell, ...restDataCells] = restCells;
    const target = primitive_parsers_1.parseValueExpression(firstDataCell);
    const args = restDataCells.map(primitive_parsers_1.parseValueExpression);
    // TODO: WITH NAME keyword
    const lastCell = _.last(restCells) || firstCell;
    const location = positionHelper.locationFromStartEnd(firstCell.location, lastCell.location);
    const libImport = new models_1.LibraryImport(target, args, location);
    settingsTable.addLibraryImport(libImport);
}
function parseResourceImport(settingsTable, firstCell, restCells) {
    const [firstDataCell] = restCells;
    const target = primitive_parsers_1.parseValueExpression(firstDataCell);
    const lastCell = _.last(restCells) || firstCell;
    const location = positionHelper.locationFromStartEnd(firstCell.location, lastCell.location);
    const resourceImport = new models_1.ResourceImport(target, location);
    settingsTable.addResourceImport(resourceImport);
}
function parseVariableImport(settingsTable, firstCell, restCells) {
    const [firstDataCell] = restCells;
    const target = primitive_parsers_1.parseValueExpression(firstDataCell);
    const lastCell = _.last(restCells) || firstCell;
    const location = positionHelper.locationFromStartEnd(firstCell.location, lastCell.location);
    const variableImport = new models_1.VariableImport(target, location);
    settingsTable.addVariableImport(variableImport);
}
function createParseSettingFn(propertyName) {
    return (settingsTable, nameCell, valueCells) => {
        const name = primitive_parsers_1.parseIdentifier(nameCell);
        const value = _.isEmpty(valueCells)
            ? new models_1.EmptyNode(nameCell.location.end)
            : primitive_parsers_1.parseCallExpression(valueCells);
        const lastCell = _.last(valueCells) || nameCell;
        const location = positionHelper.locationFromStartEnd(nameCell.location, lastCell.location);
        const setting = new models_1.SuiteSetting(name, value, location);
        settingsTable[propertyName] = setting;
    };
}
//# sourceMappingURL=settings-table-parser.js.map