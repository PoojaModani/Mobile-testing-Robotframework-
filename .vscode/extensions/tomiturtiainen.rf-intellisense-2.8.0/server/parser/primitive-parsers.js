Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const position_helper_1 = require("./position-helper");
const models_1 = require("./models");
const VARIABLE_KINDS = new Map([
    ["$", "Scalar"],
    ["@", "List"],
    ["&", "Dictionary"],
    ["%", "Environment"],
]);
const KWS_WITH_KW_AS_FIRST_ARG = new Set([
    "run keyword",
    "run keyword and continue on failure",
    "run keyword and ignore error",
    "run keyword and return",
    "run keyword and return status",
    "run keyword if all critical tests passed",
    "run keyword if all tests passed",
    "run keyword if any critical tests failed",
    "run keyword if any tests failed",
    "run keyword if test failed",
    "run keyword if test passed",
    "run keyword if timeout occurred",
]);
const KWS_WITH_KW_AS_SECOND_ARG = new Set([
    "run keyword and expect error",
    "run keyword and return if",
    "run keyword if",
    "run keyword unless",
]);
const KWS_WITH_KW_AS_THIRD_ARG = new Set(["wait until keyword succeeds"]);
const RUN_MULTIPLE_KWS_KW = "run keywords";
function getTemplateElement(parseResult, cell) {
    const { value, start, end } = parseResult;
    const loc = position_helper_1.location(cell.location.start.line, cell.location.start.column + start, cell.location.start.line, cell.location.start.column + end);
    return new models_1.TemplateElement(value, loc);
}
function getVariableExpression(parseResult, cell) {
    const { type, name, start, end } = parseResult;
    return new models_1.VariableExpression(new models_1.Identifier(name, position_helper_1.location(cell.location.start.line, cell.location.start.column + start + 2, cell.location.start.line, cell.location.start.column + end - 1)), VARIABLE_KINDS.get(type), position_helper_1.location(cell.location.start.line, cell.location.start.column + start, cell.location.start.line, cell.location.start.column + end));
}
function getTemplateLiteral(parseResult, cell) {
    const [quasisParts, expressionParts] = _.partition(parseResult, r => r.kind === "string");
    const quasis = quasisParts.map(part => getTemplateElement(part, cell));
    const expressions = expressionParts.map(part => getVariableExpression(part, cell));
    return new models_1.TemplateLiteral(quasis, expressions, cell.location);
}
function parseVariableString(stringToParse) {
    const typeAndNameRegex = /([$,@,%,&]){([^}]+)}/g;
    const parts = [];
    let index = 0;
    let match = typeAndNameRegex.exec(stringToParse);
    while (match) {
        if (index < match.index) {
            parts.push({
                name: null,
                type: null,
                start: index,
                end: match.index,
                kind: "string",
                value: stringToParse.substring(index, match.index),
            });
        }
        const [matchedStr, type, name] = match;
        parts.push({
            name,
            type,
            value: matchedStr,
            start: match.index,
            end: typeAndNameRegex.lastIndex,
            kind: "var",
        });
        index = typeAndNameRegex.lastIndex;
        match = typeAndNameRegex.exec(stringToParse);
    }
    if (index < stringToParse.length) {
        parts.push({
            name: null,
            type: null,
            start: index,
            end: stringToParse.length,
            kind: "string",
            value: stringToParse.substring(index, stringToParse.length),
        });
    }
    return parts;
}
exports.parseVariableString = parseVariableString;
function getNamespaceAndName(value) {
    // Matches explicitly namespaced keyword calls
    // For example:
    // BuiltIn.Run Keyword              --> ["BuiltIn",             "Run Keyword"]
    // com.company.Library.Some Keyword --> ["com.company.Library", "Some Keyword"]
    // See http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#handling-keywords-with-same-names
    const indexOfLastDot = value.lastIndexOf(".");
    return [value.slice(0, indexOfLastDot), value.slice(indexOfLastDot + 1)];
}
function parseIdentifier(cell) {
    return new models_1.Identifier(cell.content, cell.location);
}
exports.parseIdentifier = parseIdentifier;
function parseNamespacedIdentifier(cell) {
    const [namespace, keyword] = getNamespaceAndName(cell.content);
    return new models_1.NamespacedIdentifier(namespace, keyword, cell.location);
}
exports.parseNamespacedIdentifier = parseNamespacedIdentifier;
function parseNamespacedOrNormalIdentifier(cell) {
    if (cell.content.includes(".")) {
        return parseNamespacedIdentifier(cell);
    }
    else {
        return parseIdentifier(cell);
    }
}
exports.parseNamespacedOrNormalIdentifier = parseNamespacedOrNormalIdentifier;
function parseValueExpression(cell) {
    if (!cell) {
        return null;
    }
    const parseResult = parseVariableString(cell.content);
    if (_.isEmpty(parseResult)) {
        return new models_1.Literal("", cell.location);
    }
    else if (parseResult.length === 1) {
        // Literal or VariableExpression
        const result = _.head(parseResult);
        if (result.kind === "var") {
            return getVariableExpression(result, cell);
        }
        else {
            return new models_1.Literal(result.value, cell.location);
        }
    }
    else {
        // Template literal
        return getTemplateLiteral(parseResult, cell);
    }
}
exports.parseValueExpression = parseValueExpression;
/**
 * Parses a call expression, such as:
 *
 * Keyword To Call  param1  param2
 */
function parseCallExpression(cells) {
    if (cells.length === 0) {
        return null;
    }
    const [firstCell, ...argCells] = cells;
    const lastCell = cells[cells.length - 1];
    const callee = parseNamespacedOrNormalIdentifier(firstCell);
    const args = _parseCallExpressionArgs(callee.name, argCells);
    return new models_1.CallExpression(callee, args, {
        start: firstCell.location.start,
        end: lastCell.location.end,
    });
}
exports.parseCallExpression = parseCallExpression;
function _parseCallExpressionArgs(calleeName, argCells) {
    if (argCells.length === 0) {
        return [];
    }
    const calleeNameInLower = calleeName.toLowerCase();
    if (KWS_WITH_KW_AS_FIRST_ARG.has(calleeNameInLower)) {
        return [parseCallExpression(argCells)];
    }
    if (KWS_WITH_KW_AS_SECOND_ARG.has(calleeNameInLower)) {
        const [firstArg, ...restArgs] = argCells;
        const parsedFirstArgs = parseValueExpression(firstArg);
        return restArgs.length === 0
            ? [parsedFirstArgs]
            : [parsedFirstArgs, parseCallExpression(restArgs)];
    }
    if (KWS_WITH_KW_AS_THIRD_ARG.has(calleeNameInLower)) {
        const [firstArg, secondArg, ...restArgs] = argCells;
        const parsedFirstArgs = parseValueExpression(firstArg);
        const parsedSecondArgs = parseValueExpression(secondArg);
        return restArgs.length === 0
            ? [parsedFirstArgs, parsedSecondArgs]
            : [parsedFirstArgs, parsedSecondArgs, parseCallExpression(restArgs)];
    }
    if (calleeNameInLower === RUN_MULTIPLE_KWS_KW) {
        return _parseMultiKeywordCall(argCells);
    }
    return argCells.map(parseValueExpression);
}
function _parseMultiKeywordCall(argCells) {
    if (argCells.every(cell => !_isKeywordSeparator(cell))) {
        // Not a single AND => All args are keywords (=call expressions)
        return argCells.map(argCell => parseCallExpression([argCell]));
    }
    // There's at least one AND => Parse keywords separated by them
    const args = [];
    let gatheredCells = [];
    for (const cell of argCells) {
        if (_isKeywordSeparator(cell)) {
            if (gatheredCells.length > 0) {
                args.push(parseCallExpression(gatheredCells));
            }
            args.push(new models_1.Literal(cell.content, cell.location));
            gatheredCells = [];
        }
        else {
            gatheredCells.push(cell);
        }
    }
    if (gatheredCells.length > 0) {
        args.push(parseCallExpression(gatheredCells));
    }
    return args;
}
function _isKeywordSeparator(cell) {
    return cell.content.toUpperCase() === "AND";
}
//# sourceMappingURL=primitive-parsers.js.map