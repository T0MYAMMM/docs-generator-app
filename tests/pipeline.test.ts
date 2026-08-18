import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Scanner } from '../src/core/scanner/index.js';
import { analyzeFiles } from '../src/core/analyzer/index.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Scan the fixture directory with the same include patterns the CLI uses. */
function scanFixtures() {
  return new Scanner({
    rootDir: fixtures,
    patterns: {
      include: ['**/*.ts', '**/*.py'],
      exclude: ['**/node_modules/**'],
    },
    respectGitignore: false,
    includeTests: true,
  }).scan();
}

const projectMeta = { name: 'fixtures', path: fixtures, type: 'none' as const };

describe('scanner', () => {
  it('discovers both TypeScript and Python sources', async () => {
    const result = await scanFixtures();
    const names = result.files.map((f) => f.path.split('/').pop());

    expect(names).toContain('sample.ts');
    expect(names).toContain('sample.py');
  });
});

describe('analyzer', () => {
  it('extracts a documented TypeScript function with its signature', async () => {
    const scan = await scanFixtures();
    const { analysis } = await analyzeFiles(
      scan.files.filter((f) => f.path.endsWith('sample.ts')),
      projectMeta
    );

    const add = analysis.symbols.find((s) => s.name === 'add');
    expect(add).toBeDefined();
    expect(add?.parameters?.map((p) => p.name)).toEqual(['a', 'b']);
    expect(add?.returnType?.type).toBe('number');
  });

  it('extracts a TypeScript class', async () => {
    const scan = await scanFixtures();
    const { analysis } = await analyzeFiles(
      scan.files.filter((f) => f.path.endsWith('sample.ts')),
      projectMeta
    );

    expect(analysis.symbols.some((s) => s.name === 'Counter')).toBe(true);
  });

  it('parses Python docstrings into parameter metadata', async () => {
    const scan = await scanFixtures();
    const { analysis } = await analyzeFiles(
      scan.files.filter((f) => f.path.endsWith('sample.py')),
      projectMeta
    );

    const divide = analysis.symbols.find((s) => s.name === 'divide');
    expect(divide).toBeDefined();

    const denominator = divide?.parameters?.find((p) => p.name === 'denominator');
    expect(denominator?.optional).toBe(true);
  });
});

describe('generated markdown', () => {
  let outDir: string;

  beforeAll(() => {
    outDir = mkdtempSync(join(tmpdir(), 'docgen-test-'));
  });

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('writes markdown that is free of HTML entity escaping', async () => {
    const { execFileSync } = await import('node:child_process');
    const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli', 'index.mjs');

    // The CLI must be built first; skip rather than fail when it is not.
    if (!existsSync(cli)) return;

    execFileSync('node', [cli, 'generate', fixtures, '--output', outDir, '--clean'], {
      stdio: 'pipe',
    });

    const overview = readFileSync(join(outDir, 'overview.md'), 'utf8');
    // Markdown is not HTML — entities would render literally inside code fences.
    expect(overview).not.toMatch(/&#x[0-9A-Fa-f]+;/);
    expect(overview).not.toMatch(/&quot;|&#39;/);
  });
});
