Object.defineProperty(exports, "__esModule", { value: true });
const search_tree_1 = require("../search-tree");
const vscode_uri_1 = require("vscode-uri");
class WorkspaceFile {
    constructor(
    // The namespace for this file is based on the filename.
    namespace, 
    // Absolute path of the file in the file system
    filePath, 
    // File's relative path to workspace root
    relativePath, 
    // AST of the file
    ast) {
        this.namespace = namespace;
        this.filePath = filePath;
        this.relativePath = relativePath;
        this.ast = ast;
        const { documentation, keywords, variables } = search_tree_1.createFileSearchTrees(ast);
        this.documentation = documentation;
        this.keywords = keywords;
        this.variables = variables;
    }
    get uri() {
        return vscode_uri_1.default.file(this.filePath).toString();
    }
}
exports.default = WorkspaceFile;
//# sourceMappingURL=workspace-file.js.map