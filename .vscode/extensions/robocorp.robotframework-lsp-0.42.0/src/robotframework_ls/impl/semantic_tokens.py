from typing import List, Tuple, Iterator, Optional, Any
import itertools
from robocorp_ls_core.protocols import IDocument
from robotframework_ls.impl.protocols import ICompletionContext, IRobotToken
import os

from robotframework_ls.impl.robot_constants import (
    COMMENT,
    HEADER_TOKENS,
    SETTING_TOKENS,
    NAME,
    KEYWORD_NAME,
    ARGUMENT,
    VARIABLE,
    KEYWORD,
    CONTROL_TOKENS,
    TESTCASE_NAME,
    ERROR,
    FATAL_ERROR,
    ROBOT_AND_TXT_FILE_EXTENSIONS,
    OPTION,
)


TOKEN_TYPES = [
    "variable",
    "comment",
    # Custom added
    "header",  # entity.name.type.class.robot  -- *** Settings ***
    "setting",  # storage.type.setting.robot  -- Resource, Library
    "name",  # entity.other.inherited-class.robot   -- my.library.py
    "keywordNameDefinition",  # entity.name.function.robot
    "variableOperator",  # keyword.operator.variable.robot
    "keywordNameCall",  # meta.keyword.call.robot
    "settingOperator",  # keyword.operator.setting.robot
    "control",
    "testCaseName",
    "parameterName",
    "argumentValue",
    "error",
    "documentation",
]

TOKEN_MODIFIERS = [
    "declaration",
    "definition",
    "readonly",
    "static",
    "deprecated",
    "abstract",
    "async",
    "modification",
    "documentation",
    "defaultLibrary",
]

TOKEN_TYPE_TO_INDEX = {}
TOKEN_MODIFIER_TO_INDEX = {}

for i, value in enumerate(TOKEN_TYPES):
    TOKEN_TYPE_TO_INDEX[value] = i

for i, value in enumerate(TOKEN_MODIFIERS):
    TOKEN_MODIFIER_TO_INDEX[value] = 2 ** (i + 1)  # Modifiers use a bit mask.

del i
del value


def _split_token_change_first(
    token: IRobotToken, first_token_type: str, position: int
) -> Tuple[IRobotToken, IRobotToken]:
    from robotframework_ls.impl import ast_utils

    prefix = ast_utils.copy_token_replacing(
        token,
        type=first_token_type,
        value=token.value[:position],
    )
    remainder = ast_utils.copy_token_replacing(
        token, value=token.value[position:], col_offset=prefix.end_col_offset
    )
    return prefix, remainder


def _split_token_change_second(
    token: IRobotToken, second_token_type: str, position: int
) -> Tuple[IRobotToken, IRobotToken]:
    from robotframework_ls.impl import ast_utils

    prefix = ast_utils.copy_token_replacing(
        token,
        value=token.value[:position],
    )
    remainder = ast_utils.copy_token_replacing(
        token,
        value=token.value[position:],
        col_offset=prefix.end_col_offset,
        type=second_token_type,
    )
    return prefix, remainder


def _extract_gherkin_token_from_keyword(
    keyword_token: IRobotToken,
) -> Tuple[Optional[IRobotToken], IRobotToken]:
    import re

    result = re.match(
        r"^((Given|When|Then|And|But)\s+)", keyword_token.value, flags=re.IGNORECASE
    )
    if result:
        gherkin_token_length = len(result.group(1))
        return _split_token_change_first(keyword_token, "control", gherkin_token_length)

    return None, keyword_token


def _extract_library_token_from_keyword(
    keyword_token: IRobotToken, scope: "_SemanticTokensScope"
) -> Tuple[Optional[IRobotToken], IRobotToken]:
    if not "." in keyword_token.value:
        return None, keyword_token

    potential_candidates = _get_potential_library_names_from_keyword(
        keyword_token.value
    )

    for library_name in potential_candidates:
        if library_name in scope.imported_libraries:
            return _split_token_change_first(keyword_token, "name", len(library_name))
    return None, keyword_token


def _get_potential_library_names_from_keyword(keyword_name: str) -> Iterator[str]:
    name_length = -1
    while True:
        name_length = keyword_name.find(".", name_length + 1)
        if name_length == -1:
            break
        library_name = keyword_name[:name_length].lower()
        yield library_name


def _iter_dependent_names(context: ICompletionContext) -> Iterator[str]:
    """
    Provides names which can be used as (library/resource) prefixes
    for keyword calls.

    Note: names returned are all lower-case as case should not be taken into
    account for matches.
    """
    dependency_graph = context.collect_dependency_graph()
    for library in dependency_graph.iter_all_libraries():
        name = library.name
        if name:
            library_name = os.path.basename(name)
            basename, ext = os.path.splitext(library_name)
            if ext == ".py":
                yield basename.lower()
            else:
                yield name.lower()

        alias = library.alias
        if alias:
            yield alias.lower()

    for resource_node, _ in dependency_graph.iter_all_resource_imports_with_docs():
        name = resource_node.name
        if name:
            resource_name = os.path.basename(name)
            basename, ext = os.path.splitext(resource_name)
            if ext in ROBOT_AND_TXT_FILE_EXTENSIONS:
                yield basename.lower()
            else:
                yield name.lower()


# See: https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-scope-map

RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX = {
    COMMENT: TOKEN_TYPE_TO_INDEX["comment"],
    NAME: TOKEN_TYPE_TO_INDEX["name"],
    KEYWORD_NAME: TOKEN_TYPE_TO_INDEX["keywordNameDefinition"],
    TESTCASE_NAME: TOKEN_TYPE_TO_INDEX["testCaseName"],
    KEYWORD: TOKEN_TYPE_TO_INDEX["keywordNameCall"],
    ARGUMENT: TOKEN_TYPE_TO_INDEX["argumentValue"],
    VARIABLE: TOKEN_TYPE_TO_INDEX["variable"],
    ERROR: TOKEN_TYPE_TO_INDEX["error"],
    FATAL_ERROR: TOKEN_TYPE_TO_INDEX["error"],
    OPTION: TOKEN_TYPE_TO_INDEX["argumentValue"],
}


for tok_type in HEADER_TOKENS:  # *** Settings ***, ...
    RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX[tok_type] = TOKEN_TYPE_TO_INDEX["header"]

for tok_type in SETTING_TOKENS:  # Library, Teardown, ...
    RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX[tok_type] = TOKEN_TYPE_TO_INDEX["setting"]

for tok_type in CONTROL_TOKENS:  # Library, Teardown, ...
    RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX[tok_type] = TOKEN_TYPE_TO_INDEX["control"]

for key, val in list(RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX.items()):
    RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX[key.replace(" ", "_")] = val


VARIABLE_INDEX = TOKEN_TYPE_TO_INDEX["variable"]
ARGUMENT_INDEX = TOKEN_TYPE_TO_INDEX["argumentValue"]
VARIABLE_OPERATOR_INDEX = TOKEN_TYPE_TO_INDEX["variableOperator"]
SETTING_INDEX = TOKEN_TYPE_TO_INDEX["setting"]
PARAMETER_NAME_INDEX = TOKEN_TYPE_TO_INDEX["parameterName"]
DOCUMENTATION_INDEX = TOKEN_TYPE_TO_INDEX["documentation"]


def _tokenize_changing_argument_to_keyword(tokenize_variables_generator):
    from robotframework_ls.impl import ast_utils

    for tok in tokenize_variables_generator:
        if tok.type == ARGUMENT:
            yield ast_utils.copy_token_replacing(tok, type=KEYWORD)
        else:
            yield tok


def _tokenize_variables(token):
    if token.type == KEYWORD:
        from robotframework_ls.impl import ast_utils

        # Hack because RF can't tokenize KEYWORD (it only tokenizes
        # some pre-defined types and KEYWORD is not there).

        if not token.value or "{" not in token.value:
            # Nothing to tokenize.
            return iter((token,))

        else:
            # Force ARGUMENT tokenization but show KEYWORD for callers.
            token = ast_utils.copy_token_replacing(token, type=ARGUMENT)
            return _tokenize_changing_argument_to_keyword(token.tokenize_variables())
    else:
        return token.tokenize_variables()


def semantic_tokens_range(context, range):
    return []


def _tokenize_token(node, use_token, scope: "_SemanticTokensScope"):
    if use_token.type in (use_token.EOL, use_token.SEPARATOR):
        # Fast way out for the most common tokens (which have no special handling).
        return

    from robotframework_ls.impl.ast_utils import (
        CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_SET,
        copy_token_replacing,
    )

    use_token_type = use_token.type
    in_documentation = False

    # Step 1: cast to KEYWORD if needed.
    if use_token_type == ARGUMENT:
        in_documentation = node.__class__.__name__ == "Documentation"

        if not in_documentation:
            if scope.args_as_keywords_handler is not None:
                if scope.args_as_keywords_handler.consider_current_argument_token_as_keyword(
                    use_token
                ):
                    use_token_type = KEYWORD

    if use_token_type == NAME:
        if node.__class__.__name__ in CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_SET:
            use_token_type = KEYWORD

    if use_token.type != use_token_type:
        use_token = copy_token_replacing(use_token, type=use_token_type)

    if use_token_type == KEYWORD:
        token_keyword = use_token

        token_gherkin_prefix, token_keyword = _extract_gherkin_token_from_keyword(
            token_keyword
        )
        if token_gherkin_prefix:
            yield token_gherkin_prefix, scope.get_index_from_internal_token_type(
                token_gherkin_prefix.type
            )

        token_library_prefix, token_keyword = _extract_library_token_from_keyword(
            token_keyword, scope
        )
        if token_library_prefix:
            yield token_library_prefix, scope.get_index_from_internal_token_type(
                token_library_prefix.type
            )

        use_token = token_keyword

    try:
        iter_in = _tokenize_variables(use_token)
    except:
        if in_documentation:
            yield use_token, DOCUMENTATION_INDEX
        else:
            token_type_index = scope.get_index_from_rf_token_type(use_token_type)
            if token_type_index is not None:
                yield use_token, token_type_index
        return
    else:
        if use_token_type == ARGUMENT:
            first_token = next(iter_in)

            if in_documentation:
                equals_pos = -1
            else:
                equals_pos = first_token.value.find("=")
                if equals_pos != -1:
                    # Found an equals... let's check if it's not a 'catenate', which
                    # doesn't really accept parameters and just concatenates all...
                    value = node.get_value(use_token.KEYWORD)
                    if value and value.strip().lower() == "catenate":
                        equals_pos = -1

                        # Note: the best way to actually do this would be finding the
                        # reference to the keyword and then validating whether the
                        # keyword arguments match the expected name.
                        #
                        # For instance, a keyword call such as:
                        # Some Call     some arg = 22
                        #
                        # Should color `some arg =` differently only if the argument
                        # of `Some Call` is `some arg`, otherwise it should not color
                        # the argument as `same arg = 22` will be passed as a string
                        # to the positional argument 0 and not really a keyword parameter
                        # where `same arg` is set with value 22.
                        #
                        # Now, this requires a bit more tinkering with keyword caches
                        # and possibly semantic highlighting deltas to make sure the
                        # performance isn't negatively impacted by it.

            if equals_pos != -1:
                tok, first_token = _split_token_change_first(
                    first_token, "parameterName", equals_pos
                )
                yield tok, PARAMETER_NAME_INDEX

                tok, first_token = _split_token_change_first(
                    first_token, "variableOperator", 1
                )
                yield tok, VARIABLE_OPERATOR_INDEX

                # Add the remainder back.
                iter_in = itertools.chain(iter((first_token,)), iter_in)
            else:
                iter_in = itertools.chain(iter((first_token,)), iter_in)

        for token in iter_in:
            token_type_index = scope.get_index_from_rf_token_type(token.type)
            if token_type_index is not None:
                yield from _tokenized_args(token, token_type_index, in_documentation)


def _tokenized_args(token, token_type_index, in_documentation):
    if in_documentation and token_type_index == ARGUMENT_INDEX:
        # Handle the doc itself (note that we may also tokenize docs
        # to include variables).
        yield token, DOCUMENTATION_INDEX
        return

    if (
        token_type_index == VARIABLE_INDEX
        and len(token.value) > 3
        and token.value[-1] == "}"
        and token.value[1] == "{"
    ):
        # We want to do an additional tokenization on variables to
        # convert '${var}' to '${', 'var', '}'

        op_start_token, token = _split_token_change_first(token, "variableOperator", 2)
        yield op_start_token, VARIABLE_OPERATOR_INDEX

        var_token, op_end_token = _split_token_change_second(
            token, "variableOperator", len(token.value) - 1
        )
        yield var_token, token_type_index
        yield op_end_token, VARIABLE_OPERATOR_INDEX

        return

    if (
        token_type_index == SETTING_INDEX
        and len(token.value) > 2
        and token.value[-1] == "]"
        and token.value[0] == "["
    ):
        # We want to do an additional tokenization on names to
        # convert '[Arguments]' to '[', 'Arguments', ']'
        op_start_token, token = _split_token_change_first(token, "settingOperator", 1)
        yield op_start_token, VARIABLE_OPERATOR_INDEX

        var_token, op_end_token = _split_token_change_second(
            token, "settingOperator", len(token.value) - 1
        )
        yield var_token, token_type_index
        yield op_end_token, VARIABLE_OPERATOR_INDEX

        return

    if token.type == OPTION:
        eq_i = token.value.index("=")
        if eq_i != -1:
            # Convert limit=10 to 'limit' '=' '10'
            var_start_token, token = _split_token_change_first(
                token, "parameterName", eq_i
            )
            yield var_start_token, PARAMETER_NAME_INDEX

            var_token, var_end_token = _split_token_change_second(
                token, "variableOperator", 1
            )
            yield var_token, VARIABLE_OPERATOR_INDEX
            yield var_end_token, ARGUMENT_INDEX
            return

    # Default case (just yield the current token/type).
    yield token, token_type_index


class _SemanticTokensScope:
    def __init__(self, context: ICompletionContext):
        # It's the same for all files.
        self.imported_libraries = set(_iter_dependent_names(context))

        # Note: it's set for the node and then reused for all the tokens in that same node.
        self.args_as_keywords_handler: Any = None

        self.get_index_from_rf_token_type = RF_TOKEN_TYPE_TO_TOKEN_TYPE_INDEX.get
        self.get_index_from_internal_token_type = TOKEN_TYPE_TO_INDEX.__getitem__


def semantic_tokens_full(context: ICompletionContext):
    try:
        ast = context.doc.get_ast()
    except:
        return []

    from robotframework_ls.impl import ast_utils

    monitor = context.monitor

    ret: List[int] = []
    append = ret.append

    last_line = 0
    last_column = 0

    scope = _SemanticTokensScope(context)
    for _stack, node in ast_utils.iter_all_nodes_recursive(ast):
        if monitor:
            monitor.check_cancelled()
        tokens = getattr(node, "tokens", None)
        if tokens:
            scope.args_as_keywords_handler = ast_utils.get_args_as_keywords_handler(
                node
            )

            for token in tokens:
                for token_part, token_type_index in _tokenize_token(node, token, scope):
                    lineno = token_part.lineno - 1
                    if lineno < 0:
                        lineno = 0
                    append(lineno - last_line)
                    if lineno != last_line:
                        last_column = token_part.col_offset
                        if last_column < 0:
                            last_column = 0
                        append(last_column)
                    else:
                        col_delta = token_part.col_offset - last_column
                        append(col_delta)
                        last_column += col_delta

                    append(token_part.end_col_offset - token_part.col_offset)  # len
                    append(token_type_index)
                    append(0)  # i.e.: no modifier
                    last_line = lineno

    return ret


def decode_semantic_tokens(
    semantic_tokens_as_int: List[int], doc: IDocument, stream=None
):
    ret: List[Tuple[str, str]] = []
    if not semantic_tokens_as_int:
        return ret

    ints_iter = iter(semantic_tokens_as_int)
    line = 0
    col = 0
    while True:
        try:
            line_delta = next(ints_iter)
        except StopIteration:
            return ret
        col_delta = next(ints_iter)
        token_len = next(ints_iter)
        token_type = next(ints_iter)
        token_modifier = next(ints_iter)
        line += line_delta
        if line_delta == 0:
            col += col_delta
        else:
            col = col_delta

        s = doc.get_line(line)[col : col + token_len]
        ret.append((s, TOKEN_TYPES[token_type]))
        if stream is not None:
            print(">>", s, "<<", file=stream)

            print(f"line: {line}", file=stream)
            print(f"col: {col}", file=stream)
            print(f"line_delta: {line_delta}", file=stream)
            print(f"col_delta: {col_delta}", file=stream)
            print(f"len: {token_len}", file=stream)
            print(f"type: {token_type}", file=stream)
            print(f"modifier: {token_modifier}", file=stream)
            print("", file=stream)
