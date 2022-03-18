Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const positionHelper = require("./position-helper");
const models_1 = require("./models");
const primitive_parsers_1 = require("./primitive-parsers");
const variable_parsers_1 = require("./variable-parsers");
function parseStep(firstDataCell, restDataCells) {
    let stepContent;
    const lastCell = _.last(restDataCells) || firstDataCell;
    const stepLocation = positionHelper.locationFromStartEnd(firstDataCell.location, lastCell.location);
    if (variable_parsers_1.isVariable(firstDataCell)) {
        const typeAndName = variable_parsers_1.parseTypeAndName(firstDataCell);
        const callExpression = primitive_parsers_1.parseCallExpression(restDataCells);
        stepContent = variable_parsers_1.parseVariableDeclaration(typeAndName, [callExpression], stepLocation);
    }
    else {
        stepContent = primitive_parsers_1.parseCallExpression([firstDataCell, ...restDataCells]);
    }
    return new models_1.Step(stepContent, stepLocation);
}
exports.parseStep = parseStep;
//# sourceMappingURL=function-parsers.js.map