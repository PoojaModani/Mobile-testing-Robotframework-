Object.defineProperty(exports, "__esModule", { value: true });
const table_models_1 = require("../table-models");
var position_helper_1 = require("../position-helper");
exports.createPosition = position_helper_1.position;
exports.createLocation = position_helper_1.location;
// export const position = createPosition;
// export const createLocation = location;
function table(name, content) {
    const theTable = new table_models_1.DataTable(name, content.header);
    return content.rows
        ? Object.assign(theTable, { rows: content.rows })
        : theTable;
}
exports.table = table;
function row(location, cells) {
    const theRow = new table_models_1.DataRow(location);
    return cells ? Object.assign(theRow, { cells }) : theRow;
}
exports.row = row;
function createCell(location, content) {
    return new table_models_1.DataCell(content, location);
}
exports.createCell = createCell;
//# sourceMappingURL=test-helper.js.map