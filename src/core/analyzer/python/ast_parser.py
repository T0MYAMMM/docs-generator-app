#!/usr/bin/env python3
"""
Python AST Parser Bridge for DocGen

Parses Python source files using the built-in ast module and outputs
JSON-serialized AST data for consumption by the Node.js docgen application.

This script is called as a subprocess by the TypeScript Python AST parser wrapper.
"""

import ast
import json
import sys
from typing import Dict, List, Any, Optional, Union


def extract_decorators(node: Union[ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef]) -> List[str]:
    """Extract decorator names from a function or class node."""
    if not hasattr(node, 'decorator_list'):
        return []

    decorators = []
    for dec in node.decorator_list:
        if isinstance(dec, ast.Name):
            decorators.append(dec.id)
        elif isinstance(dec, ast.Call):
            if isinstance(dec.func, ast.Name):
                decorators.append(dec.func.id)
            elif isinstance(dec.func, ast.Attribute):
                decorators.append(f"{ast.unparse(dec.func.value)}.{dec.func.attr}")
        elif isinstance(dec, ast.Attribute):
            decorators.append(f"{ast.unparse(dec.value)}.{dec.attr}")
        else:
            try:
                decorators.append(ast.unparse(dec))
            except:
                decorators.append(str(dec))

    return decorators


def extract_parameters(args: ast.arguments) -> List[Dict[str, Any]]:
    """Extract function parameters with type hints and defaults."""
    params = []

    # Regular positional/keyword arguments
    num_defaults = len(args.defaults)
    num_args = len(args.args)
    defaults_offset = num_args - num_defaults

    for i, arg in enumerate(args.args):
        param = {
            'name': arg.arg,
            'type': extract_annotation(arg.annotation),
            'optional': False,
            'default': None,
        }

        # Check if this arg has a default value
        if i >= defaults_offset:
            default_idx = i - defaults_offset
            try:
                param['default'] = ast.unparse(args.defaults[default_idx])
                param['optional'] = True
            except:
                param['default'] = '<unparsable>'
                param['optional'] = True

        params.append(param)

    # *args (variable positional arguments)
    if args.vararg:
        params.append({
            'name': args.vararg.arg,
            'type': extract_annotation(args.vararg.annotation),
            'optional': True,
            'is_var_args': True,
        })

    # **kwargs (variable keyword arguments)
    if args.kwarg:
        params.append({
            'name': args.kwarg.arg,
            'type': extract_annotation(args.kwarg.annotation),
            'optional': True,
            'is_kw_args': True,
        })

    return params


def extract_annotation(annotation: Optional[ast.AST]) -> Optional[str]:
    """Extract type annotation as a string."""
    if annotation is None:
        return None
    try:
        return ast.unparse(annotation)
    except:
        return str(annotation)


def extract_function_info(node: Union[ast.FunctionDef, ast.AsyncFunctionDef]) -> Dict[str, Any]:
    """Extract comprehensive function/method information."""
    return {
        'type': 'async_function' if isinstance(node, ast.AsyncFunctionDef) else 'function',
        'name': node.name,
        'lineno': node.lineno,
        'end_lineno': node.end_lineno if hasattr(node, 'end_lineno') else node.lineno,
        'decorators': extract_decorators(node),
        'parameters': extract_parameters(node.args),
        'returns': extract_annotation(node.returns),
        'docstring': ast.get_docstring(node),
        'is_async': isinstance(node, ast.AsyncFunctionDef),
    }


def extract_class_info(node: ast.ClassDef) -> Dict[str, Any]:
    """Extract class information including methods, properties, and class variables."""
    bases = []
    for base in node.bases:
        try:
            bases.append(ast.unparse(base))
        except:
            bases.append(str(base))

    methods = []
    properties = []
    class_vars = []

    # Iterate through class body
    for item in node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
            method_info = extract_function_info(item)

            # Check if it's a property
            if '@property' in method_info['decorators'] or 'property' in method_info['decorators']:
                properties.append(method_info)
            else:
                # Mark special method types
                method_info['is_static'] = '@staticmethod' in method_info['decorators'] or 'staticmethod' in method_info['decorators']
                method_info['is_class_method'] = '@classmethod' in method_info['decorators'] or 'classmethod' in method_info['decorators']
                methods.append(method_info)

        elif isinstance(item, ast.AnnAssign):
            # Annotated class variable
            target_name = item.target.id if isinstance(item.target, ast.Name) else str(item.target)
            class_vars.append({
                'name': target_name,
                'type': extract_annotation(item.annotation),
                'value': ast.unparse(item.value) if item.value else None,
            })

        elif isinstance(item, ast.Assign):
            # Regular assignment
            for target in item.targets:
                if isinstance(target, ast.Name):
                    class_vars.append({
                        'name': target.id,
                        'type': None,
                        'value': ast.unparse(item.value) if item.value else None,
                    })

    return {
        'type': 'class',
        'name': node.name,
        'lineno': node.lineno,
        'end_lineno': node.end_lineno if hasattr(node, 'end_lineno') else node.lineno,
        'bases': bases,
        'decorators': extract_decorators(node),
        'methods': methods,
        'properties': properties,
        'class_vars': class_vars,
        'docstring': ast.get_docstring(node),
    }


def extract_module_vars(node: ast.AST) -> List[Dict[str, Any]]:
    """Extract module-level variables and constants."""
    vars_list = []

    if isinstance(node, ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name):
                try:
                    value_str = ast.unparse(node.value) if node.value else None
                except:
                    value_str = '<unparsable>'

                vars_list.append({
                    'type': 'variable',
                    'name': target.id,
                    'lineno': node.lineno,
                    'value': value_str,
                })

    elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        try:
            value_str = ast.unparse(node.value) if node.value else None
        except:
            value_str = '<unparsable>'

        vars_list.append({
            'type': 'variable',
            'name': node.target.id,
            'lineno': node.lineno,
            'type_annotation': extract_annotation(node.annotation),
            'value': value_str,
        })

    return vars_list


def extract_imports(node: ast.AST) -> List[Dict[str, Any]]:
    """Extract import statements for dependency analysis."""
    imports = []

    if isinstance(node, ast.Import):
        for alias in node.names:
            imports.append({
                'type': 'import',
                'module': alias.name,
                'alias': alias.asname,
            })

    elif isinstance(node, ast.ImportFrom):
        imports.append({
            'type': 'from',
            'from': node.module,
            'names': [n.name for n in node.names],
            'level': node.level,  # Relative import level (0 for absolute)
        })

    return imports


def parse_python_file(file_path: str) -> Dict[str, Any]:
    """
    Parse a Python file and extract all symbols (functions, classes, variables, imports).

    Returns a dictionary with:
    - success: bool
    - file_path: str
    - module_docstring: str | None
    - functions: List[Dict]
    - classes: List[Dict]
    - variables: List[Dict]
    - imports: List[Dict]
    - error: str (if success is False)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()

        # Parse the Python source code into an AST
        tree = ast.parse(source_code, filename=file_path)

        result = {
            'success': True,
            'file_path': file_path,
            'module_docstring': ast.get_docstring(tree),
            'functions': [],
            'classes': [],
            'variables': [],
            'imports': [],
        }

        # Walk through the AST and extract top-level definitions
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                result['functions'].append(extract_function_info(node))

            elif isinstance(node, ast.ClassDef):
                result['classes'].append(extract_class_info(node))

            elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                vars_from_node = extract_module_vars(node)
                result['variables'].extend(vars_from_node)

            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                imports_from_node = extract_imports(node)
                result['imports'].extend(imports_from_node)

        return result

    except SyntaxError as e:
        return {
            'success': False,
            'file_path': file_path,
            'error': 'SyntaxError',
            'message': str(e),
            'lineno': e.lineno,
            'offset': e.offset,
            'text': e.text,
        }

    except Exception as e:
        return {
            'success': False,
            'file_path': file_path,
            'error': type(e).__name__,
            'message': str(e),
        }


def main():
    """Main entry point when called as a script."""
    if len(sys.argv) != 2:
        error_result = {
            'success': False,
            'error': 'InvalidUsage',
            'message': 'Usage: ast_parser.py <file_path>'
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

    file_path = sys.argv[1]
    result = parse_python_file(file_path)

    # Output JSON to stdout
    print(json.dumps(result, indent=2))

    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
