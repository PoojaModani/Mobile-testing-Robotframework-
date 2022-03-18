Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const definition_finder_1 = require("../definition-finder");
const workspace_1 = require("../workspace/workspace");
const robot_file_1 = require("../workspace/robot-file");
const definition_finder_data_1 = require("./data/definition-finder.data");
const workspace = new workspace_1.default();
const range = (startLine, startColumn, endLine, endColumn) => ({
    start: { line: startLine, character: startColumn },
    end: { line: endLine, character: endColumn },
});
describe("Definition finder", () => {
    let keywordsFile;
    let testsFile;
    before(() => {
        keywordsFile = robot_file_1.createRobotFile(definition_finder_data_1.keywords.content, definition_finder_data_1.keywords.filePath, definition_finder_data_1.keywords.relativePath);
        testsFile = robot_file_1.createRobotFile(definition_finder_data_1.tests.content, definition_finder_data_1.tests.filePath, definition_finder_data_1.tests.relativePath);
        workspace.addFile(keywordsFile);
        workspace.addFile(testsFile);
    });
    describe("findDefinition", () => {
        describe("keywords", () => {
            const assertIsSimpleKeyword = (definition) => {
                chai_1.assert.equal(definition.uri, `file:///${definition_finder_data_1.keywords.filePath}`);
                chai_1.assert.deepEqual(definition.range, range(5, 0, 6, 33));
                chai_1.assert.equal(definition.node, keywordsFile.ast.keywordsTable.keywords[0]);
            };
            describe("simple keyword", () => {
                const runTest = (column) => {
                    const actual = definition_finder_1.findDefinition({
                        filePath: "tests.robot",
                        position: {
                            line: 7,
                            column,
                        },
                    }, workspace);
                    assertIsSimpleKeyword(actual);
                };
                it("beginning of keyword call", () => {
                    runTest(2);
                });
                it("middle of keyword call", () => {
                    runTest(10);
                });
                it("end of keyword call", () => {
                    runTest(16);
                });
            });
            describe("gherking keywords", () => {
                const runTest = (line, column) => {
                    const actual = definition_finder_1.findDefinition({
                        filePath: "tests.robot",
                        position: {
                            line,
                            column,
                        },
                    }, workspace);
                    assertIsSimpleKeyword(actual);
                };
                it("works for given", () => {
                    runTest(11, 2);
                });
                it("works for when", () => {
                    runTest(12, 2);
                });
                it("works for then", () => {
                    runTest(13, 2);
                });
                it("works for and", () => {
                    runTest(14, 2);
                });
                it("works for but", () => {
                    runTest(15, 2);
                });
            });
            it("non existing keyword", () => {
                const actual = definition_finder_1.findDefinition({
                    filePath: "tests.robot",
                    position: {
                        line: 18,
                        column: 2,
                    },
                }, workspace);
                chai_1.assert.isNull(actual);
            });
            it("non existing gherkin keyword", () => {
                const actual = definition_finder_1.findDefinition({
                    filePath: "tests.robot",
                    position: {
                        line: 19,
                        column: 2,
                    },
                }, workspace);
                chai_1.assert.isNull(actual);
            });
        });
    });
});
//# sourceMappingURL=definition-finder.test.js.map