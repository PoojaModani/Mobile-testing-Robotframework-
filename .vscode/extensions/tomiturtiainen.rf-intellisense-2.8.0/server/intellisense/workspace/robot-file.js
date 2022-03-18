Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const parser_1 = require("../../parser/parser");
const workspace_file_1 = require("./workspace-file");
const robotParser = new parser_1.FileParser();
class RobotFile extends workspace_file_1.default {
    constructor(
    // The namespace for this file is based on the filename.
    namespace, 
    // Absolute path of the file in the file system
    filePath, 
    // File's relative path to workspace root
    relativePath, 
    // AST of the file
    fileAst, 
    // Tables read from the robot file
    tables) {
        super(namespace, filePath, relativePath, fileAst);
        this.tables = tables;
    }
}
exports.RobotFile = RobotFile;
/**
 * Parses a robot file
 *
 * @param absolutePath
 * @param relativePath
 * @param contents
 */
function createRobotFile(contents, absolutePath, relativePath) {
    const tables = robotParser.readTables(contents);
    // Set the namespace for all keywords to the file name.
    // Robot docs:
    //    Resource files are specified in the full keyword name, similarly as library names.
    //    The name of the resource is derived from the basename of the resource file without the file extension.
    // http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#handling-keywords-with-same-names
    const namespace = path.parse(relativePath).name;
    const ast = robotParser.parseFile(tables, namespace);
    return new RobotFile(namespace, absolutePath, relativePath, ast, tables);
}
exports.createRobotFile = createRobotFile;
//# sourceMappingURL=robot-file.js.map