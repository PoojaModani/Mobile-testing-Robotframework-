Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const table_models_1 = require("./table-models");
/**
 * Parses a string of text into data tables
 */
class TableReader {
    constructor() {
        this.lineReader = new LineReader();
    }
    /**
     *
     */
    read(data) {
        const readTables = [];
        const lines = data.split(/\r\n|\n|\r/);
        let currentTable = null;
        lines.forEach((line, index) => {
            const row = this.lineReader.readLine(index, line);
            if (this.startsTable(row)) {
                const name = this.readTableName(row);
                currentTable = new table_models_1.DataTable(name, row);
                readTables.push(currentTable);
            }
            else if (currentTable) {
                currentTable.addRow(row);
            }
        });
        return readTables;
    }
    startsTable(row) {
        return row
            .first()
            .content.trim()
            .startsWith("*");
    }
    readTableName(row) {
        return row
            .first()
            .content.replace(/\*/g, "")
            .trim();
    }
}
exports.TableReader = TableReader;
/**
 * Parses a line into a row with cells
 */
class LineReader {
    constructor() {
        this.position = 0;
    }
    readLine(lineNumber, line) {
        this.lineNumber = lineNumber;
        this.line = this.trimComments(line);
        this.position = 0;
        const row = new table_models_1.DataRow({
            start: {
                line: lineNumber,
                column: 0,
            },
            end: {
                line: lineNumber,
                column: this.line.length,
            },
        });
        do {
            const cell = this.readCell();
            row.addCell(cell);
            this.readWhitespace();
        } while (!this.isEnd());
        return row;
    }
    trimComments(line) {
        const startOfCommentIdx = this.findStartOfCommentIdx(line);
        if (startOfCommentIdx > -1) {
            return line.substring(0, startOfCommentIdx);
        }
        else {
            return line;
        }
    }
    findStartOfCommentIdx(line) {
        let possibleStartIdx = line.indexOf("#", 0);
        while (possibleStartIdx > -1) {
            // Escaped number sign doesn't start a comment
            if (line.charAt(possibleStartIdx - 1) !== "\\") {
                return possibleStartIdx;
            }
            possibleStartIdx = line.indexOf("#", possibleStartIdx + 1);
        }
        return -1;
    }
    endOfCellIdx() {
        const cellSeparators = ["  ", " \t", "\t"];
        const separatorIndexes = cellSeparators
            .map(sep => this.line.indexOf(sep, this.position))
            .filter(index => index !== -1);
        const smallestIdx = _.min(separatorIndexes);
        return smallestIdx !== undefined ? smallestIdx : this.line.length;
    }
    /**
     * Reads a cell starting from current position and
     * advances the position.
     */
    readCell() {
        const endOfCellIdx = this.endOfCellIdx();
        const cellContent = this.line.substring(this.position, endOfCellIdx);
        const cell = new table_models_1.DataCell(cellContent, {
            start: {
                line: this.lineNumber,
                column: this.position,
            },
            end: {
                line: this.lineNumber,
                column: endOfCellIdx,
            },
        });
        this.position = endOfCellIdx;
        return cell;
    }
    readWhitespace() {
        while (!this.isEnd() && /\s/.test(this.line.charAt(this.position))) {
            this.position = this.position + 1;
        }
    }
    isEnd() {
        return this.position >= this.line.length;
    }
}
//# sourceMappingURL=table-reader.js.map