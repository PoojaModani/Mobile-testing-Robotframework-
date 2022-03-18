Object.defineProperty(exports, "__esModule", { value: true });
class Identifier {
    constructor(name, location) {
        this.name = name;
        this.location = location;
        this.type = "Identifier";
    }
}
exports.Identifier = Identifier;
class NamespacedIdentifier extends Identifier {
    constructor(namespace, name, location) {
        super(name, location);
        this.namespace = namespace;
        this.name = name;
        this.location = location;
        this.type = "NamespacedIdentifier";
    }
    get fullName() {
        return `${this.namespace}.${this.name}`;
    }
}
exports.NamespacedIdentifier = NamespacedIdentifier;
class VariableExpression {
    constructor(id, kind, location) {
        this.id = id;
        this.kind = kind;
        this.location = location;
        this.type = "VariableExpression";
    }
}
exports.VariableExpression = VariableExpression;
class Literal {
    constructor(value, location) {
        this.value = value;
        this.location = location;
        this.type = "Literal";
    }
}
exports.Literal = Literal;
class KeyValueLiteral extends Literal {
    /**
     *
     */
    constructor(name, value, location) {
        super(value, location);
        this.name = name;
        this.type = "KeyValueLiteral";
    }
}
exports.KeyValueLiteral = KeyValueLiteral;
class TemplateElement {
    constructor(value, location) {
        this.value = value;
        this.location = location;
        this.type = "TemplateElement";
    }
}
exports.TemplateElement = TemplateElement;
class TemplateLiteral {
    constructor(quasis, expressions, location) {
        this.quasis = quasis;
        this.expressions = expressions;
        this.location = location;
        this.type = "TemplateLiteral";
    }
}
exports.TemplateLiteral = TemplateLiteral;
class CallExpression {
    constructor(callee, args, location) {
        this.callee = callee;
        this.args = args;
        this.location = location;
        this.type = "CallExpression";
    }
}
exports.CallExpression = CallExpression;
class EmptyNode {
    constructor(position) {
        this.type = "EmptyNode";
        this.location = {
            start: position,
            end: position,
        };
    }
}
exports.EmptyNode = EmptyNode;
class LibraryImport {
    /**
     *
     */
    constructor(target, args, location) {
        this.target = target;
        this.args = args;
        this.location = location;
        this.type = "LibraryImport";
    }
}
exports.LibraryImport = LibraryImport;
class ResourceImport {
    /**
     *
     */
    constructor(target, location) {
        this.target = target;
        this.location = location;
        this.type = "ResourceImport";
    }
}
exports.ResourceImport = ResourceImport;
class VariableImport {
    /**
     *
     */
    constructor(target, location) {
        this.target = target;
        this.location = location;
        this.type = "VariableImport";
    }
}
exports.VariableImport = VariableImport;
class SuiteSetting {
    constructor(name, value, location) {
        this.name = name;
        this.value = value;
        this.location = location;
        this.type = "SuiteSetting";
    }
}
exports.SuiteSetting = SuiteSetting;
/**
 *
 */
class SettingsTable {
    // TODO:
    // Metadata
    // Force tags
    // Default tags
    // Test template
    // Test timeout
    constructor(location) {
        this.location = location;
        this.type = "SettingsTable";
        this.libraryImports = [];
        this.resourceImports = [];
        this.variableImports = [];
    }
    addLibraryImport(importToAdd) {
        this.libraryImports.push(importToAdd);
    }
    addResourceImport(importToAdd) {
        this.resourceImports.push(importToAdd);
    }
    addVariableImport(importToAdd) {
        this.variableImports.push(importToAdd);
    }
}
exports.SettingsTable = SettingsTable;
/**
 *
 */
class Documentation {
    /**
     *
     */
    constructor(id, value, location) {
        this.id = id;
        this.value = value;
        this.location = location;
        this.type = "Documentation";
        this.kind = "Documentation";
    }
}
exports.Documentation = Documentation;
/**
 *
 */
class Arguments {
    /**
     *
     */
    constructor(id, values = [], location) {
        this.id = id;
        this.values = values;
        this.location = location;
        this.type = "Arguments";
        this.kind = "Arguments";
    }
}
exports.Arguments = Arguments;
/**
 *
 */
class Return {
    /**
     *
     */
    constructor(id, values = [], location) {
        this.id = id;
        this.values = values;
        this.location = location;
        this.type = "Return";
        this.kind = "Return";
    }
}
exports.Return = Return;
/**
 *
 */
class Timeout {
    /**
     *
     */
    constructor(id, value, message, location) {
        this.id = id;
        this.value = value;
        this.message = message;
        this.location = location;
        this.type = "Timeout";
        this.kind = "Timeout";
    }
}
exports.Timeout = Timeout;
/**
 *
 */
class Tags {
    /**
     *
     */
    constructor(id, values = [], location) {
        this.id = id;
        this.values = values;
        this.location = location;
        this.type = "Tags";
        this.kind = "Tags";
    }
}
exports.Tags = Tags;
/**
 *
 */
class Teardown {
    /**
     *
     */
    constructor(id, keyword, location) {
        this.id = id;
        this.keyword = keyword;
        this.location = location;
        this.type = "Teardown";
        this.kind = "Teardown";
    }
}
exports.Teardown = Teardown;
/**
 *
 */
class Setup {
    /**
     *
     */
    constructor(id, keyword, location) {
        this.id = id;
        this.keyword = keyword;
        this.location = location;
        this.type = "Setup";
        this.kind = "Setup";
    }
}
exports.Setup = Setup;
/**
 *
 */
class Template {
    /**
     *
     */
    constructor(id, keyword, location) {
        this.id = id;
        this.keyword = keyword;
        this.location = location;
        this.type = "Template";
        this.kind = "Template";
    }
}
exports.Template = Template;
/**
 *
 */
class ScalarDeclaration {
    /**
     *
     */
    constructor(id, value, location) {
        this.id = id;
        this.value = value;
        this.location = location;
        this.type = "ScalarDeclaration";
        this.kind = "Scalar";
    }
}
exports.ScalarDeclaration = ScalarDeclaration;
/**
 *
 */
class ListDeclaration {
    /**
     *
     */
    constructor(id, values, location) {
        this.id = id;
        this.values = values;
        this.location = location;
        this.type = "ListDeclaration";
        this.kind = "List";
    }
}
exports.ListDeclaration = ListDeclaration;
class DictionaryDeclaration {
    /**
     *
     */
    constructor(id, values, location) {
        this.id = id;
        this.values = values;
        this.location = location;
        this.type = "DictionaryDeclaration";
        this.kind = "Dictionary";
    }
}
exports.DictionaryDeclaration = DictionaryDeclaration;
/**
 * VariablesTable
 */
class VariablesTable {
    constructor(location) {
        this.location = location;
        this.type = "VariablesTable";
        this.variables = [];
    }
    addVariable(variable) {
        this.variables.push(variable);
    }
}
exports.VariablesTable = VariablesTable;
/**
 * Step
 */
class Step {
    constructor(body, location) {
        this.body = body;
        this.location = location;
        this.type = "Step";
    }
}
exports.Step = Step;
/**
 *
 */
class UserKeyword {
    constructor(id, startPosition) {
        this.id = id;
        this.type = "UserKeyword";
        this.steps = [];
        this.location = {
            start: startPosition,
            end: startPosition,
        };
    }
    addStep(step) {
        this.steps.push(step);
    }
}
exports.UserKeyword = UserKeyword;
/**
 * KeywordsTable
 */
class KeywordsTable {
    constructor(location) {
        this.location = location;
        this.type = "KeywordsTable";
        this.keywords = [];
    }
    addKeyword(keyword) {
        this.keywords.push(keyword);
    }
}
exports.KeywordsTable = KeywordsTable;
/**
 *
 */
class TestCase {
    // TODO: Template
    constructor(id, startPosition) {
        this.id = id;
        this.type = "TestCase";
        this.steps = [];
        this.location = {
            start: startPosition,
            end: startPosition,
        };
    }
    addStep(step) {
        this.steps.push(step);
    }
}
exports.TestCase = TestCase;
/**
 *
 */
class TestCasesTable {
    constructor(location) {
        this.location = location;
        this.type = "TestCasesTable";
        this.testCases = [];
    }
    addTestCase(testCase) {
        this.testCases.push(testCase);
    }
}
exports.TestCasesTable = TestCasesTable;
class TestSuite {
    /**
     *
     */
    constructor(location) {
        this.location = location;
        this.type = "TestSuite";
    }
}
exports.TestSuite = TestSuite;
//# sourceMappingURL=models.js.map