interface GitignoreRule {
  negated: boolean;
  dirOnly: boolean;
  regex: RegExp;
}

export interface GitignoreMatcher {
  /**
   * Whether the given relative path is ignored by the parsed .gitignore.
   * `isDirectory` should be true when the path refers to a directory.
   */
  isIgnored(relativePath: string, isDirectory?: boolean): boolean;
}

/**
 * A small but practical .gitignore parser supporting comments, negation (!),
 * directory-only patterns (trailing /), root anchoring (leading /), and the
 * globs *, ** and ?. It follows git semantics: the last matching rule wins.
 */
export function parseGitignore(content: string): GitignoreMatcher {
  const rules: GitignoreRule[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trimEnd();
    if (line === '' || line.startsWith('#')) continue;

    let negated = false;
    if (line.startsWith('!')) {
      negated = true;
      line = line.slice(1);
    }
    if (line === '') continue;

    // Allow escaping an initial # or !.
    if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1);

    let dirOnly = false;
    if (line.endsWith('/')) {
      dirOnly = true;
      line = line.slice(0, -1);
    }
    if (line === '') continue;

    // A pattern containing a slash (or starting with one) is anchored to the
    // repository root; otherwise it matches at any depth.
    const anchored = line.startsWith('/') || line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    if (line === '') continue;

    rules.push({ negated, dirOnly, regex: patternToRegex(line, anchored) });
  }

  return {
    isIgnored(relativePath, isDirectory = false) {
      const segments = relativePath.split('/');
      let ignored = false;
      for (let depth = 0; depth < segments.length; depth++) {
        const candidate = segments.slice(0, depth + 1).join('/');
        const candidateIsDir = depth < segments.length - 1 || isDirectory;
        for (const rule of rules) {
          if (rule.dirOnly && !candidateIsDir) continue;
          if (rule.regex.test(candidate)) ignored = !rule.negated;
        }
      }
      return ignored;
    },
  };
}

function patternToRegex(pattern: string, anchored: boolean): RegExp {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === undefined) break;

    if (char === '*') {
      const isDoubleStar = pattern[i + 1] === '*';
      if (isDoubleStar) {
        const prev = pattern[i - 1];
        const next = pattern[i + 2];
        i += 1;
        if ((prev === undefined || prev === '/') && next === '/') {
          // **/ matches zero or more leading directories.
          out += '(?:.*/)?';
          i += 1;
        } else if (prev === undefined || prev === '/') {
          out += '.*';
        } else if (next === undefined) {
          // a/** matches "a" and everything inside it.
          out += '(?:/.*)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += escapeRegexChar(char);
    }
  }
  return new RegExp(`${anchored ? '^' : '(?:^|.*/)'}${out}$`);
}

function escapeRegexChar(char: string): string {
  return /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
}
