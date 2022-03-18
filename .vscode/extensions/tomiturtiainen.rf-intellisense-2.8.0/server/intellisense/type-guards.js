Object.defineProperty(exports, "__esModule", { value: true });
function isOfType(node, typeName) {
    return node && node.type === typeName;
}
function isIdentifier(node) {
    return isNamespacedIdentifier(node) || isOfType(node, "Identifier");
}
exports.isIdentifier = isIdentifier;
function isNamespacedIdentifier(node) {
    return isOfType(node, "NamespacedIdentifier");
}
exports.isNamespacedIdentifier = isNamespacedIdentifier;
function isVariableExpression(node) {
    return isOfType(node, "VariableExpression");
}
exports.isVariableExpression = isVariableExpression;
function isCallExpression(node) {
    return isOfType(node, "CallExpression");
}
exports.isCallExpression = isCallExpression;
function isScalarDeclaration(node) {
    return isOfType(node, "ScalarDeclaration");
}
exports.isScalarDeclaration = isScalarDeclaration;
function isListDeclaration(node) {
    return isOfType(node, "ListDeclaration");
}
exports.isListDeclaration = isListDeclaration;
function isDictionaryDeclaration(node) {
    return isOfType(node, "DictionaryDeclaration");
}
exports.isDictionaryDeclaration = isDictionaryDeclaration;
function isVariableDeclaration(node) {
    return (isScalarDeclaration(node) ||
        isListDeclaration(node) ||
        isDictionaryDeclaration(node));
}
exports.isVariableDeclaration = isVariableDeclaration;
function isStep(node) {
    return isOfType(node, "Step");
}
exports.isStep = isStep;
function isUserKeyword(node) {
    return isOfType(node, "UserKeyword");
}
exports.isUserKeyword = isUserKeyword;
function isTestCase(node) {
    return isOfType(node, "TestCase");
}
exports.isTestCase = isTestCase;
function isFunctionDeclaration(node) {
    return isUserKeyword(node) || isTestCase(node);
}
exports.isFunctionDeclaration = isFunctionDeclaration;
function isVariablesTable(node) {
    return isOfType(node, "VariablesTable");
}
exports.isVariablesTable = isVariablesTable;
function isLiteral(node) {
    return isOfType(node, "Literal");
}
exports.isLiteral = isLiteral;
function isTemplateLiteral(node) {
    return isOfType(node, "TemplateLiteral");
}
exports.isTemplateLiteral = isTemplateLiteral;
function isSettingsTable(node) {
    return isOfType(node, "SettingsTable");
}
exports.isSettingsTable = isSettingsTable;
function isDocumentation(node) {
    return isOfType(node, "Documentation");
}
exports.isDocumentation = isDocumentation;
function isSuiteSetting(node) {
    return isOfType(node, "SuiteSetting");
}
exports.isSuiteSetting = isSuiteSetting;
function isTags(node) {
    return isOfType(node, "Tags");
}
exports.isTags = isTags;
function isArguments(node) {
    return isOfType(node, "Arguments");
}
exports.isArguments = isArguments;
function isTimeout(node) {
    return isOfType(node, "Timeout");
}
exports.isTimeout = isTimeout;
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
function isTemplate(node) {
    return isOfType(node, "Template");
}
exports.isTemplate = isTemplate;
function isSettingDeclaration(node) {
    return (isDocumentation(node) ||
        isArguments(node) ||
        isReturn(node) ||
        isTimeout(node) ||
        isTags(node) ||
        isTeardown(node) ||
        isSetup(node) ||
        isTemplate(node));
}
exports.isSettingDeclaration = isSettingDeclaration;
//# sourceMappingURL=type-guards.js.map