Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const parser_1 = require("../parser");
const parser = new parser_1.FileParser();
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
const NAMESPACE = "";
function parseAndAssert(tableDefinition, expected) {
    const actual = parser.parseFile(tableDefinition, NAMESPACE).settingsTable;
    chai.assert.deepEqual(actual, expected);
}
function settingsTable(location, content) {
    return Object.assign(new models_1.SettingsTable(location), content);
}
describe("Parsing Settings table", () => {
    it("should parse empty resource import", () => {
        const data = `* Settings
Resource
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 2, 0), {
            resourceImports: [new models_1.ResourceImport(null, test_helper_1.createLocation(1, 0, 1, 8))],
        });
        parseAndAssert(data, expected);
    });
    it("should parse resource imports", () => {
        const data = `* Settings
Resource    resources/\${ENVIRONMENT}.robot
Resource    resources/smoke_resources.robot
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 3, 0), {
            resourceImports: [
                new models_1.ResourceImport(new models_1.TemplateLiteral([
                    new models_1.TemplateElement("resources/", test_helper_1.createLocation(1, 12, 1, 22)),
                    new models_1.TemplateElement(".robot", test_helper_1.createLocation(1, 36, 1, 42)),
                ], [
                    new models_1.VariableExpression(new models_1.Identifier("ENVIRONMENT", test_helper_1.createLocation(1, 24, 1, 35)), "Scalar", test_helper_1.createLocation(1, 22, 1, 36)),
                ], test_helper_1.createLocation(1, 12, 1, 42)), test_helper_1.createLocation(1, 0, 1, 42)),
                new models_1.ResourceImport(new models_1.Literal("resources/smoke_resources.robot", test_helper_1.createLocation(2, 12, 2, 43)), test_helper_1.createLocation(2, 0, 2, 43)),
            ],
        });
        parseAndAssert(data, expected);
    });
    it("should parse empty library import", () => {
        const data = `* Settings
Library
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 2, 0), {
            libraryImports: [new models_1.LibraryImport(null, [], test_helper_1.createLocation(1, 0, 1, 7))],
        });
        parseAndAssert(data, expected);
    });
    it("should parse library imports", () => {
        const data = `* Settings
Library    libs/\${ENVIRONMENT}.robot
Library    lib  arg1  arg2
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 3, 0), {
            libraryImports: [
                new models_1.LibraryImport(new models_1.TemplateLiteral([
                    new models_1.TemplateElement("libs/", test_helper_1.createLocation(1, 11, 1, 16)),
                    new models_1.TemplateElement(".robot", test_helper_1.createLocation(1, 30, 1, 36)),
                ], [
                    new models_1.VariableExpression(new models_1.Identifier("ENVIRONMENT", test_helper_1.createLocation(1, 18, 1, 29)), "Scalar", test_helper_1.createLocation(1, 16, 1, 30)),
                ], test_helper_1.createLocation(1, 11, 1, 36)), [], test_helper_1.createLocation(1, 0, 1, 36)),
                new models_1.LibraryImport(new models_1.Literal("lib", test_helper_1.createLocation(2, 11, 2, 14)), [
                    new models_1.Literal("arg1", test_helper_1.createLocation(2, 16, 2, 20)),
                    new models_1.Literal("arg2", test_helper_1.createLocation(2, 22, 2, 26)),
                ], test_helper_1.createLocation(2, 0, 2, 26)),
            ],
        });
        parseAndAssert(data, expected);
    });
    //   it("should parse variable imports", () => {
    //     const tableDefinition = table("Settings", {
    //       header: row(location(0, 0, 0, 10)),
    //       rows: [
    //         row(location(1, 0, 1, 10), [
    //           cell(location(1, 0, 1, 10), "Variables"),
    //           cell(location(1, 0, 1, 10), "vars/\${ENVIRONMENT}.robot"),
    //         ]),
    //         row(location(2, 0, 2, 10), [
    //           cell(location(2, 0, 2, 10), "Variables"),
    //           cell(location(2, 0, 2, 10), "vars/vars.robot"),
    //         ]),
    //       ]
    //     });
    //     const expected = settingsTable(location(0, 0, 2, 10), {
    //       variableImports: [
    //         new VariableImport("vars/\${ENVIRONMENT}.robot", location(1, 0, 1, 10)),
    //         new VariableImport("vars/vars.robot", location(2, 0, 2, 10)),
    //       ]
    //     });
    //     parseAndAssert(tableDefinition, expected);
    //   });
    it("should parse suite setup and teardown", () => {
        const data = `* Settings
Suite Setup       suiteSetup       arg1    arg2
Suite Teardown    suiteTeardown    arg1    arg2
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 3, 0), {
            suiteSetup: new models_1.SuiteSetting(new models_1.Identifier("Suite Setup", test_helper_1.createLocation(1, 0, 1, 11)), new models_1.CallExpression(new models_1.Identifier("suiteSetup", test_helper_1.createLocation(1, 18, 1, 28)), [
                new models_1.Literal("arg1", test_helper_1.createLocation(1, 35, 1, 39)),
                new models_1.Literal("arg2", test_helper_1.createLocation(1, 43, 1, 47)),
            ], test_helper_1.createLocation(1, 18, 1, 47)), test_helper_1.createLocation(1, 0, 1, 47)),
            suiteTeardown: new models_1.SuiteSetting(new models_1.Identifier("Suite Teardown", test_helper_1.createLocation(2, 0, 2, 14)), new models_1.CallExpression(new models_1.Identifier("suiteTeardown", test_helper_1.createLocation(2, 18, 2, 31)), [
                new models_1.Literal("arg1", test_helper_1.createLocation(2, 35, 2, 39)),
                new models_1.Literal("arg2", test_helper_1.createLocation(2, 43, 2, 47)),
            ], test_helper_1.createLocation(2, 18, 2, 47)), test_helper_1.createLocation(2, 0, 2, 47)),
        });
        parseAndAssert(data, expected);
    });
    it("should parse test setup and teardown", () => {
        const data = `* Settings
Test Setup        testSetup        arg1    arg2
Test Teardown     testTeardown     arg1    arg2
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 3, 0), {
            testSetup: new models_1.SuiteSetting(new models_1.Identifier("Test Setup", test_helper_1.createLocation(1, 0, 1, 10)), new models_1.CallExpression(new models_1.Identifier("testSetup", test_helper_1.createLocation(1, 18, 1, 27)), [
                new models_1.Literal("arg1", test_helper_1.createLocation(1, 35, 1, 39)),
                new models_1.Literal("arg2", test_helper_1.createLocation(1, 43, 1, 47)),
            ], test_helper_1.createLocation(1, 18, 1, 47)), test_helper_1.createLocation(1, 0, 1, 47)),
            testTeardown: new models_1.SuiteSetting(new models_1.Identifier("Test Teardown", test_helper_1.createLocation(2, 0, 2, 13)), new models_1.CallExpression(new models_1.Identifier("testTeardown", test_helper_1.createLocation(2, 18, 2, 30)), [
                new models_1.Literal("arg1", test_helper_1.createLocation(2, 35, 2, 39)),
                new models_1.Literal("arg2", test_helper_1.createLocation(2, 43, 2, 47)),
            ], test_helper_1.createLocation(2, 18, 2, 47)), test_helper_1.createLocation(2, 0, 2, 47)),
        });
        parseAndAssert(data, expected);
    });
    it("should parse test setup split on multiple lines", () => {
        const data = `* Settings
Test Setup        testSetup
...               arg1
...               arg2
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 4, 0), {
            testSetup: new models_1.SuiteSetting(new models_1.Identifier("Test Setup", test_helper_1.createLocation(1, 0, 1, 10)), new models_1.CallExpression(new models_1.Identifier("testSetup", test_helper_1.createLocation(1, 18, 1, 27)), [
                new models_1.Literal("arg1", test_helper_1.createLocation(2, 18, 2, 22)),
                new models_1.Literal("arg2", test_helper_1.createLocation(3, 18, 3, 22)),
            ], test_helper_1.createLocation(1, 18, 3, 22)), test_helper_1.createLocation(1, 0, 3, 22)),
        });
        parseAndAssert(data, expected);
    });
    it("should parse documentation", () => {
        const data = `* Settings
Documentation  Documentation string
`;
        const expected = settingsTable(test_helper_1.createLocation(0, 0, 2, 0), {
            documentation: new models_1.Documentation(new models_1.Identifier("Documentation", test_helper_1.createLocation(1, 0, 1, 13)), new models_1.Literal("Documentation string", test_helper_1.createLocation(1, 15, 1, 35)), test_helper_1.createLocation(1, 0, 1, 35)),
        });
        parseAndAssert(data, expected);
    });
});
//# sourceMappingURL=settings-table-parser.test.js.map