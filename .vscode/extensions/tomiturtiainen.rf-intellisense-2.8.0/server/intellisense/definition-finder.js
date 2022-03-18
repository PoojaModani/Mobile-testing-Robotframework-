Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const models_1 = require("../parser/models");
const logger_1 = require("../logger");
const traverse_1 = require("../traverse/traverse");
const keyword_matcher_1 = require("./keyword-matcher");
const node_locator_1 = require("./node-locator");
const position_1 = require("../utils/position");
const type_guards_1 = require("./type-guards");
const logger = logger_1.ConsoleLogger;
const gherkingIdentifiers = new Set(["given", "when", "then", "and", "but"]);
function findDefinition(location, workspaceTree) {
    const file = workspaceTree.getFile(location.filePath);
    if (!file) {
        logger.info(`Definition not found. File '${location.filePath}' not parsed`);
        return null;
    }
    const nodeInPos = node_locator_1.findNodeInPos(location.position, file);
    if (!type_guards_1.isIdentifier(nodeInPos.node)) {
        const logMsg = "Definition not found. " +
            `Node in position is not an identifier, but of type ${nodeInPos.node.type}`;
        logger.info(logMsg);
        return null;
    }
    const parentOfNode = _.last(nodeInPos.path);
    let foundDefinition = null;
    if (type_guards_1.isVariableExpression(parentOfNode)) {
        logger.info("Parent is a variable expression, finding a variable definition");
        foundDefinition = findVariableDefinition(parentOfNode, nodeInPos, workspaceTree);
    }
    else if (type_guards_1.isCallExpression(parentOfNode)) {
        logger.info("Parent is a call expression, finding a keyword definition");
        foundDefinition = findKeywordDefinition(parentOfNode.callee, nodeInPos.file, workspaceTree);
    }
    else {
        logger.info(`Parent is of type ${parentOfNode.type}. No definition available`);
    }
    return foundDefinition;
}
exports.findDefinition = findDefinition;
function findVariableDefinition(variable, variableLocation, workspaceTree) {
    let foundVariableDefinition = tryFindVarDefStartingFromNode(variable, variableLocation);
    if (foundVariableDefinition) {
        return {
            node: foundVariableDefinition,
            uri: variableLocation.file.uri,
            range: position_1.nodeLocationToRange(foundVariableDefinition),
        };
    }
    // TODO: iterate in import order
    for (const file of workspaceTree.getFiles()) {
        foundVariableDefinition = findVariableDefinitionFromFile(variable, file.ast);
        if (foundVariableDefinition) {
            return {
                node: foundVariableDefinition,
                uri: file.uri,
                range: position_1.nodeLocationToRange(foundVariableDefinition),
            };
        }
    }
    logger.info("Variable definition not found from the workspace");
    return null;
}
exports.findVariableDefinition = findVariableDefinition;
function findKeywordDefinition(keywordName, keywordCallLocation, workspaceTree) {
    const foundDefinition = tryFindKeywordDefinition(keywordName, keywordCallLocation, workspaceTree);
    if (foundDefinition) {
        return {
            node: foundDefinition.keyword,
            uri: foundDefinition.file.uri,
            range: position_1.nodeLocationToRange(foundDefinition.keyword),
        };
    }
    const gherkinKeyword = tryGetKeywordNameFromBddDefinition(keywordName);
    if (gherkinKeyword) {
        const definition = tryFindKeywordDefinition(gherkinKeyword, keywordCallLocation, workspaceTree);
        if (definition) {
            return {
                node: definition.keyword,
                uri: definition.file.uri,
                range: position_1.nodeLocationToRange(definition.keyword),
            };
        }
    }
    return null;
}
exports.findKeywordDefinition = findKeywordDefinition;
function tryFindVarDefStartingFromNode(variable, location) {
    let foundVariableDefinition = null;
    _.reverse(location.path).find(node => {
        if (!type_guards_1.isFunctionDeclaration(node)) {
            return false;
        }
        // Try to find from steps
        const foundInSteps = node.steps.find(nodeInStep => {
            const { body } = nodeInStep;
            if (type_guards_1.isVariableDeclaration(body) &&
                body.kind === variable.kind &&
                body.id.name === variable.id.name) {
                foundVariableDefinition = body;
                return true;
            }
            else {
                return false;
            }
        }) !== undefined;
        if (foundInSteps) {
            return true;
        }
        if (!type_guards_1.isUserKeyword(node) || !node.arguments) {
            return false;
        }
        // Try to find from keyword arguments
        return (node.arguments.values.find(arg => {
            if (arg.kind === variable.kind && arg.id.name === variable.id.name) {
                foundVariableDefinition = arg;
                return true;
            }
            else {
                return false;
            }
        }) !== undefined);
    });
    if (foundVariableDefinition) {
        return foundVariableDefinition;
    }
    if (location.file.ast.variablesTable) {
        location.file.ast.variablesTable.variables.find(varTableVar => {
            if (varTableVar.kind === variable.kind &&
                varTableVar.id.name === variable.id.name) {
                foundVariableDefinition = varTableVar;
                return true;
            }
            else {
                return false;
            }
        });
    }
    return foundVariableDefinition;
}
function findVariableDefinitionFromFile(variable, file) {
    const nodesToEnter = new Set(["TestSuite", "VariablesTable"]);
    let foundVariable = null;
    const isNodeSearchedVar = (node) => type_guards_1.isVariableDeclaration(node) &&
        node.kind === variable.kind &&
        node.id.name === variable.id.name;
    traverse_1.traverse(file, {
        enter: (node, parent) => {
            if (isNodeSearchedVar(node)) {
                foundVariable = node;
                return traverse_1.VisitorOption.Break;
            }
            else if (!nodesToEnter.has(node.type)) {
                return traverse_1.VisitorOption.Skip;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return foundVariable;
}
function tryFindKeywordDefinition(keywordName, keywordCallLocation, workspaceTree) {
    const localDefinition = tryFindKeywordDefinitionFromFile(keywordName, keywordCallLocation.ast);
    if (localDefinition) {
        return {
            keyword: localDefinition,
            file: keywordCallLocation,
        };
    }
    const namespacedDefinition = tryFindNamespacedKeywordDefinition(keywordName, workspaceTree);
    if (namespacedDefinition) {
        return namespacedDefinition;
    }
    return tryFindKeywordDefinitionFromWorkspace(keywordName, keywordCallLocation, workspaceTree);
}
function tryFindKeywordDefinitionFromFile(keywordName, file) {
    const nodesToEnter = new Set(["TestSuite", "KeywordsTable"]);
    let foundKeyword = null;
    const isNodeSearchedKeyword = (node) => type_guards_1.isUserKeyword(node) && keyword_matcher_1.identifierMatchesKeyword(keywordName, node);
    traverse_1.traverse(file, {
        enter: (node, parent) => {
            if (isNodeSearchedKeyword(node)) {
                foundKeyword = node;
                return traverse_1.VisitorOption.Break;
            }
            else if (!nodesToEnter.has(node.type)) {
                return traverse_1.VisitorOption.Skip;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return foundKeyword;
}
function tryFindNamespacedKeywordDefinition(keywordName, workspaceTree) {
    if (type_guards_1.isNamespacedIdentifier(keywordName)) {
        const file = workspaceTree.getFileByNamespace(keywordName.namespace);
        if (!!file) {
            logger.info(`Found matching file by namespace ${keywordName.namespace}`);
            const foundDefinition = tryFindKeywordDefinitionFromFile(keywordName, file.ast);
            if (foundDefinition) {
                return {
                    keyword: foundDefinition,
                    file,
                };
            }
            else {
                logger.info(`No keyword '${keywordName.fullName}' found from file`);
            }
        }
        else {
            logger.info(`No matching file found for namespace ${keywordName.namespace}`);
        }
    }
    return null;
}
function tryFindKeywordDefinitionFromWorkspace(keywordName, keywordCallLocation, workspaceTree) {
    // TODO: iterate in import order
    for (const file of workspaceTree.getFiles()) {
        if (file.filePath === keywordCallLocation.filePath) {
            continue;
        }
        const foundDefinition = tryFindKeywordDefinitionFromFile(keywordName, file.ast);
        if (foundDefinition) {
            return {
                keyword: foundDefinition,
                file,
            };
        }
    }
    logger.info(`Keyword definition '${keywordName.name}' not found from the workspace`);
    return null;
}
function tryGetKeywordNameFromBddDefinition(keywordName) {
    const matches = /([^ ]+)(?: )(.*)/.exec(keywordName.name);
    if (!matches) {
        return null;
    }
    const [, firstWord, rest] = matches;
    if (gherkingIdentifiers.has(firstWord.toLowerCase())) {
        // Let's just use the same location even tho it's not 100% accurate
        return new models_1.Identifier(rest, keywordName.location);
    }
    return null;
}
//# sourceMappingURL=definition-finder.js.map