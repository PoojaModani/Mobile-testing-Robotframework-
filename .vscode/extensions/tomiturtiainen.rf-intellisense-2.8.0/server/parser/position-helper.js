Object.defineProperty(exports, "__esModule", { value: true });
function position(line, column) {
    return {
        line,
        column,
    };
}
exports.position = position;
function location(startLine, startColumn, endLine, endColumn) {
    return {
        start: position(startLine, startColumn),
        end: position(endLine, endColumn),
    };
}
exports.location = location;
function locationFromStartEnd(start, end) {
    return {
        start: start.start,
        end: end.end,
    };
}
exports.locationFromStartEnd = locationFromStartEnd;
function locationFromPositions(start, end) {
    return { start, end };
}
exports.locationFromPositions = locationFromPositions;
//# sourceMappingURL=position-helper.js.map