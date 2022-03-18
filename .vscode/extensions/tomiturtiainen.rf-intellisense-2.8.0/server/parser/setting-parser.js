Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const models_1 = require("./models");
const primitive_parsers_1 = require("./primitive-parsers");
const variable_parsers_1 = require("./variable-parsers");
const position_helper_1 = require("./position-helper");
const settingMapping = new Map([
    ["[Documentation]", parseDocumentation],
    ["[Arguments]", parseArguments],
    ["[Return]", parseReturn],
    ["[Setup]", parseSetup],
    ["[Teardown]", parseTeardown],
    ["[Tags]", parseTags],
    ["[Timeout]", parseTimeout],
]);
/**
 * Checks if given cell is a supported setting
 *
 * @param cell
 */
function isSetting(cell) {
    return settingMapping.has(cell.content);
}
exports.isSetting = isSetting;
/**
 * Parses setting declaration
 *
 * @param nameCell
 * @param restCells
 */
function parseSetting(nameCell, restCells) {
    const settingParseFn = getParserFn(nameCell.content);
    const id = new models_1.Identifier(nameCell.content, nameCell.location);
    return settingParseFn(id, restCells);
}
exports.parseSetting = parseSetting;
function isDocumentation(node) {
    return isOfType(node, "Documentation");
}
exports.isDocumentation = isDocumentation;
function isArguments(node) {
    return isOfType(node, "Arguments");
}
exports.isArguments = isArguments;
function isReturn(node) {
    return isOfType(node, "Return");
}
exports.isReturn = isReturn;
function isSetup(node) {
    return isOfType(node, "Setup");
}
exports.isSetup = isSetup;
function isTeardown(node) {
    return isOfType(node, "Teardown");
}
exports.isTeardown = isTeardown;
function isTags(node) {
    return isOfType(node, "Tags");
}
exports.isTags = isTags;
function isTimeout(node) {
    return isOfType(node, "Timeout");
}
exports.isTimeout = isTimeout;
function isOfType(node, typeName) {
    return node && node.kind === typeName;
}
/**
 * Returns a parser function for given setting
 *
 * @param name
 */
function getParserFn(name) {
    const settingParseFn = settingMapping.get(name);
    if (!settingParseFn) {
        throw new Error("Invalid setting " + name);
    }
    return settingParseFn;
}
/**
 *
 *
 * @param id
 * @param values
 */
function parseDocumentation(id, values) {
    if (_.isEmpty(values)) {
        return new models_1.Documentation(id, undefined, id.location);
    }
    const stringValue = values.map(cell => cell.content).join(" ");
    const firstCell = _.head(values);
    const lastCell = _.last(values);
    const literal = new models_1.Literal(stringValue, position_helper_1.locationFromStartEnd(firstCell.location, lastCell.location));
    return new models_1.Documentation(id, literal, position_helper_1.locationFromStartEnd(id.location, literal.location));
}
exports.parseDocumentation = parseDocumentation;
/**
 * Parses Arguments
 *
 * @param id
 * @param values
 */
function parseArguments(id, values) {
    const parsedValues = values.filter(variable_parsers_1.isVariable).map(cell => {
        const typeAndName = variable_parsers_1.parseTypeAndName(cell);
        // We might want to parse the default value as value at some point.
        // Now just ignore any values
        return variable_parsers_1.parseVariableDeclaration(typeAndName, [], cell.location);
    });
    const loc = _.isEmpty(parsedValues)
        ? id.location
        : position_helper_1.locationFromStartEnd(id.location, _.last(parsedValues).location);
    return new models_1.Arguments(id, parsedValues, loc);
}
/**
 * Parses Return statement
 * @param id
 * @param values
 */
function parseReturn(id, values) {
    const parsedValues = values.map(primitive_parsers_1.parseValueExpression);
    const loc = _.isEmpty(parsedValues)
        ? id.location
        : position_helper_1.locationFromStartEnd(id.location, _.last(parsedValues).location);
    return new models_1.Return(id, parsedValues, loc);
}
/**
 * Parses Setup
 *
 * @param id
 * @param values
 */
function parseSetup(id, values) {
    if (_.isEmpty(values)) {
        return new models_1.Setup(id, undefined, id.location);
    }
    const callExpression = primitive_parsers_1.parseCallExpression(values);
    const location = position_helper_1.locationFromStartEnd(id.location, callExpression.location);
    return new models_1.Setup(id, callExpression, location);
}
/**
 * Parses Teardown
 *
 * @param id
 * @param values
 */
function parseTeardown(id, values) {
    if (_.isEmpty(values)) {
        return new models_1.Teardown(id, undefined, id.location);
    }
    const callExpression = primitive_parsers_1.parseCallExpression(values);
    const location = position_helper_1.locationFromStartEnd(id.location, callExpression.location);
    return new models_1.Teardown(id, callExpression, location);
}
function parseTags(id, values) {
    const tags = values.map(cell => {
        return new models_1.Literal(cell.content, cell.location);
    });
    const loc = _.isEmpty(tags)
        ? id.location
        : position_helper_1.locationFromStartEnd(id.location, _.last(tags).location);
    return new models_1.Tags(id, tags, loc);
}
function parseTimeout(id, values) {
    const [valueCell, messageCell] = values;
    const value = valueCell
        ? new models_1.Literal(valueCell.content, valueCell.location)
        : undefined;
    const message = messageCell
        ? new models_1.Literal(messageCell.content, messageCell.location)
        : undefined;
    const loc = position_helper_1.locationFromStartEnd(id.location, (message || value || id).location);
    return new models_1.Timeout(id, value, message, loc);
}
//# sourceMappingURL=setting-parser.js.map