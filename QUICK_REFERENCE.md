# DocGen Quick Reference

## Build & Install

```bash
cd /home/t0myam/claudes/docs-generator-app
npm install
npm run build
npm link  # Make globally available (optional)
```

## Usage Examples

### 1. Quick Start (Default Settings)

```bash
# Go to your project
cd /path/to/my-project

# Generate docs
docgen generate .

# Output will be in ./docs/
```

### 2. With Configuration File

```bash
# Initialize config
docgen init

# Edit docgen.config.yml as needed

# Generate with config
docgen generate .
```

### 3. Interactive Setup

```bash
docgen init --interactive
# Answer questions to customize config
```

### 4. With LLM Enhancement

```bash
# Ensure Ollama is running
ollama list

# Generate with AI descriptions
docgen generate . --llm
```

### 5. Custom Output Location

```bash
docgen generate . --output ~/my-bookshelf/docs/my-project
```

### 6. Incremental Updates

```bash
# After making changes to code
docgen update .

# Force regenerate everything
docgen update . --force
```

### 7. Clean & Regenerate

```bash
docgen generate . --clean --llm
```

## Command Cheat Sheet

| Command | What It Does |
|---------|--------------|
| `docgen init` | Create config file |
| `docgen generate <path>` | Generate documentation |
| `docgen update <path>` | Update changed files only |
| `docgen scan <path>` | Scan files (no docs) |
| `docgen analyze <path>` | Analyze code (no docs) |

## Common Options

| Option | Description |
|--------|-------------|
| `--config <path>` | Use custom config file |
| `--output <path>` | Output directory |
| `--llm` | Enable AI enhancement |
| `--llm-model <name>` | Specify LLM model |
| `--clean` | Clean output before generating |
| `--dry-run` | Preview without writing |
| `--force` | Force regeneration (update command) |
| `--no-tests` | Exclude test files |
| `--no-configs` | Exclude config files |
| `--verbose` | Verbose logging |
| `--debug` | Debug logging |

## Config File Template

```yaml
project:
  path: .
  name: My Project

files:
  include:
    - "src/**/*.{ts,tsx}"
  exclude:
    - "**/*.test.*"

output:
  path: ./docs
  structure: custom

llm:
  model: codellama:latest

generate:
  overview: true
  api: true
  components: true
```

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Ollama Not Available

```bash
# Check Ollama status
ollama list

# Start Ollama
ollama serve

# Download model
ollama pull codellama:latest
```

### No Files Found

```bash
# Check your include patterns in config
# Make sure patterns are correct for your project structure

# Example for Next.js:
files:
  include:
    - "app/**/*.{ts,tsx}"
    - "components/**/*.{ts,tsx}"
    - "lib/**/*.ts"
```

### Generated Docs Look Wrong

```bash
# Try with verbose mode
docgen generate . --verbose

# Check logs in .docgen-cache/logs/
```

## Output Structure

### Custom (Default)

```
docs/
├── overview.md
├── architecture.md
├── components/
│   ├── index.md
│   ├── button.md
│   └── input.md
├── functions/
│   ├── index.md
│   └── utils.md
└── types/
    ├── index.md
    └── types.md
```

### Mirror

```
docs/
├── src/
│   ├── components/
│   │   ├── button-button.md
│   │   └── input-input.md
│   └── utils/
│       └── helpers-formatDate.md
```

### Flat

```
docs/
├── src-components-button-button.md
├── src-components-input-input.md
├── src-utils-helpers-formatDate.md
```

## Integration with My Bookshelf

```bash
# Generate docs
docgen generate ./my-app

# Copy to My Bookshelf
cp -r ./my-app/docs/* ~/my-bookshelf/docs/my-app/

# Start My Bookshelf
cd ~/my-bookshelf
npm run dev

# View at http://localhost:3000
```

## Performance Tips

1. **Use cache** (enabled by default)
2. **Use `update` instead of `generate` for changes**
3. **Exclude test files** with `--no-tests`
4. **Increase parallel processing** in config:
   ```yaml
   performance:
     parallel: 8  # for powerful CPUs
   ```

## File Structure Reference

```
docs-generator-app/
├── src/
│   ├── cli/              # CLI commands
│   ├── core/
│   │   ├── analyzer/     # Code analysis
│   │   ├── config/       # Configuration
│   │   ├── generator/    # Markdown generation
│   │   └── scanner/      # File scanning
│   ├── llm/              # LLM integration
│   ├── templates/        # Handlebars templates
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── dist/                 # Build output
├── docs/                 # Generated docs (example)
└── examples/             # Example projects
```

## Verification Steps

```bash
# 1. Check build
ls -la dist/cli/index.js

# 2. Test help
node dist/cli/index.js --help

# 3. Test init
node dist/cli/index.js init --force

# 4. Check config created
cat docgen.config.yml

# 5. Test generation (dry run)
node dist/cli/index.js generate . --dry-run

# 6. Real generation
node dist/cli/index.js generate .

# 7. Check output
ls -la docs/
cat docs/overview.md
```

## Next Steps After Build

1. ✅ Build the project: `npm run build`
2. ✅ Test CLI: `node dist/cli/index.js --help`
3. ✅ Test on a sample project
4. ✅ Check generated docs quality
5. ✅ Try LLM enhancement with Ollama
6. ✅ Copy docs to My Bookshelf
7. ✅ Gather feedback and iterate

---

**Need help?** Check the full documentation in README.md and ARCHITECTURE.md
