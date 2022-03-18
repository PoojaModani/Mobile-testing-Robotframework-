Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const function_parsers_1 = require("../function-parsers");
const table_models_1 = require("../table-models");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
function parseAndAssert(data, expected) {
    const [first, ...rest] = data;
    const actual = function_parsers_1.parseStep(first, rest);
    chai.assert.deepEqual(actual, expected);
}
describe("parseStep", () => {
    it("should parse empty variable declaration", () => {
        const loc = test_helper_1.createLocation(0, 0, 0, 7);
        const data = [new table_models_1.DataCell("${var}=", loc)];
        const expected = new models_1.Step(new models_1.ScalarDeclaration(new models_1.Identifier("var", loc), null, loc), loc);
        parseAndAssert(data, expected);
    });
});
//# sourceMappingURL=function-parsers.test.js.map