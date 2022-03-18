Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
/**
 * Represents a table with rows
 */
class DataTable {
    /**
     *
     */
    constructor(name, header) {
        this.name = name;
        this.header = header;
        this.rows = [];
    }
    get location() {
        if (_.isEmpty(this.rows)) {
            return this.header.location;
        }
        const lastRow = _.last(this.rows);
        return {
            start: this.header.location.start,
            end: lastRow.location.end,
        };
    }
    addRow(row) {
        this.rows.push(row);
    }
}
exports.DataTable = DataTable;
/**
 * Represents a row with zero or more cells
 */
class DataRow {
    constructor(location) {
        this.location = location;
        this.cells = [];
    }
    /**
     * Returns the first cell
     */
    first() {
        return _.first(this.cells);
    }
    /**
     * Returns the last cell
     */
    last() {
        return _.last(this.cells);
    }
    /**
     * Returns the (0 based) index of given cell or -1 if not found
     *
     * @param cell  Cell to find
     */
    indexOf(cell) {
        return this.cells.indexOf(cell);
    }
    /**
     * Is the row empty. Row is empty if all its cells are empty
     */
    isEmpty() {
        return _.every(this.cells, cell => cell.isEmpty());
    }
    /**
     * Tests if row begins with empty cells and ...
     *
     * @param requireFirstEmpty - Is at least one empty cell required
     */
    isRowContinuation({ requireFirstEmpty = false } = {}) {
        if (requireFirstEmpty && !this.first().isEmpty()) {
            return false;
        }
        for (const cell of this.cells) {
            if (cell.isRowContinuation()) {
                return true;
            }
            else if (!cell.isEmpty()) {
                return false;
            }
        }
        return false;
    }
    /**
     * Returns the cell with given index
     */
    getCellByIdx(index) {
        return this.cells[index];
    }
    /**
     * Returns a range of cells
     */
    getCellsByRange(startIdx, endIdx) {
        return this.cells.slice(startIdx, endIdx);
    }
    /**
     * Add a cell
     */
    addCell(cell) {
        this.cells.push(cell);
    }
}
exports.DataRow = DataRow;
/**
 * Represents a single cell in a table
 */
class DataCell {
    /**
     *
     */
    constructor(content, location) {
        this.content = content;
        this.location = location;
    }
    /**
     * Is the cell empty. Cell is empty if it's only whitespace or
     * only a single backslash
     */
    isEmpty() {
        return /^(\s*|\\)$/.test(this.content);
    }
    isRowContinuation() {
        return /^\.\.\.$/.test(this.content);
    }
}
exports.DataCell = DataCell;
//# sourceMappingURL=table-models.js.map