Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const table_reader_1 = require("../table-reader");
const table_models_1 = require("../table-models");
const test_helper_1 = require("./test-helper");
const reader = new table_reader_1.TableReader();
function header(text) {
    return test_helper_1.row(test_helper_1.createLocation(0, 0, 0, text.length), [
        new table_models_1.DataCell(text, test_helper_1.createLocation(0, 0, 0, text.length)),
    ]);
}
describe("TableReader", () => {
    it("should recognise table name", () => {
        const name = "Table Name";
        const shouldReadName = (tableString) => {
            const [actual] = reader.read(tableString);
            chai.assert.equal(actual.name, name);
        };
        shouldReadName(`***${name}***`);
        shouldReadName(`*** ${name} ***`);
        shouldReadName(`***${name}`);
        shouldReadName(`*** ${name}`);
        shouldReadName(`*${name}`);
        shouldReadName(`* ${name}`);
    });
    it("should read empty table", () => {
        const data = `*** Table`;
        const actual = reader.read(data);
        const expected = [
            test_helper_1.table("Table", {
                header: header(`*** Table`),
            }),
        ];
        chai.assert.deepEqual(actual, expected);
    });
    it("should parse empty first cell", () => {
        const data = `*Table\n    cell1`;
        const actual = reader.read(data);
        const expected = [
            test_helper_1.table("Table", {
                header: header("*Table"),
                rows: [
                    test_helper_1.row(test_helper_1.createLocation(1, 0, 1, 9), [
                        new table_models_1.DataCell("", test_helper_1.createLocation(1, 0, 1, 0)),
                        new table_models_1.DataCell("cell1", test_helper_1.createLocation(1, 4, 1, 9)),
                    ]),
                ],
            }),
        ];
        chai.assert.deepEqual(actual, expected);
    });
    it("should read single table", () => {
        const data = `*** Table\ncell1    cell2`;
        const actual = reader.read(data);
        const expected = [
            test_helper_1.table("Table", {
                header: header("*** Table"),
                rows: [
                    test_helper_1.row(test_helper_1.createLocation(1, 0, 1, 14), [
                        new table_models_1.DataCell("cell1", test_helper_1.createLocation(1, 0, 1, 5)),
                        new table_models_1.DataCell("cell2", test_helper_1.createLocation(1, 9, 1, 14)),
                    ]),
                ],
            }),
        ];
        chai.assert.deepEqual(actual, expected);
    });
    it("should ignore trailing whitespace", () => {
        const data = `*** Table\ncell1    `;
        const actual = reader.read(data);
        const expected = [
            test_helper_1.table("Table", {
                header: header("*** Table"),
                rows: [
                    test_helper_1.row(test_helper_1.createLocation(1, 0, 1, 9), [
                        new table_models_1.DataCell("cell1", test_helper_1.createLocation(1, 0, 1, 5)),
                    ]),
                ],
            }),
        ];
        chai.assert.deepEqual(actual, expected);
    });
    it("should skip comments", () => {
        const data = `*** Table # Inline comment\n#Comment line\ncell1    cell2`;
        const actual = reader.read(data);
        const expected = [
            test_helper_1.table("Table", {
                header: header("*** Table "),
                rows: [
                    test_helper_1.row(test_helper_1.createLocation(1, 0, 1, 0), [
                        new table_models_1.DataCell("", test_helper_1.createLocation(1, 0, 1, 0)),
                    ]),
                    test_helper_1.row(test_helper_1.createLocation(2, 0, 2, 14), [
                        new table_models_1.DataCell("cell1", test_helper_1.createLocation(2, 0, 2, 5)),
                        new table_models_1.DataCell("cell2", test_helper_1.createLocation(2, 9, 2, 14)),
                    ]),
                ],
            }),
        ];
        chai.assert.deepEqual(actual, expected);
    });
    it("should ignore lines outside table", () => {
        const data = `Not in a table\nAnother outside table`;
        const actual = reader.read(data);
        const expected = [];
        chai.assert.deepEqual(actual, expected);
    });
});
//# sourceMappingURL=table-reader.test.js.map