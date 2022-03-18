Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const parser_1 = require("../parser");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
const parser = new parser_1.FileParser();
const NAMESPACE = "";
function shouldRecogniseTable(tableDef, tableProperty) {
    const parsed = parser.parseFile(tableDef, NAMESPACE);
    chai.assert.isObject(parsed[tableProperty]);
}
function settingsTable(content) {
    return Object.assign(new models_1.SettingsTable(null), content);
}
describe("RF Parser", () => {
    describe("Parsing Settings table", () => {
        function settingsTableTest(row) {
            const tableDefinition = `*Settings\n${row}`;
            const parsed = parser.parseFile(tableDefinition, NAMESPACE);
            chai.assert.isObject(parsed);
            chai.assert.isObject(parsed.settingsTable);
            chai.assert.deepEqual(parsed.settingsTable.location, test_helper_1.createLocation(0, 0, 1, row.length));
            parsed.settingsTable.location = null;
            return parsed.settingsTable;
        }
        it("should recognise a settings table", () => {
            shouldRecogniseTable("*Settings", "settingsTable");
        });
        it("should parse resource imports", () => {
            const actualTable = settingsTableTest("Resource   resources/smoke_resources.robot");
            const expected = settingsTable({
                resourceImports: [
                    new models_1.ResourceImport(new models_1.Literal("resources/smoke_resources.robot", test_helper_1.createLocation(1, 11, 1, 42)), test_helper_1.createLocation(1, 0, 1, 42)),
                ],
            });
            chai.assert.deepEqual(actualTable, expected);
        });
        it("should parse suite setup", () => {
            const actualTable = settingsTableTest("Suite Setup  Open Default Browser");
            const expected = settingsTable({
                suiteSetup: new models_1.SuiteSetting(new models_1.Identifier("Suite Setup", test_helper_1.createLocation(1, 0, 1, 11)), new models_1.CallExpression(new models_1.Identifier("Open Default Browser", test_helper_1.createLocation(1, 13, 1, 33)), [], test_helper_1.createLocation(1, 13, 1, 33)), test_helper_1.createLocation(1, 0, 1, 33)),
            });
            chai.assert.deepEqual(actualTable, expected);
        });
        it("should parse suite teardown", () => {
            const actualTable = settingsTableTest("Suite Teardown  Open Default Browser");
            const expected = settingsTable({
                suiteTeardown: new models_1.SuiteSetting(new models_1.Identifier("Suite Teardown", test_helper_1.createLocation(1, 0, 1, 14)), new models_1.CallExpression(new models_1.Identifier("Open Default Browser", test_helper_1.createLocation(1, 16, 1, 36)), [], test_helper_1.createLocation(1, 16, 1, 36)), test_helper_1.createLocation(1, 0, 1, 36)),
            });
            chai.assert.deepEqual(actualTable, expected);
        });
        //     it("should parse test setup", () => {
        //       generateSettingsTableTest(
        //         `Test Setup         Open Default Browser`,
        //         { testSetup: new Setting("Test Setup", "Open Default Browser") }
        //       );
        //     });
        //     it("should parse test teardown", () => {
        //       generateSettingsTableTest(
        //         `Test Teardown         Open Default Browser`,
        //         { testTeardown: new Setting("Test Teardown", "Open Default Browser") }
        //       );
        //     });
    });
    describe("Parsing Variables table", () => {
        it("should recognise variables table", () => {
            shouldRecogniseTable("*Variables", "variablesTable");
        });
        // it("should parse scalar variables", () => {
        //   generateVariablesTableTest("${lol}    123", [new ScalarVariable("lol", "123")]);
        //   generateVariablesTableTest("${lol}=   123", [new ScalarVariable("lol", "123")]);
        //   generateVariablesTableTest("${lol} =  123", [new ScalarVariable("lol", "123")]);
        // });
    });
    describe("Parsing Keywords table", () => {
        it("should recognise keywords table", () => {
            shouldRecogniseTable("*Keywords", "keywordsTable");
        });
        //     it("should parse empty keyword", () => {
        //       const keywordName = "Keyword Name";
        //       generateKeywordsTableTest(keywordName, [new Keyword(keywordName)]);
        //     });
        //     it("should parse keyword with steps", () => {
        //       const keyword = `
        // Keyword Name
        //     Step1   Arg11
        //     Step2   arg21   arg22
        // `;
        //       generateKeywordsTableTest(keyword, [
        //         new Keyword("Keyword Name", [
        //           new Step("Step1", ["Arg11"]),
        //           new Step("Step2", ["arg21", "arg22"])
        //         ])
        //       ]);
        //     });
        //     it("should parse multiple keywords with steps", () => {
        //       const keyword = `
        // Keyword Name1
        //     Step1   Arg11
        //     Step2   arg21   arg22
        // Keyword Name2
        //     Step1   Arg11
        // Keyword Name3
        //     Step1   Arg11
        // `;
        //       generateKeywordsTableTest(keyword, [
        //         new Keyword("Keyword Name1", [
        //           new Step("Step1", ["Arg11"]),
        //           new Step("Step2", ["arg21", "arg22"])
        //         ]),
        //         new Keyword("Keyword Name2", [
        //           new Step("Step1", ["Arg11"]),
        //         ]),
        //         new Keyword("Keyword Name3", [
        //           new Step("Step1", ["Arg11"]),
        //         ]),
        //       ]);
        //     });
    });
    describe("Parsing test cases table", () => {
        it("should recognise test cases table", () => {
            shouldRecogniseTable("*Test Cases", "testCasesTable");
        });
        //     it("should parse empty test case", () => {
        //       const testCaseName = "Empty Test Case";
        //       generateTestCasesTableTest(testCaseName, [new TestCase(testCaseName)]);
        //     });
        //     it("should parse test case with steps", () => {
        //       const testCase = `
        // Test Case
        //   Step  arg1  arg2
        // `;
        //       generateTestCasesTableTest(testCase, [
        //         new TestCase("Test Case", [
        //           new Step("Step", ["arg1", "arg2"])
        //         ])
        //       ]);
        //     });
    });
});
//# sourceMappingURL=parser.test.js.map