Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const models_1 = require("./models");
const variableMapping = new Map([
    ["$", parseScalar],
    ["@", parseList],
    ["&", parseDictionary],
    ["%", parseEnvironment],
]);
function getRegex() {
    // Matches the type ($, @, % or &) and name
    // For example:
    // ${var} --> ["${var}", "$", "var"]
    // @{var2} = --> ["${var2}", "@", "var2"]
    return /^([$,@,%,&]){([^}]*)}/;
}
function isVariable(cell) {
    const typeAndNameRegex = getRegex();
    const possibleTypeAndName = cell.content;
    return typeAndNameRegex.test(possibleTypeAndName);
}
exports.isVariable = isVariable;
function parseTypeAndName(cell) {
    const typeAndNameRegex = getRegex();
    const typeAndName = cell.content;
    const result = typeAndName.match(typeAndNameRegex);
    return {
        type: result[1],
        name: new models_1.Identifier(result[2], cell.location),
    };
}
exports.parseTypeAndName = parseTypeAndName;
function parseVariableDeclaration(typeAndName, values, location) {
    const { type, name } = typeAndName;
    const variableParserFn = getVariableParserFn(type);
    if (!variableParserFn) {
        throw new Error(`Invalid variable type ${type}`);
    }
    return variableParserFn(name, values, location);
}
exports.parseVariableDeclaration = parseVariableDeclaration;
function getVariableParserFn(type) {
    const parser = variableMapping.get(type);
    return parser;
}
function parseScalar(name, values, location) {
    const value = _.first(values);
    return new models_1.ScalarDeclaration(name, value, location);
}
function parseList(name, values, location) {
    return new models_1.ListDeclaration(name, values, location);
}
function parseDictionary(name, values, location) {
    // TODO
    return new models_1.DictionaryDeclaration(name, null, location);
}
function parseEnvironment(name, values, location) {
    // TODO
    return undefined;
}
//# sourceMappingURL=variable-parsers.js.map