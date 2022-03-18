Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const models_1 = require("./models");
const table_reader_1 = require("./table-reader");
const settings_table_parser_1 = require("./settings-table-parser");
const keywords_table_parser_1 = require("./keywords-table-parser");
const variables_table_parser_1 = require("./variables-table-parser");
const test_cases_table_parser_1 = require("./test-cases-table-parser");
const SETTINGS_TABLES = new Set(["setting", "settings"]);
const VARIABLES_TABLES = new Set(["variable", "variables"]);
const KEYWORDS_TABLES = new Set(["keyword", "keywords"]);
const TEST_CASES_TABLES = new Set(["test case", "test cases"]);
class FileParser {
    readTables(data) {
        const tableReader = new table_reader_1.TableReader();
        return tableReader.read(data);
    }
    parseFile(data, namespace) {
        let fileTables;
        if (typeof data === "string") {
            fileTables = this.readTables(data);
        }
        else {
            fileTables = data;
        }
        if (_.isEmpty(fileTables)) {
            return new models_1.TestSuite({
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
            });
        }
        const firstTable = _.first(fileTables);
        const lastTable = _.last(fileTables);
        const testDataFile = new models_1.TestSuite({
            start: firstTable.location.start,
            end: lastTable.location.end,
        });
        fileTables.forEach(dataTable => {
            const lowerCaseTableName = dataTable.name.toLowerCase();
            if (SETTINGS_TABLES.has(lowerCaseTableName)) {
                const parsedTable = settings_table_parser_1.parseSettingsTable(dataTable);
                testDataFile.settingsTable = parsedTable;
            }
            else if (VARIABLES_TABLES.has(lowerCaseTableName)) {
                const parsedTable = variables_table_parser_1.parseVariablesTable(dataTable);
                testDataFile.variablesTable = parsedTable;
            }
            else if (KEYWORDS_TABLES.has(lowerCaseTableName)) {
                const parsedTable = keywords_table_parser_1.parseKeywordsTable(dataTable, namespace);
                testDataFile.keywordsTable = parsedTable;
            }
            else if (TEST_CASES_TABLES.has(lowerCaseTableName)) {
                const parsedTable = test_cases_table_parser_1.parseTestCasesTable(dataTable);
                testDataFile.testCasesTable = parsedTable;
            }
        });
        return testDataFile;
    }
}
exports.FileParser = FileParser;
//# sourceMappingURL=parser.js.map