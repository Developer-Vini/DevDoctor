import path from 'node:path';
import ts from 'typescript';

export const MAX_FUNCTION_STATEMENTS = 50;
export const MAX_FUNCTION_LINES = 100;

export interface LargeFunction {
  file: string;
  line: number;
  name: string;
  statements: number;
  lines: number;
}

export interface UnreachableCode {
  file: string;
  line: number;
}

export interface SuspiciousCode {
  file: string;
  line: number;
  kind: 'eval' | 'new Function' | 'dynamic import';
}

export interface AstFindings {
  largeFunctions: LargeFunction[];
  unreachable: UnreachableCode[];
  suspicious: SuspiciousCode[];
}

/**
 * Analyzes one source file with the official TypeScript compiler (which also
 * parses JavaScript). Reports large function bodies, statements that are
 * obviously unreachable (after return/throw) and dynamic code execution
 * (eval, new Function, non-literal import()).
 */
export function analyzeSource(
  content: string,
  file: string,
  scriptKind: ts.ScriptKind,
): AstFindings {
  const findings: AstFindings = { largeFunctions: [], unreachable: [], suspicious: [] };
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind);

  function lineOf(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function checkFunction(node: ts.FunctionLikeDeclaration): void {
    const body = node.body;
    if (body === undefined || !ts.isBlock(body)) return;
    const statements = body.statements.length;
    const startLine = lineOf(node);
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const lineCount = endLine - startLine + 1;
    if (statements > MAX_FUNCTION_STATEMENTS || lineCount > MAX_FUNCTION_LINES) {
      findings.largeFunctions.push({
        file,
        line: startLine,
        name: functionName(node),
        statements,
        lines: lineCount,
      });
    }
  }

  function checkUnreachable(block: ts.Block): void {
    const statements = block.statements;
    for (let i = 0; i < statements.length - 1; i++) {
      const statement = statements[i];
      if (
        statement !== undefined &&
        (ts.isReturnStatement(statement) || ts.isThrowStatement(statement))
      ) {
        const next = statements[i + 1];
        if (next !== undefined) {
          findings.unreachable.push({ file, line: lineOf(next) });
        }
      }
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'eval'
    ) {
      findings.suspicious.push({ file, line: lineOf(node), kind: 'eval' });
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Function'
    ) {
      findings.suspicious.push({ file, line: lineOf(node), kind: 'new Function' });
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument !== undefined && !ts.isStringLiteral(argument)) {
        findings.suspicious.push({ file, line: lineOf(node), kind: 'dynamic import' });
      }
    }

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      checkFunction(node);
    }
    if (ts.isBlock(node)) {
      checkUnreachable(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

export function scriptKindFor(relativePath: string): ts.ScriptKind {
  const ext = path.extname(relativePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.mjs':
    case '.cjs':
    case '.js':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.JS;
  }
}

function functionName(node: ts.FunctionLikeDeclaration): string {
  const name = (node as ts.FunctionDeclaration | ts.MethodDeclaration).name;
  if (name !== undefined && ts.isIdentifier(name)) return name.text;
  return '<anonymous>';
}
