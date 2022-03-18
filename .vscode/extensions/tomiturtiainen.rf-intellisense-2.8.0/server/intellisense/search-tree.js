Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const Trie = require("node-ternary-search-trie");
class SymbolContainer {
    constructor() {
        this.tree = new Trie();
    }
    add(item) {
        const normalizedKey = this._getNormalizedKey(item);
        this.tree.set(normalizedKey, item);
    }
    get(key) {
        return this.tree.get(key);
    }
    getAll() {
        const all = [];
        this.forEach((key, item) => all.push(item));
        return all;
    }
    remove(item) {
        const normalizedKey = this._getNormalizedKey(item);
        this.tree.del(normalizedKey);
    }
    forEach(cb) {
        this.tree.traverse((key, item) => {
            cb(key, item);
        });
    }
    filter(cb) {
        const filtered = [];
        this.forEach((key, item) => {
            if (cb(item)) {
                filtered.push(item);
            }
        });
        return filtered;
    }
    findByPrefix(prefix) {
        const found = [];
        const normalizedPrefix = this._normalizeKey(prefix);
        if (prefix.length === 0) {
            return this.getAll();
        }
        this.tree.searchWithPrefix(normalizedPrefix, (key, keyword) => {
            found.push(keyword);
        });
        return found;
    }
    copyFrom(other) {
        other.forEach((key, item) => this.tree.set(key, item));
    }
    size() {
        return this.tree.size();
    }
    _getNormalizedKey(item) {
        const key = this.getKey(item);
        return this._normalizeKey(key);
    }
    _normalizeKey(key) {
        return key.toLowerCase();
    }
}
/**
 * Container for keywords
 */
class KeywordContainer extends SymbolContainer {
    getKey(item) {
        return item.id.name;
    }
}
exports.KeywordContainer = KeywordContainer;
/**
 * Container for global keywords. Indexed without the namespace.
 * Keywords from different namespaces with the same name are grouped in an array.
 */
class GlobalKeywordContainer extends SymbolContainer {
    addKeyword(item) {
        const key = this._getKeywordNormalizedKey(item);
        const existingKeywords = this.get(key) || [];
        this.tree.set(key, [...existingKeywords, item]);
    }
    removeKeyword(item) {
        const key = this._getKeywordNormalizedKey(item);
        const existingKeywords = this.get(key);
        if (!existingKeywords) {
            return;
        }
        const keywordsWithoutRemoved = existingKeywords.filter(keyword => keyword.id.fullName !== item.id.fullName);
        if (keywordsWithoutRemoved.length > 0) {
            this.tree.set(key, keywordsWithoutRemoved);
        }
        else {
            this.tree.del(key);
        }
    }
    getKey(item) {
        return item[0].id.name;
    }
    _getKeywordNormalizedKey(item) {
        return this._normalizeKey(item.id.name);
    }
}
exports.GlobalKeywordContainer = GlobalKeywordContainer;
/**
 * Container for variables
 */
class VariableContainer extends SymbolContainer {
    findVariable(kind, name) {
        const matches = this.findByPrefix(name);
        if (matches.length === 0) {
            return null;
        }
        const possibleMatch = matches[0];
        return possibleMatch.kind === kind ? possibleMatch : null;
    }
    getKey(item) {
        return this._getVariableName(item);
    }
    _getVariableName(node) {
        const typeIdentifier = this._variableKindToIdentifier(node.kind);
        if (!typeIdentifier) {
            return node.id.name;
        }
        else {
            return `${typeIdentifier}{${node.id.name}}`;
        }
    }
    // TODO: Move to formatters
    _variableKindToIdentifier(kind) {
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
}
VariableContainer.Empty = new VariableContainer();
exports.VariableContainer = VariableContainer;
/**
 * Creates search trees for keywords and variables
 *
 * @param ast
 */
function createFileSearchTrees(ast) {
    const keywords = new KeywordContainer();
    const variables = new VariableContainer();
    if (!ast) {
        return {
            documentation: "",
            keywords,
            variables,
        };
    }
    if (ast.keywordsTable) {
        ast.keywordsTable.keywords.forEach(keyword => {
            keywords.add(keyword);
        });
    }
    if (ast.variablesTable) {
        ast.variablesTable.variables.forEach(variable => {
            variables.add(variable);
        });
    }
    const documentation = ast.settingsTable &&
        ast.settingsTable.documentation &&
        ast.settingsTable.documentation.value &&
        ast.settingsTable.documentation.value.value;
    return {
        documentation,
        keywords,
        variables,
    };
}
exports.createFileSearchTrees = createFileSearchTrees;
/**
 * Removes keywords and variables in given fileTree from given search trees
 *
 * @param searchTrees
 * @param ast
 */
function removeFileSymbols(symbols, ast) {
    // TODO: Could use another search trees instead of fileTree
    const { keywords, variables } = symbols;
    if (ast && ast.keywordsTable) {
        ast.keywordsTable.keywords.forEach(keyword => {
            keywords.remove(keyword);
        });
    }
    if (ast && ast.variablesTable) {
        ast.variablesTable.variables.forEach(variable => {
            variables.remove(variable);
        });
    }
}
exports.removeFileSymbols = removeFileSymbols;
//# sourceMappingURL=search-tree.js.map