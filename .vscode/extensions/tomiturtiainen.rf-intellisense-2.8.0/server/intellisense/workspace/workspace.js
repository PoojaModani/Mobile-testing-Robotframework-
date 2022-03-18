Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const search_tree_1 = require("../search-tree");
/**
 * A class that represents a workspace (=folder) open in VSCode
 */
class Workspace {
    constructor() {
        // A tree of all global variables in the workspace
        this.variables = new search_tree_1.VariableContainer();
        // A tree of all global keywords in the workspace
        this.keywords = new search_tree_1.GlobalKeywordContainer();
        // Mapping from filename: string -> file
        this.filesByPath = new Map();
        // Mapping from WorkspaceFile namespace: string -> file
        this.filesByNamespace = new Map();
        // Mapping from library name --> Library
        this.librariesByName = new Map();
    }
    /**
     * Adds a file to the workspace
     *
     * @param file
     */
    addFile(file) {
        // Remove file first so its search tree is removed from global tree
        this.removeFileByPath(file.filePath);
        file.keywords.forEach((key, keyword) => this.keywords.addKeyword(keyword));
        this.variables.copyFrom(file.variables);
        this.filesByPath.set(file.filePath, file);
        this.filesByNamespace.set(file.namespace, file);
    }
    /**
     * Adds given library and its keywords to the workspace
     */
    addLibrary(library) {
        library.keywords.forEach((key, keyword) => this.keywords.addKeyword(keyword));
        this.variables.copyFrom(library.variables);
        this.librariesByName.set(library.namespace, library);
    }
    /**
     * Removes all libraries and their keywords from the workspace
     */
    removeAllLibraries() {
        Array.from(this.librariesByName.values()).forEach(library => {
            library.keywords.forEach((key, keyword) => this.keywords.removeKeyword(keyword));
            this.librariesByName.delete(library.namespace);
        });
    }
    /**
     *
     * @param filePath
     */
    removeFileByPath(filePath) {
        const existingFile = this.filesByPath.get(filePath);
        if (existingFile) {
            existingFile.keywords.forEach((key, keyword) => this.keywords.removeKeyword(keyword));
            const { ast } = existingFile;
            if (ast && ast.variablesTable) {
                ast.variablesTable.variables.forEach(variable => {
                    this.variables.remove(variable);
                });
            }
            this.filesByNamespace.delete(existingFile.namespace);
        }
        this.filesByPath.delete(filePath);
    }
    /**
     * Searchs the global workspace for matching keywords.
     * Results are grouped by the matching keyword.
     */
    findKeywords(textToSearch) {
        /* An example of the resulting array-of-arrays:
         * [
         *   [
         *     { namespace: "Foo": keyword: "Find" },
         *     { namespace: "Bar": keyword: "Find" },
         *   ],
         *   [
         *     { namespace: "Bar": keyword: "DoThing" },
         *   ]
         * ]
         */
        return _(this.keywords.findByPrefix(textToSearch))
            .flatten()
            .groupBy((keyword) => keyword.id.name)
            .map((keywords) => keywords)
            .value();
    }
    /**
     * Finds modules (resource files and libraries) by their namespace
     */
    findModulesByNamespace(textToSearch) {
        const modules = [];
        const normalizedSearchText = textToSearch.toLowerCase();
        for (const file of this.filesByNamespace.values()) {
            if (file.namespace.toLowerCase().startsWith(normalizedSearchText)) {
                modules.push(file);
            }
        }
        for (const libraryNamespace of this.librariesByName.values()) {
            if (libraryNamespace.namespace
                .toLowerCase()
                .startsWith(normalizedSearchText)) {
                modules.push(libraryNamespace);
            }
        }
        return modules;
    }
    /**
     * Removes all files
     */
    clear() {
        this.filesByPath = new Map();
        this.filesByNamespace = new Map();
        this.librariesByName = new Map();
        this.keywords = new search_tree_1.GlobalKeywordContainer();
        this.variables = new search_tree_1.VariableContainer();
    }
    getFile(filename) {
        return this.filesByPath.get(filename);
    }
    getFileByNamespace(namespace) {
        return this.filesByNamespace.get(namespace);
    }
    getSymbolsByNamespace(namespace) {
        // Assume there's only one resource file / library per namespace
        return (this.filesByNamespace.get(namespace) ||
            this.librariesByName.get(namespace));
    }
    getFiles() {
        return this.filesByPath.values();
    }
}
exports.Workspace = Workspace;
exports.default = Workspace;
//# sourceMappingURL=workspace.js.map