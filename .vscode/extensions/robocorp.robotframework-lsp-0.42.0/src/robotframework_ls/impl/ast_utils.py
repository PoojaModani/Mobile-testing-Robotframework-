import sys
from typing import Iterator, Optional, List, Tuple, Any, Union, Hashable, Callable, Dict

import ast as ast_module
from robocorp_ls_core.lsp import Error, RangeTypedDict, PositionTypedDict
from robocorp_ls_core.robotframework_log import get_logger
from robotframework_ls.impl.protocols import (
    TokenInfo,
    NodeInfo,
    KeywordUsageInfo,
    ILibraryImportNode,
    IRobotToken,
    INode,
)
from robotframework_ls.impl.text_utilities import normalize_robot_name
from robocorp_ls_core.basic import isinstance_name
from robotframework_ls.impl.keywords_in_args import KEYWORD_NAME_TO_KEYWORD_INDEX
import functools
import weakref
import threading
import typing


log = get_logger(__name__)


class _NodesProviderVisitor(ast_module.NodeVisitor):
    def __init__(self, on_node=lambda node: None):
        ast_module.NodeVisitor.__init__(self)
        self._stack = []
        self.on_node = on_node

    def generic_visit(self, node):
        self._stack.append(node)
        self.on_node(self._stack, node)
        ast_module.NodeVisitor.generic_visit(self, node)
        self._stack.pop()


class _PrinterVisitor(ast_module.NodeVisitor):
    def __init__(self, stream):
        ast_module.NodeVisitor.__init__(self)
        self._level = 0
        self._stream = stream

    def _replace_spacing(self, txt):
        curr_len = len(txt)
        delta = 80 - curr_len
        return txt.replace("*SPACING*", " " * delta)

    def generic_visit(self, node):
        # Note: prints line and col offsets 0-based (even if the ast is 1-based for
        # lines and 0-based for columns).
        self._level += 1
        try:
            indent = "  " * self._level
            node_lineno = node.lineno
            if node_lineno != -1:
                # Make 0-based
                node_lineno -= 1
            node_end_lineno = node.end_lineno
            if node_end_lineno != -1:
                # Make 0-based
                node_end_lineno -= 1
            self._stream.write(
                self._replace_spacing(
                    "%s%s *SPACING* (%s, %s) -> (%s, %s)\n"
                    % (
                        indent,
                        node.__class__.__name__,
                        node_lineno,
                        node.col_offset,
                        node_end_lineno,
                        node.end_col_offset,
                    )
                )
            )
            tokens = getattr(node, "tokens", [])
            for token in tokens:

                token_lineno = token.lineno
                if token_lineno != -1:
                    # Make 0-based
                    token_lineno -= 1

                self._stream.write(
                    self._replace_spacing(
                        "%s- %s, '%s' *SPACING* (%s, %s->%s)\n"
                        % (
                            indent,
                            token.type,
                            token.value.replace("\n", "\\n").replace("\r", "\\r"),
                            token_lineno,
                            token.col_offset,
                            token.end_col_offset,
                        )
                    )
                )

            ast_module.NodeVisitor.generic_visit(self, node)
        finally:
            self._level -= 1


MAX_ERRORS = 100


class _AbstractIndexer:
    def iter_indexed(self, clsname):
        pass


class _FullIndexer(_AbstractIndexer):
    def __init__(self, weak_ast: "weakref.ref[ast_module.AST]"):
        self._weak_ast = weak_ast
        self._lock = threading.Lock()
        self._name_to_node_info_lst: Dict[str, List[NodeInfo]] = {}
        self._indexed_full = False

    def _index(self):
        with self._lock:
            if self._indexed_full:
                return

            ast = self._weak_ast()
            if ast is None:
                raise RuntimeError("AST already garbage collected.")

            for stack, node in _iter_nodes(ast):
                lst = self._name_to_node_info_lst.get(node.__class__.__name__)
                if lst is None:
                    lst = self._name_to_node_info_lst[node.__class__.__name__] = []

                lst.append(NodeInfo(tuple(stack), node))
            self._indexed_full = True

    def iter_indexed(self, clsname: str) -> Iterator[NodeInfo]:
        if not self._indexed_full:
            self._index()

        yield from iter(self._name_to_node_info_lst.get(clsname, ()))


class _SectionIndexer(_AbstractIndexer):
    """
    This is a bit smarter in that it can index only the parts we're interested
    in (so, to get the LibraryImport it won't iterate over the keywords to
    do the indexing).
    """

    INNER_INSIDE_TOP_LEVEL = {
        "LibraryImport": "SettingSection",
        "ResourceImport": "SettingSection",
        "VariablesImport": "SettingSection",
        "SuiteSetup": "SettingSection",
        "SuiteTeardown": "SettingSection",
        "TestTemplate": "SettingSection",
        # Not settings:
        "Keyword": "KeywordSection",
        "TestCase": "TestCaseSection",
        "Variable": "VariableSection",
    }

    TOP_LEVEL = {
        "SettingSection",
        "VariableSection",
        "TestCaseSection",
        "KeywordSection",
        "CommentSection",
    }

    def __init__(self, weak_ast):
        self._weak_ast = weak_ast
        self._lock = threading.Lock()
        self._first_level_name_to_node_info_lst: Dict[str, List[NodeInfo]] = {}

        # We always start by indexing the first level in this case (to get the sections
        # such as 'CommentSection', 'SettingSection', etc), which should be fast.

        ast = self._weak_ast()
        if ast is None:
            raise RuntimeError("AST already garbage collected.")

        for stack, node in _iter_nodes(ast, recursive=False):
            lst = self._first_level_name_to_node_info_lst.get(node.__class__.__name__)
            if lst is None:
                lst = self._first_level_name_to_node_info_lst[
                    node.__class__.__name__
                ] = []

            lst.append(NodeInfo(tuple(stack), node))

    def iter_indexed(self, clsname: str) -> Iterator[NodeInfo]:
        top_level = self.INNER_INSIDE_TOP_LEVEL.get(clsname)
        if top_level is not None:
            lst = self._first_level_name_to_node_info_lst.get(top_level)
            if lst is not None:
                for node_info in lst:
                    indexer = _obtain_ast_indexer(node_info.node)
                    yield from indexer.iter_indexed(clsname)
        else:
            if clsname in self.TOP_LEVEL:
                yield from iter(
                    self._first_level_name_to_node_info_lst.get(clsname, ())
                )
            else:
                # i.e.: We don't know what we should be getting, so, just check
                # everything...
                for lst in self._first_level_name_to_node_info_lst.values():
                    for node_info in lst:
                        indexer = _obtain_ast_indexer(node_info.node)
                        yield from indexer.iter_indexed(clsname)


class _ASTIndexer:
    def __init__(self, ast: ast_module.AST):
        self._weak_ast = weakref.ref(ast)
        self._is_root = ast.__class__.__name__ == "File"

        self._indexer: _AbstractIndexer
        if self._is_root:
            # Cache by sections
            self._indexer = _SectionIndexer(self._weak_ast)
        else:
            # Always cache fully
            self._indexer = _FullIndexer(self._weak_ast)

        self._additional_caches: Dict[Hashable, Tuple[Any, ...]] = {}

    def iter_cached(
        self, cache_key: Hashable, compute: Callable, *args
    ) -> Iterator[Any]:
        try:
            cached = self._additional_caches[cache_key]
        except KeyError:
            cached = tuple(compute(self, *args))
            self._additional_caches[cache_key] = cached

        yield from iter(cached)

    def iter_indexed(self, clsname: str) -> Iterator[NodeInfo]:
        return self._indexer.iter_indexed(clsname)


def _get_errors_from_tokens(node):
    for token in node.tokens:
        if token.type in (token.ERROR, token.FATAL_ERROR):
            start = (token.lineno - 1, token.col_offset)
            end = (token.lineno - 1, token.end_col_offset)
            error = Error(token.error, start, end)
            yield error


def _obtain_ast_indexer(ast):
    try:
        indexer = ast.__ast_indexer__
    except:
        indexer = ast.__ast_indexer__ = _ASTIndexer(ast)
    return indexer


def _convert_ast_to_indexer(func):
    @functools.wraps(func)
    def new_func(ast, *args, **kwargs):
        try:
            indexer = ast.__ast_indexer__
        except:
            indexer = ast.__ast_indexer__ = _ASTIndexer(ast)

        return func(indexer, *args, **kwargs)

    return new_func


def collect_errors(node) -> List[Error]:
    errors = []

    use_errors_attribute = "errors" in node.__class__._attributes

    for _stack, node in _iter_nodes(node, recursive=True):
        if node.__class__.__name__ == "Error":
            errors.extend(_get_errors_from_tokens(node))

        elif use_errors_attribute:
            node_errors = getattr(node, "errors", ())
            if node_errors:
                for error in node_errors:
                    errors.append(create_error_from_node(node, error, tokens=[node]))

        if len(errors) >= MAX_ERRORS:
            break

    return errors


def create_error_from_node(node, msg, tokens=None) -> Error:
    if tokens is None:
        tokens = node.tokens

    if not tokens:
        log.info("No tokens found when visiting: %s.", node.__class__)
        start = (0, 0)
        end = (0, 0)
    else:
        # line is 1-based and col is 0-based (make both 0-based for the error).
        start = (tokens[0].lineno - 1, tokens[0].col_offset)
        end = (tokens[-1].lineno - 1, tokens[-1].end_col_offset)

    error = Error(msg, start, end)
    return error


def print_ast(node, stream=None):
    if stream is None:
        stream = sys.stderr
    errors_visitor = _PrinterVisitor(stream)
    errors_visitor.visit(node)


def find_section(node, line: int) -> Optional[INode]:
    """
    :param line:
        0-based
    """
    last_section = None
    for section in node.sections:
        # section.lineno is 1-based.
        if (section.lineno - 1) <= line:
            last_section = section

        else:
            return last_section

    return last_section


if typing.TYPE_CHECKING:
    # The INode has Robot Framework specific methods, but at runtime
    # we can just check the actual ast class.
    from typing import runtime_checkable, Protocol

    @runtime_checkable
    class _AST_CLASS(INode, Protocol):
        pass


else:
    # We know that the AST we're dealing with is the INode.
    # We can't use runtime_checkable on Python 3.7 though.
    _AST_CLASS = ast_module.AST


def _iter_nodes(
    node, internal_stack: Optional[List[INode]] = None, recursive=True
) -> Iterator[Tuple[List[INode], INode]]:
    """
    :note: the yielded stack is actually always the same (mutable) list, so,
    clients that want to return it somewhere else should create a copy.
    """
    stack: List[INode]
    if internal_stack is None:
        stack = []
    else:
        stack = internal_stack

    if recursive:
        for _field, value in ast_module.iter_fields(node):
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, _AST_CLASS):
                        yield stack, item
                        stack.append(item)
                        yield from _iter_nodes(item, stack, recursive=True)
                        stack.pop()

            elif isinstance(value, _AST_CLASS):
                yield stack, value
                stack.append(value)

                yield from _iter_nodes(value, stack, recursive=True)

                stack.pop()
    else:
        # Not recursive
        for _field, value in ast_module.iter_fields(node):
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, _AST_CLASS):
                        yield stack, item

            elif isinstance(value, _AST_CLASS):
                yield stack, value


def iter_all_nodes_recursive(node: INode) -> Iterator[Tuple[List[INode], INode]]:
    """
    This function will iterate over all the nodes. Use only if there's no
    other way to implement it as iterating over all the nodes is slow...
    """
    yield from _iter_nodes(node)


def _iter_nodes_filtered_not_recursive(
    ast, accept_class: Union[Tuple[str, ...], str]
) -> Iterator[Tuple[list, Any]]:
    if not isinstance(accept_class, (list, tuple, set)):
        accept_class = (accept_class,)
    for stack, node in _iter_nodes(ast, recursive=False):
        if node.__class__.__name__ in accept_class:
            yield stack, node


def find_token(section, line, col) -> Optional[TokenInfo]:
    """
    :param section:
        The result from find_section(line, col), to pre-filter the nodes we may match.
    """
    for stack, node in _iter_nodes(section):
        try:
            tokens = node.tokens
        except AttributeError:
            continue

        last_token = None
        for token in tokens:
            lineno = token.lineno - 1
            if lineno != line:
                continue

            if token.type == token.SEPARATOR:
                # For separator tokens, it must be entirely within the section
                # i.e.: if it's in the boundary for a word, we want the word,
                # not the separator.
                if token.col_offset < col < token.end_col_offset:
                    return TokenInfo(tuple(stack), node, token)

            elif token.type == token.EOL:
                # A trailing whitespace after a keyword should be part of
                # the keyword, not EOL.
                if token.col_offset <= col <= token.end_col_offset:
                    diff = col - token.col_offset
                    if last_token is not None and not token.value.strip():
                        eol_contents = token.value[:diff]
                        if len(eol_contents) <= 1:
                            token = _append_eol_to_prev_token(last_token, eol_contents)

                    return TokenInfo(tuple(stack), node, token)

            else:
                if token.col_offset <= col <= token.end_col_offset:
                    return TokenInfo(tuple(stack), node, token)

            last_token = token

    return None


def find_variable(section, line, col) -> Optional[TokenInfo]:
    token_info = find_token(section, line, col)
    if token_info is not None:
        token = token_info.token
        if "{" in token.value:
            parts = _tokenize_variables_even_when_invalid(token, col)
            if not parts:
                return None

            for part in parts:
                if part.col_offset <= col <= part.end_col_offset:
                    if part.type == part.VARIABLE:
                        return TokenInfo(token_info.stack, token_info.node, part)
                    else:
                        return None
            else:
                return None
    return None


def create_token(name):
    from robot.api import Token

    return Token(Token.NAME, name)


def tokenize_variables_from_name(name):
    return tokenize_variables(create_token(name))  # May throw error if it's not OK.


def tokenize_variables(token: IRobotToken):
    return token.tokenize_variables()  # May throw error if it's not OK.


def _tokenize_variables_even_when_invalid(token: IRobotToken, col: int):
    """
    If Token.tokenize_variables() fails, this can still provide the variable under
    the given column by applying some heuristics to find open variables.
    """
    try:
        return token.tokenize_variables()
    except:
        pass

    # If we got here, it means that we weren't able to tokenize the variables
    # properly (probably some variable wasn't closed properly), so, let's do
    # a custom implementation for this use case.

    from robot.api import Token
    from robotframework_ls.impl.robot_constants import VARIABLE_PREFIXES

    diff = col - token.col_offset
    up_to_cursor = token.value[:diff]
    open_at = up_to_cursor.rfind("{")

    if open_at >= 1:
        if up_to_cursor[open_at - 1] in VARIABLE_PREFIXES:
            varname = [up_to_cursor[open_at - 1 :]]
            from_cursor = token.value[diff:]

            for c in from_cursor:
                if c in VARIABLE_PREFIXES or c.isspace() or c == "{":
                    break
                if c == "}":
                    varname.append(c)
                    break
                varname.append(c)

            return [
                Token(
                    type=token.VARIABLE,
                    value="".join(varname),
                    lineno=token.lineno,
                    col_offset=token.col_offset + open_at - 1,
                    error=token.error,
                )
            ]


LIBRARY_IMPORT_CLASSES = ("LibraryImport",)
RESOURCE_IMPORT_CLASSES = ("ResourceImport",)
SETTING_SECTION_CLASSES = ("SettingSection",)


@_convert_ast_to_indexer
def iter_nodes(ast, accept_class: Union[Tuple[str, ...], str]) -> Iterator[NodeInfo]:
    """
    Note: always recursive.
    """
    if not isinstance(accept_class, (list, tuple, set)):
        accept_class = (accept_class,)

    for classname in accept_class:
        yield from ast.iter_indexed(classname)


def iter_all_nodes(ast, recursive=True) -> Iterator[NodeInfo]:
    """
    Note: use this *very* sparingly as no caching will take place
    (as all nodes need to be iterated).

    Use one of the filtered APIs whenever possible as those are cached
    by the type.
    """
    for stack, node in _iter_nodes(ast, recursive=recursive):
        yield NodeInfo(tuple(stack), node)


def is_library_node_info(node_info: NodeInfo) -> bool:
    return node_info.node.__class__.__name__ in LIBRARY_IMPORT_CLASSES


def is_resource_node_info(node_info: NodeInfo) -> bool:
    return node_info.node.__class__.__name__ in RESOURCE_IMPORT_CLASSES


def is_setting_section_node_info(node_info: NodeInfo) -> bool:
    return node_info.node.__class__.__name__ in SETTING_SECTION_CLASSES


@_convert_ast_to_indexer
def iter_library_imports(ast) -> Iterator[NodeInfo[ILibraryImportNode]]:
    yield from ast.iter_indexed("LibraryImport")


@_convert_ast_to_indexer
def iter_resource_imports(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("ResourceImport")


@_convert_ast_to_indexer
def iter_variable_imports(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("VariablesImport")


@_convert_ast_to_indexer
def iter_keywords(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("Keyword")


@_convert_ast_to_indexer
def iter_variables(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("Variable")


@_convert_ast_to_indexer
def iter_tests(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("TestCase")


@_convert_ast_to_indexer
def iter_test_case_sections(ast) -> Iterator[NodeInfo]:
    yield from ast.iter_indexed("TestCaseSection")


def iter_keyword_arguments_as_str(ast) -> Iterator[str]:
    for token in iter_keyword_arguments_as_tokens(ast):
        yield str(token)


@_convert_ast_to_indexer
def iter_keyword_arguments_as_tokens(ast) -> Iterator[IRobotToken]:
    """
    :rtype: generator(Token)
    """
    for node_info in ast.iter_indexed("Arguments"):
        for token in node_info.node.tokens:
            if token.type == token.ARGUMENT:
                yield token


def is_deprecated(ast) -> bool:
    from robotframework_ls.impl.text_utilities import has_deprecated_text

    docs = get_documentation_raw(ast)
    return has_deprecated_text(docs)


def get_documentation_raw(ast) -> str:
    doc: List[str] = []
    last_line: List[str] = []

    last_token = None
    for _stack, node in _iter_nodes_filtered_not_recursive(
        ast, accept_class="Documentation"
    ):
        for token in node.tokens:
            if last_token is not None and last_token.lineno != token.lineno:
                doc.extend(last_line)
                del last_line[:]

            last_token = token

            if token.type in (token.CONTINUATION, token.DOCUMENTATION):
                # Ignore anything before a continuation.
                del last_line[:]
                continue

            last_line.append(token.value)
        else:
            # Last iteration
            doc.extend(last_line)

    ret = "".join(doc).strip()
    return ret


def get_documentation_as_markdown(ast) -> str:
    documentation = get_documentation_raw(ast)
    if not documentation:
        return documentation
    try:
        from robotframework_ls import robot_to_markdown

        return robot_to_markdown.convert(documentation)
    except:
        log.exception("Error converting to markdown: %s", documentation)
        return documentation


def iter_variable_assigns(ast) -> Iterator:
    from robot.api import Token

    for stack, node in _iter_nodes(ast, recursive=False):
        if node.__class__.__name__ == "KeywordCall":
            for token in node.get_tokens(Token.ASSIGN):
                value = token.value
                i = value.rfind("}")
                if i > 0:
                    new_value = value[: i + 1]
                    token = Token(
                        type=token.type,
                        value=new_value,
                        lineno=token.lineno,
                        col_offset=token.col_offset,
                        error=token.error,
                    )

                yield TokenInfo(tuple(stack), node, token)


_FIXTURE_CLASS_NAMES = (
    "Setup",
    "Teardown",
    "SuiteSetup",
    "SuiteTeardown",
    "TestSetup",
    "TestTeardown",
)

_CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_TUPLE = _FIXTURE_CLASS_NAMES + (
    "TestTemplate",
    "Template",
)

CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_SET = frozenset(
    _CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_TUPLE
)


@_convert_ast_to_indexer
def iter_variable_references(ast) -> Iterator[TokenInfo]:
    # Note: we collect only the references, not the definitions here!
    for clsname in (
        "KeywordCall",
        "LibraryImport",
        "ResourceImport",
        "TestTimeout",
    ) + _CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_TUPLE:
        for node_info in ast.iter_indexed(clsname):
            stack = node_info.stack
            node = node_info.node
            token = None
            try:
                for token in node.tokens:
                    if token.type in (token.ARGUMENT, token.NAME):
                        for tok in tokenize_variables(token):
                            if tok.type == token.VARIABLE:
                                yield TokenInfo(stack, node, tok)
            except:
                log.exception("Unable to tokenize: %s", token)


@_convert_ast_to_indexer
def iter_keyword_usage_tokens(
    ast, collect_args_as_keywords: bool
) -> Iterator[KeywordUsageInfo]:
    """
    Iterates through all the places where a keyword name is being used, providing
    the stack, node, token and name.
    """

    cache_key = ("iter_keyword_usage_tokens", collect_args_as_keywords)
    yield from ast.iter_cached(
        cache_key, _iter_keyword_usage_tokens_uncached, collect_args_as_keywords
    )


def _same_line_col(tok1: IRobotToken, tok2: IRobotToken):
    return tok1.lineno == tok2.lineno and tok1.col_offset == tok2.col_offset


def _build_keyword_usage(
    stack, node, yield_only_for_token, current_tokens, found_at_index
) -> Optional[KeywordUsageInfo]:
    # Note: just check for line/col because the token could be changed
    # (for instance, an EOL ' ' could be added to the token).

    if yield_only_for_token is None or _same_line_col(
        yield_only_for_token, current_tokens[found_at_index]
    ):
        current_token = current_tokens[found_at_index]
        current_token = copy_token_replacing(current_token, type=current_token.KEYWORD)
        new_tokens = [current_token]
        new_tokens.extend(current_tokens[found_at_index + 1 :])

        return KeywordUsageInfo(
            stack,
            node.__class__(new_tokens),
            current_token,
            current_token.value,
            True,
        )
    return None


def _iter_keyword_usage_tokens_uncached_from_args(
    stack, node, args_as_keywords_handler, yield_only_for_token=None
):
    # We may have multiple matches, so, we need to setup the appropriate book-keeping
    current_tokens = []
    found_at_index = -1

    for token in node.tokens:
        if token.type == token.ARGUMENT:
            current_tokens.append(token)
            if args_as_keywords_handler.consider_current_argument_token_as_keyword(
                token
            ):
                found_at_index = len(current_tokens) - 1
            else:
                if args_as_keywords_handler.started_match:
                    del current_tokens[-1]  # Don't add the ELSE IF/ELSE argument.
                    usage_info = _build_keyword_usage(
                        stack,
                        node,
                        yield_only_for_token,
                        current_tokens,
                        found_at_index,
                    )
                    if usage_info is not None:
                        yield usage_info
                    current_tokens = []
                    found_at_index = -1
    else:
        # Do one last iteration at the end to deal with the last one.
        if found_at_index >= 0 and len(current_tokens) > found_at_index:
            usage_info = _build_keyword_usage(
                stack, node, yield_only_for_token, current_tokens, found_at_index
            )
            if usage_info is not None:
                yield usage_info


def _iter_keyword_usage_tokens_uncached(ast, collect_args_as_keywords):
    for clsname in ("KeywordCall",) + _CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_TUPLE:
        for node_info in ast.iter_indexed(clsname):
            stack = node_info.stack
            node = node_info.node
            usage_info = _create_keyword_usage_info(stack, node)
            if usage_info is not None:
                yield usage_info

                if collect_args_as_keywords:
                    args_as_keywords_handler = get_args_as_keywords_handler(
                        usage_info.node
                    )
                    if args_as_keywords_handler is None:
                        continue

                    yield from _iter_keyword_usage_tokens_uncached_from_args(
                        stack, node, args_as_keywords_handler
                    )


def _create_keyword_usage_info(stack, node) -> Optional[KeywordUsageInfo]:
    """
    If this is a keyword usage node, return information on it, otherwise,
    returns None.

    :note: this goes hand-in-hand with get_keyword_name_token.
    """
    from robot.api import Token

    if node.__class__.__name__ == "KeywordCall":
        token_type = Token.KEYWORD

    elif node.__class__.__name__ in CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_SET:
        token_type = Token.NAME

    else:
        return None

    node, token = _strip_node_and_token_bdd_prefix(node, token_type)
    if token is None:
        return None

    keyword_name = token.value
    if keyword_name.lower() == "none":
        return None
    return KeywordUsageInfo(tuple(stack), node, token, keyword_name)


def create_keyword_usage_info_from_token(
    stack: Tuple[INode, ...], node: INode, token: IRobotToken
) -> Optional[KeywordUsageInfo]:
    """
    If this is a keyword usage node, return information on it, otherwise,
    returns None.

    Note that it should return the keyword usage for the whole keyword call
    if we're in an argument that isn't itself a keyword call.
    """
    if token.type == token.ARGUMENT:
        args_as_keywords_handler = get_args_as_keywords_handler(node)
        if args_as_keywords_handler is not None:
            for v in _iter_keyword_usage_tokens_uncached_from_args(
                stack,
                node,
                args_as_keywords_handler,
                yield_only_for_token=token,
            ):
                return v

    return _create_keyword_usage_info(stack, node)


class _ConsiderArgsAsKeywordNames:
    def __init__(self, normalized_keyword_name, consider_keyword_at_index):
        self._normalized_keyword_name = normalized_keyword_name
        self._consider_keyword_at_index = consider_keyword_at_index
        self._current_arg = 0

        # Run Keyword If is special because it has 'ELSE IF' / 'ELSE'
        # which will then be be (cond, keyword) or just (keyword), so
        # we need to provide keyword usages as needed.
        self.multiple_matches = self._normalized_keyword_name == "runkeywordif"

        self._stack_kind = None
        self._stack = None
        self.started_match = False

    def consider_current_argument_token_as_keyword(self, token) -> bool:
        assert token.type == token.ARGUMENT

        self._current_arg += 1

        if self.multiple_matches:
            if token.value == "ELSE IF":
                self.started_match = True
                self._stack = []
                self._stack_kind = token.value
            elif token.value == "ELSE":
                self.started_match = True
                self._stack = []
                self._stack_kind = token.value

            else:
                self.started_match = False
                if self._stack is not None:
                    self._stack.append(token)

            if self._stack is not None:
                if self._stack_kind == "ELSE IF":
                    return len(self._stack) == 2

                if self._stack_kind == "ELSE":
                    return len(self._stack) == 1

        return self._current_arg == self._consider_keyword_at_index


def get_args_as_keywords_handler(node) -> Optional[_ConsiderArgsAsKeywordNames]:
    if isinstance_name(node, "KeywordCall"):
        node_keyword_name = node.keyword
        if node_keyword_name:
            normalized_keyword_name = normalize_robot_name(node_keyword_name)
            consider_keyword_at_index = KEYWORD_NAME_TO_KEYWORD_INDEX.get(
                normalized_keyword_name
            )
            if consider_keyword_at_index is not None:
                return _ConsiderArgsAsKeywordNames(
                    normalized_keyword_name, consider_keyword_at_index
                )
    return None


def get_keyword_name_token(
    stack: Tuple[INode, ...], node: INode, token: IRobotToken
) -> Optional[IRobotToken]:
    """
    If the given token is a keyword call name, return the token, otherwise return None.

    :note: this goes hand-in-hand with iter_keyword_usage_tokens.
    """
    if token.type == token.KEYWORD or (
        token.type == token.NAME
        and node.__class__.__name__ in CLASSES_WITH_ARGUMENTS_AS_KEYWORD_CALLS_AS_SET
    ):
        return _strip_token_bdd_prefix(token)

    if token.type == token.ARGUMENT and not token.value.strip().endswith("}"):
        args_as_keywords_handler = get_args_as_keywords_handler(node)
        if args_as_keywords_handler is not None:
            for _ in _iter_keyword_usage_tokens_uncached_from_args(
                stack,
                node,
                args_as_keywords_handler,
                yield_only_for_token=token,
            ):
                return token
    return None


def get_library_import_name_token(node, token: IRobotToken) -> Optional[IRobotToken]:
    """
    If the given ast node is a library import and the token is its name, return
    the name token, otherwise, return None.
    """

    if (
        token.type == token.NAME
        and isinstance_name(node, "LibraryImport")
        and node.name == token.value  # I.e.: match the name, not the alias.
    ):
        return token
    return None


def get_resource_import_name_token(node, token: IRobotToken) -> Optional[IRobotToken]:
    """
    If the given ast node is a library import and the token is its name, return
    the name token, otherwise, return None.
    """

    if (
        token.type == token.NAME
        and isinstance_name(node, "ResourceImport")
        and node.name == token.value  # I.e.: match the name, not the alias.
    ):
        return token
    return None


def get_variables_import_name_token(ast, token):
    """
    If the given ast node is a variables import and the token is its name, return
    the name token, otherwise, return None.
    """

    if (
        token.type == token.NAME
        and isinstance_name(ast, "VariablesImport")
        and ast.name == token.value  # I.e.: match the name, not the alias.
    ):
        return token
    return None


def _copy_of_node_replacing_token(node, token, token_type):
    """
    Workaround to create a new version of the same node but with the first
    occurrence of a token of the given type changed to another token.
    """
    new_tokens = list(node.tokens)
    for i, t in enumerate(new_tokens):
        if t.type == token_type:
            new_tokens[i] = token
            break
    return node.__class__(new_tokens)


def _strip_node_and_token_bdd_prefix(node, token_type):
    """
    This is a workaround because the parsing does not separate a BDD prefix from
    the keyword name. If the parsing is improved to do that separation in the future
    we can stop doing this.
    """
    original_token = node.get_token(token_type)
    if original_token is None:
        return node, None
    token = _strip_token_bdd_prefix(original_token)
    if token is original_token:
        # i.e.: No change was done.
        return node, token
    return _copy_of_node_replacing_token(node, token, token_type), token


def _strip_token_bdd_prefix(token):
    """
    This is a workaround because the parsing does not separate a BDD prefix from
    the keyword name. If the parsing is improved to do that separation in the future
    we can stop doing this.

    :return Token:
        Returns a new token with the bdd prefix stripped or the original token passed.
    """
    from robotframework_ls.impl.robot_constants import BDD_PREFIXES
    from robot.api import Token

    if token is None:
        return token

    text = token.value.lower()
    for prefix in BDD_PREFIXES:
        if text.startswith(prefix):
            new_name = token.value[len(prefix) :]
            return Token(
                type=token.type,
                value=new_name,
                lineno=token.lineno,
                col_offset=token.col_offset + len(prefix),
                error=token.error,
            )
    return token


def copy_token_replacing(token, **kwargs):
    from robot.api import Token

    new_kwargs = {
        "type": token.type,
        "value": token.value,
        "lineno": token.lineno,
        "col_offset": token.col_offset,
        "error": token.error,
    }
    new_kwargs.update(kwargs)
    return Token(**new_kwargs)


def _append_eol_to_prev_token(last_token, eol_token_contents):
    from robot.api import Token

    new_value = last_token.value + eol_token_contents

    return Token(
        type=last_token.type,
        value=new_value,
        lineno=last_token.lineno,
        col_offset=last_token.col_offset,
        error=last_token.error,
    )


def create_range_from_token(token) -> RangeTypedDict:

    start: PositionTypedDict = {"line": token.lineno - 1, "character": token.col_offset}
    end: PositionTypedDict = {
        "line": token.lineno - 1,
        "character": token.end_col_offset,
    }
    code_lens_range: RangeTypedDict = {"start": start, "end": end}
    return code_lens_range


def get_library_arguments_serialized(library) -> Optional[str]:
    return "::".join(library.args) if library.args else None
