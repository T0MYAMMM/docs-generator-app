import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/cli/index.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'node20',
  outDir: 'dist',
  // Mark TypeScript as external to avoid bundling issues with dynamic requires
  external: ['typescript'],
  // Don't bundle Node.js built-ins
  noExternal: [],
  // Copy Python scripts and templates after build
  onSuccess: async () => {
    // Copy Python scripts
    const pythonDir = join('dist', 'python');
    mkdirSync(pythonDir, { recursive: true });
    copyFileSync(
      join('src', 'core', 'analyzer', 'python', 'ast_parser.py'),
      join(pythonDir, 'ast_parser.py')
    );
    console.log('✓ Copied Python scripts to dist/python');

    // Copy all template files
    const templatesDir = join('dist', 'templates');
    mkdirSync(templatesDir, { recursive: true });
    const templateFiles = readdirSync(join('src', 'templates')).filter(f => f.endsWith('.hbs'));
    for (const file of templateFiles) {
      copyFileSync(
        join('src', 'templates', file),
        join(templatesDir, file)
      );
    }
    console.log(`✓ Copied ${templateFiles.length} template files to dist/templates`);
  },
});
