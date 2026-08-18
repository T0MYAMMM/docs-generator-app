# DocGen

Generate reference documentation from a TypeScript, JavaScript, or Python
codebase — locally, with no API keys and no data leaving your machine.

DocGen reads your source with a real AST parser, extracts what is already there
(signatures, types, docstrings, JSDoc, decorators), and writes it out as
markdown with YAML frontmatter. A local LLM is optional: turn it on and it fills
in prose for symbols that lack comments; leave it off and DocGen is a fast,
fully deterministic static analyser.

## Why

Documentation generators tend to sit at one of two extremes. Pure static tools
produce accurate but lifeless output. LLM-only tools write nice prose and
hallucinate signatures. DocGen splits the work: static analysis owns everything
factual, and the model only ever writes description.

## Install

Requires Node.js 20 or newer.

```bash
git clone https://github.com/T0MYAMMM/docs-generator-app.git
cd docs-generator-app
npm install
npm run build
npm link          # optional — puts `docgen` on your PATH
```

## Usage

```bash
docgen generate ./src --output ./docs
```

That is the whole happy path. Point it at a directory, get markdown out.

```bash
docgen scan      ./src              # list what would be analysed
docgen analyze   ./src              # extract symbols, print a summary
docgen generate  ./src --dry-run    # preview without writing
docgen init                         # write a docgen.config.yml
docgen update    ./src              # regenerate only what changed
```

### Useful flags

| Flag | Effect |
|---|---|
| `--output <path>` | Where to write docs (default `./docs`) |
| `--clean` | Empty the output directory first |
| `--dry-run` | Report what would be written, write nothing |
| `--no-tests` | Skip test files |
| `--no-configs` | Skip config files |
| `--no-gitignore` | Analyse files your `.gitignore` excludes |
| `--llm` | Enhance descriptions with a local LLM |
| `--llm-model <name>` | Model to use (default `codellama:latest`) |

### Optional: LLM enhancement

Only needed for `--llm`. DocGen talks to [Ollama](https://ollama.com) on
localhost; nothing is sent anywhere else.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull codellama
docgen generate ./src --llm
```

Use an instruct or code model. Reasoning models that emit `<think>` blocks
(deepseek-r1, qwq) are handled safely — their reasoning is stripped rather than
written into your docs — but they will not produce useful descriptions under the
short token budget used for summaries.

Enhancement only touches symbols that lack a docstring or JSDoc comment.
Anything you have already documented is left exactly as written.

**Review what it writes.** Small models infer behaviour from a signature and
will state it confidently even when wrong — a 1.5B model described a pure
`add_numbers(a, b)` as mutating its first argument and returning nothing.
Static analysis is the trustworthy half of this tool; LLM prose is a draft for
a human to check, which is why it never overwrites documentation you wrote
yourself.

## What it produces

```
docs/
├── index.md          # navigation
├── overview.md       # project statistics and dependencies
├── architecture.md   # detected structure and patterns
├── functions/
├── classes/
├── components/
└── misc/
```

Every file carries YAML frontmatter (`title`, `description`, `tags`, `date`,
`category`), so the output drops straight into most markdown doc sites.

A Python function with a Google-style docstring becomes:

````markdown
# restock

Increase an item's quantity.

## Function Signature

```python
def restock(item: Item, amount: int = 1) -> Item
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `item` | `Item` | Yes | - | The item to restock. |
| `amount` | `int` | No | `1` | How many units to add. Defaults to 1. |
````

## What it understands

**TypeScript / JavaScript** — functions, classes, interfaces, types, React
components and their props, JSDoc comments, exports and imports.

**Python** — functions, classes, dataclasses, decorators, type hints, and
Google-, NumPy- and Sphinx-style docstrings parsed into parameter tables.

**Frameworks** — additional pattern detection for Airflow DAGs and operators,
surfaced in a dedicated overview.

## Configuration

`docgen init` writes a `docgen.config.yml`. Everything is optional; CLI flags
win over the file.

```yaml
files:
  include: ["src/**/*.ts", "src/**/*.py"]
  exclude: ["**/node_modules/**", "**/*.test.ts"]

output:
  path: ./docs

llm:
  enabled: false
  model: codellama:latest
```

See [`docgen.config.example.yml`](docgen.config.example.yml) for the full set.

## Development

```bash
npm run dev        # rebuild on change
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint
```

Generated documentation is gitignored on purpose — DocGen documents whatever
codebase you point it at, and that output does not belong in this repository.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the pipeline fits together
- [API.md](API.md) — using DocGen as a library rather than a CLI
- [CONTRIBUTING.md](CONTRIBUTING.md) — development setup and conventions
- [TESTING.md](TESTING.md) — test layout and how to add cases

## License

MIT — see [LICENSE](LICENSE).
