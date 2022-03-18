Object.defineProperty(exports, "__esModule", { value: true });
function createPosition(line, column) {
    return {
        line,
        column,
    };
}
exports.createPosition = createPosition;
function createLocation(filePath, position) {
    return {
        filePath,
        position,
    };
}
exports.createLocation = createLocation;
function createRange(start, end) {
    return {
        start,
        end,
    };
}
exports.createRange = createRange;
/**
 * Converts given node's location to vscode Range
 *
 * @param node
 */
function nodeLocationToRange(node) {
    return {
        start: {
            line: node.location.start.line,
            character: node.location.start.column,
        },
        end: {
            line: node.location.end.line,
            character: node.location.end.column,
        },
    };
}
exports.nodeLocationToRange = nodeLocationToRange;
/**
 * Checks if given node spans over the given line
 *
 * @param line
 * @param node
 */
function isOnLine(line, node) {
    if (!node) {
        return false;
    }
    return node.location.start.line <= line && line <= node.location.end.line;
}
exports.isOnLine = isOnLine;
/**
 * Checks if given node spans over the given position
 *
 * @param position
 * @param range
 */
function isInRange(position, range) {
    if (!range) {
        return false;
    }
    const location = range.location;
    return ((location.start.line < position.line ||
        (location.start.line === position.line &&
            location.start.column <= position.column)) &&
        (position.line < location.end.line ||
            (position.line === location.end.line &&
                position.column <= location.end.column)));
}
exports.isInRange = isInRange;
//# sourceMappingURL=position.js.map