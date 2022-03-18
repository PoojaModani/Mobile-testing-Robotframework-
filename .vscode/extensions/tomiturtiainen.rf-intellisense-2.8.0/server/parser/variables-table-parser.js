Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("./models");
const primitive_parsers_1 = require("./primitive-parsers");
const variable_parsers_1 = require("./variable-parsers");
function parseVariablesTable(dataTable) {
    const variablesTable = new models_1.VariablesTable(dataTable.location);
    dataTable.rows.forEach(row => parseRow(variablesTable, row));
    return variablesTable;
}
exports.parseVariablesTable = parseVariablesTable;
function parseRow(variablesTable, row) {
    if (row.isEmpty()) {
        return;
    }
    const typeNameCell = row.first();
    if (!variable_parsers_1.isVariable(typeNameCell)) {
        return;
    }
    const typeAndName = variable_parsers_1.parseTypeAndName(typeNameCell);
    const values = row.getCellsByRange(1).map(primitive_parsers_1.parseValueExpression);
    const variableDeclaration = variable_parsers_1.parseVariableDeclaration(typeAndName, values, row.location);
    variablesTable.addVariable(variableDeclaration);
}
//# sourceMappingURL=variables-table-parser.js.map