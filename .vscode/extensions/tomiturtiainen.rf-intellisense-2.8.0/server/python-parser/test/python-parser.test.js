Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const python_parser_1 = require("../python-parser");
const models_1 = require("../../parser/models");
const position_1 = require("../../utils/position");
const parser = new python_parser_1.PythonParser();
const NAMESPACE = "";
function createLocation(startLine, startColumn, endLine, endColumn) {
    return position_1.createRange(position_1.createPosition(startLine, startColumn), position_1.createPosition(endLine, endColumn));
}
function parseAndAssert(data, expected) {
    const actual = parser.parseFile(data, NAMESPACE);
    chai.assert.deepEqual(actual, expected);
}
function createSuite(location, keywords) {
    return Object.assign(new models_1.TestSuite(location), {
        keywordsTable: Object.assign(new models_1.KeywordsTable(location), {
            keywords,
        }),
    });
}
function createKeyword(keywordName, location, args) {
    const keyword = new models_1.UserKeyword(new models_1.NamespacedIdentifier(NAMESPACE, keywordName, location));
    keyword.location = location;
    if (args) {
        keyword.arguments = new models_1.Arguments(new models_1.Identifier("", location), args.map(([argName, value]) => new models_1.ScalarDeclaration(new models_1.Identifier(argName, location), new models_1.Literal(value, location), location)), location);
    }
    return keyword;
}
describe("PythonParser", () => {
    it("should parse function without args", () => {
        const data = "def name():\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), [
            createKeyword("name", createLocation(0, 0, 0, 11)),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse function with one argument", () => {
        const data = "def name(arg1):\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), [
            createKeyword("name", createLocation(0, 0, 0, 15), [["arg1", undefined]]),
        ]);
        parseAndAssert(data, expected);
    });
    it("should parse argument default value", () => {
        const data = "def name(arg1=200):\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), [
            createKeyword("name", createLocation(0, 0, 0, 19), [["arg1", "200"]]),
        ]);
        parseAndAssert(data, expected);
    });
    it("should skip self argument", () => {
        const data = "def name(self):\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), [
            createKeyword("name", createLocation(0, 0, 0, 15)),
        ]);
        parseAndAssert(data, expected);
    });
    it("should skip commented out function", () => {
        const data = "# def name():\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), []);
        parseAndAssert(data, expected);
    });
    it("should skip private function", () => {
        const data = "def _private():\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), []);
        parseAndAssert(data, expected);
    });
    it("should ignore whitespace before the function", () => {
        const data = "   def name(arg1):\n  print('hello')";
        const expected = createSuite(createLocation(0, 0, 1, 16), [
            createKeyword("name", createLocation(0, 3, 0, 18), [["arg1", undefined]]),
        ]);
        parseAndAssert(data, expected);
    });
});
//# sourceMappingURL=python-parser.test.js.map