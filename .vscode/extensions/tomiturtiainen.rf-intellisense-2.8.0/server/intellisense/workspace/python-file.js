Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const workspace_file_1 = require("./workspace-file");
const python_parser_1 = require("../../python-parser/python-parser");
const pythonParser = new python_parser_1.PythonParser();
class PythonFile extends workspace_file_1.default {
    constructor(
    // The namespace for this file is based on the filename.
    namespace, 
    // Absolute path of the file in the file system
    filePath, 
    // File's relative path to workspace root
    relativePath, 
    // AST of the file
    fileTree) {
        super(namespace, filePath, relativePath, fileTree);
    }
}
exports.PythonFile = PythonFile;
/**
 * Parses a python file
 *
 * @param absolutePath
 * @param relativePath
 * @param contents
 */
function createPythonFile(contents, absolutePath, relativePath) {
    // TODO: Is this how namespaces work for python files?
    const namespace = path.parse(absolutePath).name;
    const ast = pythonParser.parseFile(contents, namespace);
    return new PythonFile(namespace, absolutePath, relativePath, ast);
}
exports.createPythonFile = createPythonFile;
//# sourceMappingURL=python-file.js.map