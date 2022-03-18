Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const parser_1 = require("../parser");
const parser = new parser_1.FileParser();
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
const NAMESPACE = "";
function parseAndAssert(tableDefinition, expected) {
    const actual = parser.parseFile(tableDefinition, NAMESPACE).keywordsTable;
    chai.assert.deepEqual(actual, expected);
}
function keywordsTable(location, keywords) {
    return Object.assign(new models_1.KeywordsTable(location), { keywords });
}
function keyword(location, name, steps, settings = {}) {
    return Object.assign(new models_1.UserKeyword(new models_1.NamespacedIdentifier(NAMESPACE, name.name, name.location), location.start), { location }, { steps }, settings);
}
describe("Parsing Keywords table", () => {
    it("should skip invalid data", () => {
        const data = `*** Keywords ***
    not a keyword   cell2
      !another invalid    data
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 3, 0), []);
        parseAndAssert(data, expected);
    });
    it("should parse steps", () => {
        const data = `*** Keywords ***
Keyword Name
    Step 1    arg1      arg2
    Step 2    \${VAR}    a longer arg2
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 4, 0), [
            keyword(test_helper_1.createLocation(1, 0, 3, 37), new models_1.Identifier("Keyword Name", test_helper_1.createLocation(1, 0, 1, 12)), [
                new models_1.Step(new models_1.CallExpression(new models_1.Identifier("Step 1", test_helper_1.createLocation(2, 4, 2, 10)), [
                    new models_1.Literal("arg1", test_helper_1.createLocation(2, 14, 2, 18)),
                    new models_1.Literal("arg2", test_helper_1.createLocation(2, 24, 2, 28)),
                ], test_helper_1.createLocation(2, 4, 2, 28)), test_helper_1.createLocation(2, 4, 2, 28)),
                new models_1.Step(new models_1.CallExpression(new models_1.Identifier("Step 2", test_helper_1.createLocation(3, 4, 3, 10)), [
                    new models_1.VariableExpression(new models_1.Identifier("VAR", test_helper_1.createLocation(3, 16, 3, 19)), "Scalar", test_helper_1.createLocation(3, 14, 3, 20)),
                    new models_1.Literal("a longer arg2", test_helper_1.createLocation(3, 24, 3, 37)),
                ], test_helper_1.createLocation(3, 4, 3, 37)), test_helper_1.createLocation(3, 4, 3, 37)),
            ]),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse step from multiple lines", () => {
        const data = `*** Keywords ***
Keyword Name
    Step 1    arg1
    ...       arg2
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 4, 0), [
            keyword(test_helper_1.createLocation(1, 0, 3, 18), new models_1.Identifier("Keyword Name", test_helper_1.createLocation(1, 0, 1, 12)), [
                new models_1.Step(new models_1.CallExpression(new models_1.Identifier("Step 1", test_helper_1.createLocation(2, 4, 2, 10)), [
                    new models_1.Literal("arg1", test_helper_1.createLocation(2, 14, 2, 18)),
                    new models_1.Literal("arg2", test_helper_1.createLocation(3, 14, 3, 18)),
                ], test_helper_1.createLocation(2, 4, 3, 18)), test_helper_1.createLocation(2, 4, 3, 18)),
            ]),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse steps with explicit keywords", () => {
        const data = `*** Keywords ***
Keyword Name
    MyLibrary.Step 1    arg1      arg2
    Deep.Library.Step 1    \${VAR}    a longer arg2
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 4, 0), [
            keyword(test_helper_1.createLocation(1, 0, 3, 50), new models_1.Identifier("Keyword Name", test_helper_1.createLocation(1, 0, 1, 12)), [
                new models_1.Step(new models_1.CallExpression(new models_1.NamespacedIdentifier("MyLibrary", "Step 1", test_helper_1.createLocation(2, 4, 2, 20)), [
                    new models_1.Literal("arg1", test_helper_1.createLocation(2, 24, 2, 28)),
                    new models_1.Literal("arg2", test_helper_1.createLocation(2, 34, 2, 38)),
                ], test_helper_1.createLocation(2, 4, 2, 38)), test_helper_1.createLocation(2, 4, 2, 38)),
                new models_1.Step(new models_1.CallExpression(new models_1.NamespacedIdentifier("Deep.Library", "Step 1", test_helper_1.createLocation(3, 4, 3, 23)), [
                    new models_1.VariableExpression(new models_1.Identifier("VAR", test_helper_1.createLocation(3, 29, 3, 32)), "Scalar", test_helper_1.createLocation(3, 27, 3, 33)),
                    new models_1.Literal("a longer arg2", test_helper_1.createLocation(3, 37, 3, 50)),
                ], test_helper_1.createLocation(3, 4, 3, 50)), test_helper_1.createLocation(3, 4, 3, 50)),
            ]),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse documentation", () => {
        const data = `*** Keywords ***
Keyword Name
    [Documentation]   Here stands documentation
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 3, 0), [
            keyword(test_helper_1.createLocation(1, 0, 2, 47), new models_1.Identifier("Keyword Name", test_helper_1.createLocation(1, 0, 1, 12)), [], {
                documentation: new models_1.Documentation(new models_1.Identifier("[Documentation]", test_helper_1.createLocation(2, 4, 2, 19)), new models_1.Literal("Here stands documentation", test_helper_1.createLocation(2, 22, 2, 47)), test_helper_1.createLocation(2, 4, 2, 47)),
            }),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse arguments", () => {
        const data = `*** Keywords ***
Keyword Name
    [Arguments]   \${arg1}    @{arg2}
`;
        const expected = keywordsTable(test_helper_1.createLocation(0, 0, 3, 0), [
            keyword(test_helper_1.createLocation(1, 0, 2, 36), new models_1.Identifier("Keyword Name", test_helper_1.createLocation(1, 0, 1, 12)), [], {
                arguments: new models_1.Arguments(new models_1.Identifier("[Arguments]", test_helper_1.createLocation(2, 4, 2, 15)), [
                    new models_1.ScalarDeclaration(new models_1.Identifier("arg1", test_helper_1.createLocation(2, 18, 2, 25)), undefined, test_helper_1.createLocation(2, 18, 2, 25)),
                    new models_1.ListDeclaration(new models_1.Identifier("arg2", test_helper_1.createLocation(2, 29, 2, 36)), [], test_helper_1.createLocation(2, 29, 2, 36)),
                ], test_helper_1.createLocation(2, 4, 2, 36)),
            }),
        ]);
        parseAndAssert(data, expected);
    });
});
//# sourceMappingURL=keywords-table-parser.test.js.map