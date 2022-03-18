Object.defineProperty(exports, "__esModule", { value: true });
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Off"] = 0] = "Off";
    LogLevel[LogLevel["Errors"] = 1] = "Errors";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Debug"] = 3] = "Debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
const defaultLogLevel = LogLevel.Off;
class Config {
    static setSettings(settings) {
        Config.settings = settings;
    }
    static getIncludeExclude() {
        if (!Config.settings) {
            return {
                include: [],
                exclude: [],
            };
        }
        return {
            include: Config.settings.includePaths || [],
            exclude: Config.settings.excludePaths || [],
        };
    }
    static getLogLevel() {
        if (!Config.settings) {
            return defaultLogLevel;
        }
        switch (Config.settings.logLevel) {
            case "off":
                return LogLevel.Off;
            case "errors":
                return LogLevel.Errors;
            case "info":
                return LogLevel.Info;
            case "debug":
                return LogLevel.Debug;
            default:
                return defaultLogLevel;
        }
    }
    static getLibraries() {
        if (!Config.settings) {
            return [];
        }
        return Config.settings.libraries || [];
    }
}
Config.settings = {};
exports.Config = Config;
//# sourceMappingURL=settings.js.map