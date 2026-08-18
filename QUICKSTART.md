# DocGen - Quick Start Guide

Get started with DocGen in 5 minutes!

## Step 1: Prerequisites

### Install Ollama

```bash
# Install Ollama (MacOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Windows: Download from https://ollama.com/download
```

### Download a Code Model

```bash
# Download CodeLlama (recommended)
ollama pull codellama:latest

# Verify it works
ollama run codellama:latest "Say hello"
```

### Verify Node.js

```bash
node --version
# Should be v20.0.0 or higher
```

## Step 2: Install DocGen

```bash
# Clone the repository (or download the source)
git clone <repository-url> docgen
cd docgen

# Install dependencies
npm install

# Build the project
npm run build

# Make globally available (optional)
npm link
```

## Step 3: Test It Out

### Quick Test on Your Project

```bash
# Navigate to your project directory
cd /path/to/your/project

# Create a config file (optional)
cat > docgen.config.yml << EOF
files:
  include:
    - "src/**/*.{ts,tsx,js,jsx}"
    - "app/**/*.{ts,tsx}"
    - "components/**/*.{ts,tsx}"
    - "lib/**/*.ts"
  exclude:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "**/node_modules/**"

output:
  path: ./docs

llm:
  model: codellama:latest
  temperature: 0.3

generate:
  overview: true
  api: true
  components: true
EOF

# Run DocGen
docgen generate .
```

## Step 4: Verify Output

```bash
# Check generated docs
ls docs-generated/

# Expected structure:
# docs-generated/
# ├── overview.md
# ├── components/
# │   ├── doc-viewer.md
# │   ├── sidebar.md
# │   └── ...
# ├── lib/
# │   ├── docs.md
# │   ├── markdown.md
# │   └── ...
# └── app/
#     └── ...
```

## Step 5: Use Generated Documentation

### Option 1: View in My Bookshelf

```bash
# Copy generated docs to My Bookshelf
cp -r docs/* /path/to/my-bookshelf/docs/my-project/

# Start My Bookshelf
cd /path/to/my-bookshelf
npm run dev

# View at http://localhost:3000
```

### Option 2: Use with Other Documentation Viewers

The generated markdown files are compatible with:
- GitHub/GitLab READMEs
- Docusaurus
- VuePress
- MkDocs
- Any markdown viewer

## Configuration Tips

### Minimal Config

```yaml
# docgen.config.yml
output:
  path: ./docs

llm:
  model: codellama:latest
```

### Full Config

See [docgen.config.example.yml](./docgen.config.example.yml) for all options.

## Common Commands

```bash
# Generate docs
docgen scan ./project

# Update existing docs (incremental)
docgen update ./project

# Initialize config file
docgen init

# Preview docs
docgen serve ./docs

# Dry run (preview without generating)
docgen scan ./project --dry-run

# Use different model
docgen scan ./project --model deepseek-coder:6.7b

# More parallel processing
docgen scan ./project --parallel 8

# Debug mode
docgen scan ./project --debug
```

## Troubleshooting

### Ollama not running

```bash
# Check Ollama status
ollama list

# If not running, start it
ollama serve
```

### Model not found

```bash
# List available models
ollama list

# Download model
ollama pull codellama:latest
```

### Permission errors

```bash
# Make CLI executable
chmod +x dist/cli/index.js

# Or run via npm
npm run docgen scan ./project
```

### TypeScript parsing errors

```bash
# Enable debug mode to see details
docgen scan --debug ./project

# Check logs
cat .docgen-cache/logs/latest.log
```

## Performance Tips

### First Run (Slow)
- Scans entire project
- Parses all files
- Calls LLM for all symbols
- Expect: 20-40 minutes for medium project

### Subsequent Runs (Fast)
```bash
# Use update instead of scan
docgen update ./project

# Uses cache, only regenerates changed files
# Expect: 2-5 minutes
```

### Optimize for Speed

```yaml
# docgen.config.yml
performance:
  parallel: 8        # More parallel LLM calls
  cache: true        # Use cache (default)

llm:
  model: codellama:latest  # Faster than larger models
```

## Example Workflow

### 1. Initial Documentation

```bash
# First time: full generation
docgen scan ./my-app

# Review output
ls ./my-app/docs/

# Copy to My Bookshelf
cp -r ./my-app/docs/* ~/my-bookshelf/docs/my-app/
```

### 2. After Code Changes

```bash
# Update only changed files
docgen update ./my-app

# Auto-sync to My Bookshelf
cp -r ./my-app/docs/* ~/my-bookshelf/docs/my-app/
```

### 3. Custom Templates

```bash
# Create custom template
mkdir templates
cat > templates/my-component.hbs << 'EOF'
---
title: "{{name}}"
description: "{{summary}}"
tags: ["component", "react"]
---

# {{name}}

{{description}}

## Usage
\`\`\`tsx
<{{name}} {...props} />
\`\`\`
EOF

# Use it
docgen scan --template component=./templates/my-component.hbs
```

## Next Steps

1. ✅ Read [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for implementation phases
2. ✅ Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. ✅ See [README.md](./README.md) for detailed documentation
4. 🚀 Start building! (Phase 1: Scanner module)

## Getting Help

### Check Logs

```bash
# Latest log
cat .docgen-cache/logs/latest.log

# All logs
ls .docgen-cache/logs/
```

### Enable Verbose Mode

```bash
docgen scan --verbose ./project
```

### Debug Mode

```bash
docgen scan --debug ./project
# Outputs detailed information about each step
```

## What's Next?

Once setup is complete, you'll start implementing:

**Phase 1 (Week 1):** Scanner + Parser
- File traversal
- TypeScript parsing
- Symbol extraction

**Phase 2 (Week 2):** Static Analysis
- Type resolution
- Comment extraction
- Pattern detection

**Phase 3 (Week 3):** LLM Integration
- Ollama client
- Prompt engineering
- Response parsing

**Phase 4 (Week 4):** Markdown Generation
- Template engine
- Frontmatter generation
- File organization

**Phase 5-6 (Week 5-6):** Polish & Integration
- CLI improvements
- Testing
- My Bookshelf integration

---

**Ready to start?** Let's begin with Phase 1: Building the Scanner Module!
