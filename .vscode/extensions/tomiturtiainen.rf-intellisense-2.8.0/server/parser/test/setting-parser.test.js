Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const setting_parser_1 = require("../setting-parser");
const table_models_1 = require("../table-models");
const models_1 = require("../models");
const test_helper_1 = require("./test-helper");
const position_helper_1 = require("../position-helper");
describe("Setting parser", () => {
    const dummyLoc = test_helper_1.createLocation(0, 0, 0, 0);
    const FIRST_CELL_LOC = test_helper_1.createLocation(0, 5, 0, 10);
    const shouldReturnTrue = (cellValue) => {
        const cell = new table_models_1.DataCell(cellValue, dummyLoc);
        const actual = setting_parser_1.isSetting(cell);
        chai.assert.isTrue(actual);
    };
    describe("[Documentation]", () => {
        it("should recognize", () => {
            shouldReturnTrue("[Documentation]");
        });
        it("should parse regular", () => {
            const docValue = "This is documentation";
            const docLoc = test_helper_1.createLocation(0, 20, 0, 30);
            const nameCell = new table_models_1.DataCell("[Documentation]", FIRST_CELL_LOC);
            const dataCell = new table_models_1.DataCell(docValue, docLoc);
            const expected = new models_1.Documentation(new models_1.Identifier("[Documentation]", FIRST_CELL_LOC), new models_1.Literal(docValue, docLoc), test_helper_1.createLocation(FIRST_CELL_LOC.start.line, FIRST_CELL_LOC.start.column, dataCell.location.end.line, dataCell.location.end.column));
            const actual = setting_parser_1.parseSetting(nameCell, [dataCell]);
            chai.assert.deepEqual(actual, expected);
        });
        it("should parse empty", () => {
            const nameCell = new table_models_1.DataCell("[Documentation]", FIRST_CELL_LOC);
            const expected = new models_1.Documentation(new models_1.Identifier("[Documentation]", FIRST_CELL_LOC), undefined, FIRST_CELL_LOC);
            const actual = setting_parser_1.parseSetting(nameCell, []);
            chai.assert.deepEqual(actual, expected);
        });
    });
    describe("[Arguments]", () => {
        it("should recognize", () => {
            shouldReturnTrue("[Arguments]");
        });
        it("should parse regular", () => {
            const arg1Val = "${arg1}";
            const arg1Loc = test_helper_1.createLocation(0, 20, 0, 27);
            const arg2Val = "@{arg2}";
            const arg2Loc = test_helper_1.createLocation(0, 30, 0, 37);
            const nameCell = new table_models_1.DataCell("[Arguments]", FIRST_CELL_LOC);
            const arg1Cell = new table_models_1.DataCell(arg1Val, arg1Loc);
            const arg2Cell = new table_models_1.DataCell(arg2Val, arg2Loc);
            const expected = new models_1.Arguments(new models_1.Identifier("[Arguments]", FIRST_CELL_LOC), [
                new models_1.ScalarDeclaration(new models_1.Identifier("arg1", test_helper_1.createLocation(0, 20, 0, 27)), undefined, arg1Loc),
                new models_1.ListDeclaration(new models_1.Identifier("arg2", test_helper_1.createLocation(0, 30, 0, 37)), [], arg2Loc),
            ], test_helper_1.createLocation(FIRST_CELL_LOC.start.line, FIRST_CELL_LOC.start.column, arg2Cell.location.end.line, arg2Cell.location.end.column));
            const actual = setting_parser_1.parseSetting(nameCell, [arg1Cell, arg2Cell]);
            chai.assert.deepEqual(actual, expected);
        });
        it("should parse arguments with default values", () => {
            const arg1Val = "${arg1} = default value";
            const arg1Loc = test_helper_1.createLocation(0, 20, 0, 27);
            const arg2Val = "@{arg2}=${DEFAULT VALUE}";
            const arg2Loc = test_helper_1.createLocation(0, 30, 0, 37);
            const nameCell = new table_models_1.DataCell("[Arguments]", FIRST_CELL_LOC);
            const arg1Cell = new table_models_1.DataCell(arg1Val, arg1Loc);
            const arg2Cell = new table_models_1.DataCell(arg2Val, arg2Loc);
            const expected = new models_1.Arguments(new models_1.Identifier("[Arguments]", FIRST_CELL_LOC), [
                new models_1.ScalarDeclaration(new models_1.Identifier("arg1", test_helper_1.createLocation(0, 20, 0, 27)), undefined, arg1Loc),
                new models_1.ListDeclaration(new models_1.Identifier("arg2", test_helper_1.createLocation(0, 30, 0, 37)), [], arg2Loc),
            ], test_helper_1.createLocation(FIRST_CELL_LOC.start.line, FIRST_CELL_LOC.start.column, arg2Cell.location.end.line, arg2Cell.location.end.column));
            const actual = setting_parser_1.parseSetting(nameCell, [arg1Cell, arg2Cell]);
            chai.assert.deepEqual(actual, expected);
        });
        it("should parse empty", () => {
            const nameCell = new table_models_1.DataCell("[Arguments]", FIRST_CELL_LOC);
            const expected = new models_1.Arguments(new models_1.Identifier("[Arguments]", FIRST_CELL_LOC), [], FIRST_CELL_LOC);
            const actual = setting_parser_1.parseSetting(nameCell, []);
            chai.assert.deepEqual(actual, expected);
        });
        it("should ignore invalid values", () => {
            const arg1Val = "not an argument";
            const arg1Loc = test_helper_1.createLocation(0, 20, 0, 27);
            const arg2Val = "another not argument";
            const arg2Loc = test_helper_1.createLocation(0, 30, 0, 37);
            const nameCell = new table_models_1.DataCell("[Arguments]", FIRST_CELL_LOC);
            const arg1Cell = new table_models_1.DataCell(arg1Val, arg1Loc);
            const arg2Cell = new table_models_1.DataCell(arg2Val, arg2Loc);
            const expected = new models_1.Arguments(new models_1.Identifier("[Arguments]", FIRST_CELL_LOC), [], FIRST_CELL_LOC);
            const actual = setting_parser_1.parseSetting(nameCell, [arg1Cell, arg2Cell]);
            chai.assert.deepEqual(actual, expected);
        });
    });
    describe("[Return]", () => {
        it("should recognise", () => {
            shouldReturnTrue("[Return]");
        });
        it("should parse single variable", () => {
            const varValue = "${VARIABLE}";
            const varLoc = test_helper_1.createLocation(0, 20, 0, 31);
            const nameCell = new table_models_1.DataCell("[Return]", FIRST_CELL_LOC);
            const dataCell = new table_models_1.DataCell(varValue, varLoc);
            const expected = new models_1.Return(new models_1.Identifier("[Return]", FIRST_CELL_LOC), [
                new models_1.VariableExpression(new models_1.Identifier("VARIABLE", test_helper_1.createLocation(0, 22, 0, 30)), "Scalar", varLoc),
            ], test_helper_1.createLocation(FIRST_CELL_LOC.start.line, FIRST_CELL_LOC.start.column, varLoc.end.line, varLoc.end.column));
            const actual = setting_parser_1.parseSetting(nameCell, [dataCell]);
            chai.assert.deepEqual(actual, expected);
        });
    });
    describe("[Teardown]", () => {
        it("should recognise", () => {
            shouldReturnTrue("[Teardown]");
        });
        it("should parse keyword without params", () => {
            const varValue = "Keyword To Call";
            const varLoc = test_helper_1.createLocation(0, 20, 0, 30);
            const nameCell = new table_models_1.DataCell("[Teardown]", FIRST_CELL_LOC);
            const dataCell = new table_models_1.DataCell(varValue, varLoc);
            const expected = new models_1.Teardown(new models_1.Identifier("[Teardown]", FIRST_CELL_LOC), new models_1.CallExpression(new models_1.Identifier(varValue, varLoc), [], varLoc), test_helper_1.createLocation(FIRST_CELL_LOC.start.line, FIRST_CELL_LOC.start.column, dataCell.location.end.line, dataCell.location.end.column));
            const actual = setting_parser_1.parseSetting(nameCell, [dataCell]);
            chai.assert.deepEqual(actual, expected);
        });
        it("should parse keyword without params", () => {
            const varValue = "Keyword To Call";
            const varLoc = test_helper_1.createLocation(0, 20, 0, 30);
            const argValue = "Argument1";
            const argLoc = test_helper_1.createLocation(0, 35, 0, 40);
            const nameCell = new table_models_1.DataCell("[Teardown]", FIRST_CELL_LOC);
            const dataCell = new table_models_1.DataCell(varValue, varLoc);
            const argCell = new table_models_1.DataCell(argValue, argLoc);
            const expected = new models_1.Teardown(new models_1.Identifier("[Teardown]", FIRST_CELL_LOC), new models_1.CallExpression(new models_1.Identifier(varValue, varLoc), [new models_1.Literal(argValue, argLoc)], position_helper_1.locationFromStartEnd(dataCell.location, argCell.location)), position_helper_1.locationFromStartEnd(FIRST_CELL_LOC, argCell.location));
            const actual = setting_parser_1.parseSetting(nameCell, [dataCell, argCell]);
            chai.assert.deepEqual(actual, expected);
        });
    });
    describe("[Tags]", () => {
        // TODO
    });
    describe("[Timeout]", () => {
        // TODO
    });
});
//# sourceMappingURL=setting-parser.test.js.map