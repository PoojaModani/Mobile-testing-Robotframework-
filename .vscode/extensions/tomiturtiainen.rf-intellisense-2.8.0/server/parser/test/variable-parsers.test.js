Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const variable_parsers_1 = require("../variable-parsers");
const table_models_1 = require("../table-models");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
const DUMMY_LOC = test_helper_1.createLocation(0, 0, 0, 0);
function assertIsVariable(cellData) {
    const cell = new table_models_1.DataCell(cellData, DUMMY_LOC);
    const actual = variable_parsers_1.isVariable(cell);
    chai.assert.isTrue(actual);
}
function assertParseResult(cellData, expectedType, expectedName) {
    const cell = new table_models_1.DataCell(cellData, DUMMY_LOC);
    const expected = {
        type: expectedType,
        name: new models_1.Identifier(expectedName, DUMMY_LOC),
    };
    const actual = variable_parsers_1.parseTypeAndName(cell);
    chai.assert.deepEqual(actual, expected);
}
describe("Variable parsing", () => {
    describe("isVariable", () => {
        it("should recognize an empty scalar", () => {
            assertIsVariable("${}");
        });
        it("should recognize an empty list", () => {
            assertIsVariable("${}");
        });
        it("should recognize scalar", () => {
            assertIsVariable("${var}");
        });
        it("should recognize scalar", () => {
            assertIsVariable("${var}");
        });
    });
    describe("parseTypeAndName", () => {
        it("should parse empty scalar", () => {
            assertParseResult("${}", "$", "");
        });
    });
});
//# sourceMappingURL=variable-parsers.test.js.map