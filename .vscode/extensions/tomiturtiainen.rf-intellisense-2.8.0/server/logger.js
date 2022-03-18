Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./utils/settings");
class ConsoleLogger {
    static error(message, ...optionalParams) {
        if (this.shouldLog(settings_1.LogLevel.Errors)) {
            this.log(console.error, message, optionalParams);
        }
    }
    static info(message, ...optionalParams) {
        if (this.shouldLog(settings_1.LogLevel.Info)) {
            this.log(console.info, message, optionalParams);
        }
    }
    static debug(message, ...optionalParams) {
        if (this.shouldLog(settings_1.LogLevel.Debug)) {
            this.log(console.log, message, optionalParams);
        }
    }
    static log(logFn, message, optionalParams) {
        if (optionalParams.length > 0) {
            logFn(message, ...optionalParams);
        }
        else {
            logFn(message);
        }
    }
    static shouldLog(minLevel) {
        return settings_1.Config.getLogLevel() >= minLevel;
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=logger.js.map