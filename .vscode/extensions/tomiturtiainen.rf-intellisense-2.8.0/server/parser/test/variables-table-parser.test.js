Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const variables_table_parser_1 = require("../variables-table-parser");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
function parseAndAssert(tableDefinition, expected) {
    const actual = variables_table_parser_1.parseVariablesTable(tableDefinition);
    chai.assert.deepEqual(actual, expected);
}
function variablesTable(location, variables) {
    return Object.assign(new models_1.VariablesTable(location), { variables });
}
describe("Parsing Variables table", () => {
    it("should skip invalid data", () => {
        const tableDefinition = test_helper_1.table("Variables", {
            header: test_helper_1.row(test_helper_1.createLocation(0, 0, 0, 10)),
            rows: [
                test_helper_1.row(test_helper_1.createLocation(1, 0, 1, 10), [
                    test_helper_1.createCell(test_helper_1.createLocation(1, 0, 1, 10), "not a variable"),
                    test_helper_1.createCell(test_helper_1.createLocation(1, 0, 1, 10), "cell2"),
                ]),
                test_helper_1.row(test_helper_1.createLocation(2, 0, 2, 10), [
                    test_helper_1.createCell(test_helper_1.createLocation(2, 0, 2, 10), "!another invalid"),
                    test_helper_1.createCell(test_helper_1.createLocation(2, 0, 2, 10), "data"),
                ]),
            ],
        });
        const expected = variablesTable(test_helper_1.createLocation(0, 0, 2, 10), []);
        parseAndAssert(tableDefinition, expected);
    });
    // it("should parse scalar variables", () => {
    //   const tableDefinition = table("Variables", {
    //     header: row(location(0, 0, 0, 10)),
    //     rows: [
    //       row(location(1, 0, 1, 10), [
    //         cell(location(1, 0, 1, 10), "${var1}"),
    //         cell(location(1, 0, 1, 10), "value")
    //       ]),
    //       row(location(2, 0, 2, 10), [
    //         cell(location(2, 0, 2, 10), "${var2}"),
    //         cell(location(2, 0, 2, 10), "More complex ${variable}")
    //       ]),
    //     ]
    //   });
    //   const expected = variablesTable(location(0, 0, 2, 10), [
    //     new ScalarDeclaration("var1", "value", location(1, 0, 1, 10)),
    //     new ScalarDeclaration("var2", "More complex ${variable}", location(2, 0, 2, 10))
    //   ]);
    //   parseAndAssert(tableDefinition, expected);
    // });
    it("should parse list variables", () => {
        // TODO
    });
    it("should parse dictionary variables", () => {
        // TODO
    });
    it("should parse environment variables", () => {
        // TODO
    });
});
//# sourceMappingURL=variables-table-parser.test.js.map