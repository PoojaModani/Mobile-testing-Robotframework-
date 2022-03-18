Object.defineProperty(exports, "__esModule", { value: true });
class TableRowIterator {
    constructor(table) {
        this.table = table;
        this.rowIdx = 0;
    }
    isDone() {
        return this.rowIdx >= this.table.rows.length;
    }
    advance() {
        this.rowIdx++;
        return this.isDone();
    }
    /**
     * Takes one row and advances the iterator
     */
    takeRow() {
        return this.table.rows[this.rowIdx++];
    }
    /**
     * Takes one row without advancing the iterator
     */
    peekRow() {
        return this.table.rows[this.rowIdx];
    }
    /**
     * Takes current row and as many rows until predicateFn
     * returns false for some row
     *
     * @param predicateFn
     */
    takeRowWhile(predicateFn) {
        const rows = [];
        let row = this.peekRow();
        while (row && predicateFn(row)) {
            this.rowIdx++;
            rows.push(row);
            row = this.peekRow();
        }
        return rows;
    }
}
exports.TableRowIterator = TableRowIterator;
//# sourceMappingURL=row-iterator.js.map