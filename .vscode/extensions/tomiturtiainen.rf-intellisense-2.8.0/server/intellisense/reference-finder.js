Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const traverse_1 = require("../traverse/traverse");
const definition_finder_1 = require("./definition-finder");
const node_locator_1 = require("./node-locator");
const position_1 = require("../utils/position");
const keyword_matcher_1 = require("./keyword-matcher");
const type_guards_1 = require("./type-guards");
/**
 * Finds all references for the symbol in given document position
 *
 * @param location
 * @param workspace
 */
function findReferences(location, workspace) {
    const file = workspace.getFile(location.filePath);
    if (!file) {
        return [];
    }
    const nodeInPos = node_locator_1.findNodeInPos(location.position, file);
    if (!type_guards_1.isIdentifier(nodeInPos.node)) {
        return [];
    }
    const parentOfNode = _.last(nodeInPos.path);
    if (type_guards_1.isUserKeyword(parentOfNode)) {
        const searchedKeyword = parentOfNode;
        const isSearchedKeyword = createNodeKeywordMatcherFn(searchedKeyword);
        return findWorkspaceKeywordReferences(isSearchedKeyword, workspace).concat([
            {
                uri: nodeInPos.file.uri,
                range: position_1.nodeLocationToRange(searchedKeyword),
            },
        ]);
    }
    else if (type_guards_1.isCallExpression(parentOfNode)) {
        const keywordDefinition = definition_finder_1.findKeywordDefinition(parentOfNode.callee, nodeInPos.file, workspace);
        if (keywordDefinition) {
            const isSearchedKeyword = createNodeKeywordMatcherFn(keywordDefinition.node);
            return findWorkspaceKeywordReferences(isSearchedKeyword, workspace).concat([
                {
                    uri: keywordDefinition.uri,
                    range: keywordDefinition.range,
                },
            ]);
        }
        else {
            const isSearchedKeyword = (node) => (type_guards_1.isCallExpression(node) &&
                keyword_matcher_1.identifierMatchesIdentifier(node.callee, parentOfNode.callee)) ||
                (type_guards_1.isUserKeyword(node) &&
                    keyword_matcher_1.identifierMatchesIdentifier(node.id, parentOfNode.callee));
            return findWorkspaceKeywordReferences(isSearchedKeyword, workspace);
        }
    }
    return [];
}
exports.findReferences = findReferences;
/**
 * Returns a function that takes a node and checks if that
 * node is a call expression calling the given user keyword
 *
 * @param keywordToMatch
 */
function createNodeKeywordMatcherFn(keywordToMatch) {
    return (node) => type_guards_1.isCallExpression(node) &&
        keyword_matcher_1.identifierMatchesKeyword(node.callee, keywordToMatch);
}
function findWorkspaceKeywordReferences(isSearchedKeywordFn, workspace) {
    let references = [];
    for (const file of workspace.getFiles()) {
        const fileReferences = findFileKeywordReferences(isSearchedKeywordFn, file);
        references = references.concat(fileReferences);
    }
    return references;
}
function findFileKeywordReferences(isSearchedKeywordFn, file) {
    // Optimize traversal by limiting which nodes to enter
    const nodesToEnter = new Set([
        "TestSuite",
        "TestCasesTable",
        "TestCase",
        "Step",
        "Teardown",
        "Setup",
        "KeywordsTable",
        "UserKeyword",
        "ScalarDeclaration",
        "ListDeclaration",
        "DictionaryDeclaration",
        "SettingsTable",
        "SuiteSetting",
    ]);
    const references = [];
    traverse_1.traverse(file.ast, {
        enter: (node, parent) => {
            if (isSearchedKeywordFn(node)) {
                references.push({
                    uri: file.uri,
                    range: position_1.nodeLocationToRange(node),
                });
                return traverse_1.VisitorOption.Skip;
            }
            else if (!nodesToEnter.has(node.type)) {
                return traverse_1.VisitorOption.Skip;
            }
            return traverse_1.VisitorOption.Continue;
        },
    });
    return references;
}
//# sourceMappingURL=reference-finder.js.map