Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../parser/models");
const position_helper_1 = require("../../parser/position-helper");
const search_tree_1 = require("../search-tree");
const DUMMY_POSITION = position_helper_1.position(0, 0);
const DUMMY_LOCATION = position_helper_1.location(0, 0, 0, 0);
/**
 * A standard or 3rd party library. Contains only keyword definitions
 * of that library.
 */
class Library {
    constructor(namespace, version, documentation, keywords) {
        this.namespace = namespace;
        this.version = version;
        this.documentation = documentation;
        this.variables = search_tree_1.VariableContainer.Empty;
        this.keywords = new search_tree_1.KeywordContainer();
        keywords.forEach(kw => this.keywords.add(kw));
    }
}
exports.Library = Library;
/**
 * Parses a library file
 */
function createLibraryFile(libraryDefinition) {
    const { name = "", version = "", keywords = [] } = libraryDefinition;
    const parsedKeywords = keywords
        .filter(kw => kw && kw.name)
        .map(kw => _jsonKeywordToModel(name, kw));
    return new Library(name, version, "", parsedKeywords);
}
exports.createLibraryFile = createLibraryFile;
function _jsonKeywordToModel(namespace, keywordDefinition) {
    const { name, args = [], doc = "" } = keywordDefinition;
    const keyword = new models_1.UserKeyword(new models_1.NamespacedIdentifier(namespace, name, DUMMY_LOCATION), DUMMY_POSITION);
    keyword.documentation = new models_1.Documentation(new models_1.Identifier("Documentation", DUMMY_LOCATION), new models_1.Literal(doc, DUMMY_LOCATION), DUMMY_LOCATION);
    const parsedArgs = Array.isArray(args) ? args : [args];
    keyword.arguments = new models_1.Arguments(new models_1.Identifier("Arguments", DUMMY_LOCATION), parsedArgs.map(arg => new models_1.ScalarDeclaration(new models_1.Identifier(arg, DUMMY_LOCATION), undefined, DUMMY_LOCATION)), DUMMY_LOCATION);
    return keyword;
}
//# sourceMappingURL=library.js.map