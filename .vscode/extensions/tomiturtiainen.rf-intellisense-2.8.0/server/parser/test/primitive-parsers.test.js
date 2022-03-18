Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const primitive_parsers_1 = require("../primitive-parsers");
const table_models_1 = require("../table-models");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
describe("parseValueExpression", () => {
    describe("should parse single literals", () => {
        function shouldParseLiteral(cellContent) {
            const loc = test_helper_1.createLocation(0, 0, 0, cellContent.length);
            const cell = new table_models_1.DataCell(cellContent, loc);
            const parsed = primitive_parsers_1.parseValueExpression(cell);
            const expected = new models_1.Literal(cellContent, loc);
            chai.assert.deepEqual(parsed, expected);
        }
        it("should parse simple literals", () => {
            shouldParseLiteral("Just some text");
            shouldParseLiteral("Another part of text");
        });
    });
    describe("should parse single variable expressions", () => {
        it("should parse scalar variable expressions", () => {
            const expected = new models_1.VariableExpression(new models_1.Identifier("VAR", test_helper_1.createLocation(0, 2, 0, 5)), "Scalar", test_helper_1.createLocation(0, 0, 0, 6));
            const actual = primitive_parsers_1.parseValueExpression(new table_models_1.DataCell("${VAR}", test_helper_1.createLocation(0, 0, 0, 6)));
            chai.assert.deepEqual(actual, expected);
        });
        it("should parse list variable expressions", () => {
            const expected = new models_1.VariableExpression(new models_1.Identifier("VAR", test_helper_1.createLocation(0, 2, 0, 5)), "List", test_helper_1.createLocation(0, 0, 0, 6));
            const actual = primitive_parsers_1.parseValueExpression(new table_models_1.DataCell("@{VAR}", test_helper_1.createLocation(0, 0, 0, 6)));
            chai.assert.deepEqual(actual, expected);
        });
    });
    describe("should parse template literal", () => {
        it("should parse template with multiple expressions", () => {
            const input = "Template ${arg1} with @{arg2} multiple args";
            const loc = test_helper_1.createLocation(0, 0, 0, input.length);
            const cell = new table_models_1.DataCell(input, loc);
            const expected = new models_1.TemplateLiteral([
                new models_1.TemplateElement("Template ", test_helper_1.createLocation(0, 0, 0, 9)),
                new models_1.TemplateElement(" with ", test_helper_1.createLocation(0, 16, 0, 22)),
                new models_1.TemplateElement(" multiple args", test_helper_1.createLocation(0, 29, 0, 43)),
            ], [
                new models_1.VariableExpression(new models_1.Identifier("arg1", test_helper_1.createLocation(0, 11, 0, 15)), "Scalar", test_helper_1.createLocation(0, 9, 0, 16)),
                new models_1.VariableExpression(new models_1.Identifier("arg2", test_helper_1.createLocation(0, 24, 0, 28)), "List", test_helper_1.createLocation(0, 22, 0, 29)),
            ], loc);
            const actual = primitive_parsers_1.parseValueExpression(cell);
            chai.assert.deepEqual(actual, expected);
        });
    });
});
describe("parseCallExpression", () => {
    describe("values as parameters", () => {
        it("should parse call expression with only callee", () => {
            const callee = "Keyword To Call";
            const loc = test_helper_1.createLocation(0, 0, 0, callee.length);
            const cell = new table_models_1.DataCell(callee, loc);
            const actual = primitive_parsers_1.parseCallExpression([cell]);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, loc), [], loc));
        });
        it("should parse call expression with identifier param", () => {
            const callee = "Keyword To Call";
            const param = "param";
            const cells = [
                new table_models_1.DataCell(callee, test_helper_1.createLocation(0, 0, 0, 15)),
                new table_models_1.DataCell(param, test_helper_1.createLocation(0, 17, 0, 22)),
            ];
            const actual = primitive_parsers_1.parseCallExpression(cells);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, test_helper_1.createLocation(0, 0, 0, 15)), [new models_1.Literal(param, test_helper_1.createLocation(0, 17, 0, 22))], test_helper_1.createLocation(0, 0, 0, 22)));
        });
    });
    describe("keyword call as the first parameter", () => {
        it("Run Keyword  Keyword To Call", () => {
            const shouldParseCorrectly = (callee) => {
                const param = "Keyword To Call";
                const calleeLoc = test_helper_1.createLocation(0, 0, 0, callee.length);
                const argLoc = test_helper_1.createLocation(0, callee.length + 2, 0, callee.length + 17);
                const cells = [
                    new table_models_1.DataCell(callee, calleeLoc),
                    new table_models_1.DataCell(param, argLoc),
                ];
                const actual = primitive_parsers_1.parseCallExpression(cells);
                chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, calleeLoc), [new models_1.CallExpression(new models_1.Identifier(param, argLoc), [], argLoc)], test_helper_1.createLocation(0, 0, 0, argLoc.end.column)));
            };
            shouldParseCorrectly("Run Keyword");
            shouldParseCorrectly("run keyword");
            shouldParseCorrectly("RUN KEYWORD");
        });
    });
    describe("keyword call as the second parameter", () => {
        it("Run Keyword If  dummy  Keyword To Call", () => {
            const callee = "Run Keyword If";
            const arg1 = "dummy";
            const arg2 = "Keyword To Call";
            const calleeLoc = test_helper_1.createLocation(0, 0, 0, callee.length);
            const arg1Loc = test_helper_1.createLocation(0, callee.length + 2, 0, callee.length + 2 + arg1.length);
            const arg2Loc = test_helper_1.createLocation(0, callee.length + 2 + arg1.length + 2, 0, callee.length + 2 + arg1.length + 2 + arg2.length);
            const cells = [
                new table_models_1.DataCell(callee, calleeLoc),
                new table_models_1.DataCell(arg1, arg1Loc),
                new table_models_1.DataCell(arg2, arg2Loc),
            ];
            const actual = primitive_parsers_1.parseCallExpression(cells);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, calleeLoc), [
                new models_1.Literal(arg1, arg1Loc),
                new models_1.CallExpression(new models_1.Identifier(arg2, arg2Loc), [], arg2Loc),
            ], test_helper_1.createLocation(0, 0, 0, arg2Loc.end.column)));
        });
    });
    describe("keyword call as the third parameter", () => {
        it("Wait until keyword succeeds  dummy1  dummy2  Keyword To Call", () => {
            const callee = "Wait until keyword succeeds";
            const arg1 = "dummy1";
            const arg2 = "dummy2";
            const arg3 = "Keyword To Call";
            const calleeLoc = test_helper_1.createLocation(0, 0, 0, callee.length);
            const arg1Loc = test_helper_1.createLocation(0, callee.length + 2, 0, callee.length + 2 + arg1.length);
            const arg2Loc = test_helper_1.createLocation(0, callee.length + 2 + arg1.length + 2, 0, callee.length + 2 + arg1.length + 2 + arg2.length);
            const arg3Loc = test_helper_1.createLocation(0, callee.length + 2 + arg1.length + 2 + arg2.length + 2, 0, callee.length + 2 + arg1.length + 2 + arg2.length + 2 + arg3.length);
            const cells = [
                new table_models_1.DataCell(callee, calleeLoc),
                new table_models_1.DataCell(arg1, arg1Loc),
                new table_models_1.DataCell(arg2, arg2Loc),
                new table_models_1.DataCell(arg3, arg3Loc),
            ];
            const actual = primitive_parsers_1.parseCallExpression(cells);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, calleeLoc), [
                new models_1.Literal(arg1, arg1Loc),
                new models_1.Literal(arg2, arg2Loc),
                new models_1.CallExpression(new models_1.Identifier(arg3, arg3Loc), [], arg3Loc),
            ], test_helper_1.createLocation(0, 0, 0, arg3Loc.end.column)));
        });
    });
    describe("multiple keywords as parameters", () => {
        it("Run Keywords  Keyword To Call  Another To Call", () => {
            const callee = "Run Keywords";
            const arg1 = "Keyword To Call";
            const arg2 = "Another To Call";
            const calleeLoc = test_helper_1.createLocation(0, 0, 0, callee.length);
            const arg1Loc = test_helper_1.createLocation(0, callee.length + 2, 0, callee.length + 2 + arg1.length);
            const arg2Loc = test_helper_1.createLocation(0, callee.length + 2 + arg1.length + 2, 0, callee.length + 2 + arg1.length + 2 + arg2.length);
            const cells = [
                new table_models_1.DataCell(callee, calleeLoc),
                new table_models_1.DataCell(arg1, arg1Loc),
                new table_models_1.DataCell(arg2, arg2Loc),
            ];
            const actual = primitive_parsers_1.parseCallExpression(cells);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier(callee, calleeLoc), [
                new models_1.CallExpression(new models_1.Identifier(arg1, arg1Loc), [], arg1Loc),
                new models_1.CallExpression(new models_1.Identifier(arg2, arg2Loc), [], arg2Loc),
            ], test_helper_1.createLocation(0, 0, 0, arg2Loc.end.column)));
        });
        it("Run Keywords  Keyword1  param1  AND  Keyword2  param2", () => {
            const calleeLoc = test_helper_1.createLocation(0, 0, 0, 12);
            const kw1Loc = test_helper_1.createLocation(0, 14, 0, 22);
            const param1Loc = test_helper_1.createLocation(0, 24, 0, 29);
            const andLoc = test_helper_1.createLocation(0, 31, 0, 34);
            const kw2Loc = test_helper_1.createLocation(0, 36, 0, 44);
            const param2Loc = test_helper_1.createLocation(0, 46, 0, 51);
            const cells = [
                new table_models_1.DataCell("Run Keywords", calleeLoc),
                new table_models_1.DataCell("Keyword1", kw1Loc),
                new table_models_1.DataCell("param1", param1Loc),
                new table_models_1.DataCell("AND", andLoc),
                new table_models_1.DataCell("Keyword2", kw2Loc),
                new table_models_1.DataCell("param2", param2Loc),
            ];
            const actual = primitive_parsers_1.parseCallExpression(cells);
            chai.assert.deepEqual(actual, new models_1.CallExpression(new models_1.Identifier("Run Keywords", calleeLoc), [
                new models_1.CallExpression(new models_1.Identifier("Keyword1", kw1Loc), [new models_1.Literal("param1", param1Loc)], test_helper_1.createLocation(kw1Loc.start.line, kw1Loc.start.column, param1Loc.end.line, param1Loc.end.column)),
                new models_1.Literal("AND", andLoc),
                new models_1.CallExpression(new models_1.Identifier("Keyword2", kw2Loc), [new models_1.Literal("param2", param2Loc)], test_helper_1.createLocation(kw2Loc.start.line, kw2Loc.start.column, param2Loc.end.line, param2Loc.end.column)),
            ], test_helper_1.createLocation(0, 0, 0, param2Loc.end.column)));
        });
    });
});
//# sourceMappingURL=primitive-parsers.test.js.map