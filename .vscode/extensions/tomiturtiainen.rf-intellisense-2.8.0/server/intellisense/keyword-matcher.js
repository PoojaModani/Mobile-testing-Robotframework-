Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const primitive_parsers_1 = require("../parser/primitive-parsers");
const type_guards_1 = require("./type-guards");
// As per RF documentation, the variables are matched with .*? regex
const ARGUMENT_REGEX = ".*?";
function sanitizeKeywordName(name) {
    return name.replace(/ /g, "").replace(/_/g, "");
}
function createKeywordRegex(keywordName) {
    const sanitizedName = sanitizeKeywordName(keywordName);
    const parseResult = primitive_parsers_1.parseVariableString(sanitizedName);
    const regexParts = parseResult.map(result => {
        return result.kind === "var"
            ? ARGUMENT_REGEX
            : _.escapeRegExp(result.value);
    });
    const regexString = `^${regexParts.join("")}\$`;
    // As per RF documentation, keywords are matched case-insensitive
    return new RegExp(regexString, "i");
}
function identifierMatchesKeyword(identifier, keyword) {
    if (type_guards_1.isNamespacedIdentifier(identifier)) {
        // When the identifier is explicit, the namespace must match the keyword case-insensitively.
        if (identifier.namespace &&
            identifier.namespace.toLowerCase() !== keyword.id.namespace.toLowerCase()) {
            return false;
        }
    }
    const keywordName = keyword.id.name;
    const regex = createKeywordRegex(keywordName);
    const sanitizedIdentifierName = sanitizeKeywordName(identifier.name);
    return regex.test(sanitizedIdentifierName);
}
exports.identifierMatchesKeyword = identifierMatchesKeyword;
/**
 * Tests case-insensitively if two identifiers are the same
 *
 * @param identifier1
 * @param identifier2
 */
function identifierMatchesIdentifier(x, y) {
    const regex = new RegExp(`^${_.escapeRegExp(x.name)}\$`, "i");
    return regex.test(y.name);
}
exports.identifierMatchesIdentifier = identifierMatchesIdentifier;
//# sourceMappingURL=keyword-matcher.js.map