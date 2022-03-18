Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const models_1 = require("../parser/models");
/**
 * Parser for python files
 */
class PythonParser {
    /**
     * Parses function as keywords from given python file contents
     *
     * @param data python file contents
     * @param filePath
     */
    parseFile(data, namespace) {
        const lineIndexes = getLineIndexes(data);
        const suiteRange = createRange(_.first(lineIndexes), _.last(lineIndexes));
        const keywords = findKeywords(namespace, data, lineIndexes);
        return Object.assign(new models_1.TestSuite(suiteRange), {
            keywordsTable: Object.assign(new models_1.KeywordsTable(suiteRange), {
                keywords,
            }),
        });
    }
}
exports.PythonParser = PythonParser;
const REQUIRED_WS = "(?:\\s+)";
const OPTIONAL_WS = "(?:\\s*)";
const FUNCTION_NAME = "(\\S+?)";
const ARGS = "(.*?)";
const FUNCTION_DECLARATION_REGEX = "(?:^|\\s)" +
    "def" +
    REQUIRED_WS +
    FUNCTION_NAME +
    OPTIONAL_WS +
    "\\(" +
    ARGS +
    "\\):";
function isCommentedOut(data, startIdx) {
    const earlierLineBreak = data.lastIndexOf("\n", startIdx);
    const earlierComment = data.lastIndexOf("#", startIdx);
    return earlierComment > earlierLineBreak;
}
/**
 * Returns the start and end index of each line
 *
 * @param data
 */
function getLineIndexes(data) {
    const lines = [];
    const regex = /\n|\r\n/g;
    let lineNumber = 0;
    let lastIndex = 0;
    findMatches(() => regex.exec(data), (result) => {
        lines.push({
            line: lineNumber++,
            start: lastIndex,
            end: result.index,
        });
        lastIndex = result.index + result[0].length;
    });
    lines.push({
        line: lineNumber++,
        start: lastIndex,
        end: data.length,
    });
    return lines;
}
/**
 * Calls 'getMatchFn' to get a result and calls 'cb' with
 * the result until 'getMatchFn' returns null
 *
 * @param getMatchFn
 * @param cb
 */
function findMatches(getMatchFn, cb) {
    let result = getMatchFn();
    while (result !== null) {
        cb(result);
        result = getMatchFn();
    }
}
function createPosition(line, column) {
    return {
        line,
        column,
    };
}
function createRange(startLine, endLine) {
    return {
        start: createPosition(startLine.line, startLine.start),
        end: createPosition(endLine.line, endLine.end - endLine.start),
    };
}
function findRange(lineIndexes, startIdx, endIdx) {
    let start;
    const isIndexOnLine = (line, idx) => line.start <= idx && idx <= line.end;
    for (const lineInfo of lineIndexes) {
        if (isIndexOnLine(lineInfo, startIdx)) {
            start = createPosition(lineInfo.line, startIdx - lineInfo.start);
        }
        if (isIndexOnLine(lineInfo, endIdx)) {
            const end = createPosition(lineInfo.line, endIdx - lineInfo.start);
            return {
                start,
                end,
            };
        }
    }
    return null;
}
/**
 * Should function with given name be excluded
 *
 * @param keywordName
 */
function excludeKeyword(keywordName) {
    // Exclude private keywords
    return keywordName.startsWith("_");
}
function startsWithWs(str) {
    return (str.startsWith(" ") ||
        str.startsWith("\t") ||
        str.startsWith("\n") ||
        str.startsWith("\r"));
}
function findKeywords(namespace, data, lineIndexes) {
    const keywords = [];
    const regex = new RegExp(FUNCTION_DECLARATION_REGEX, "mg");
    const matcherFn = () => regex.exec(data);
    findMatches(matcherFn, (result) => {
        const [fullMatch, name, argsStr] = result;
        if (excludeKeyword(name)) {
            return;
        }
        if (isCommentedOut(data, result.index)) {
            return;
        }
        let startIdx = result.index;
        const endIdx = startIdx + fullMatch.length;
        if (startsWithWs(fullMatch)) {
            startIdx++;
        }
        const keywordRange = findRange(lineIndexes, startIdx, endIdx);
        const args = parseArguments(argsStr, keywordRange);
        const keyword = Object.assign(new models_1.UserKeyword(new models_1.NamespacedIdentifier(namespace, name, keywordRange)), { location: keywordRange });
        if (!_.isEmpty(args)) {
            keyword.arguments = args;
        }
        keywords.push(keyword);
    });
    return keywords;
}
/**
 * Parses arguments from given string
 *
 * @param args   Argument names comma separated
 * @param range
 */
function parseArguments(args, range) {
    // Python class instance args are ignore
    const isSelfArg = (arg, idx) => arg === "self" && idx === 0;
    const argumentDeclarations = args
        .split(",")
        .map(arg => arg.trim())
        .filter((arg, idx) => !_.isEmpty(arg) && !isSelfArg(arg, idx))
        .map(argumentName => {
        let value;
        if (argumentName.includes("=")) {
            const nameAndValue = argumentName.split("=");
            argumentName = nameAndValue[0];
            value = nameAndValue[1];
        }
        // Assume all arguments are scalars with lack of better knowledge
        return new models_1.ScalarDeclaration(new models_1.Identifier(argumentName, range), new models_1.Literal(value, range), range);
    });
    if (argumentDeclarations.length === 0) {
        return undefined;
    }
    return new models_1.Arguments(new models_1.Identifier("", range), argumentDeclarations, range);
}
//# sourceMappingURL=python-parser.js.map