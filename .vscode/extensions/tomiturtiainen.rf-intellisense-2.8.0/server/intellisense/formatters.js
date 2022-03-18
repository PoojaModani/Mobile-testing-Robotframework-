Object.defineProperty(exports, "__esModule", { value: true });
function formatVariable(variable) {
    const identifier = _variableKindToIdentifier(variable.kind);
    const name = variable.id.name;
    return `${identifier}{${name}}`;
}
exports.formatVariable = formatVariable;
function _variableKindToIdentifier(kind) {
    switch (kind) {
        case "Scalar":
            return "$";
        case "List":
            return "@";
        case "Dictionary":
            return "&";
        default:
            return null;
    }
}
//# sourceMappingURL=formatters.js.map