# Changelog

All notable changes to DocGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Watch mode for auto-regeneration
- Serve command for local preview
- Multi-language support (Python, Go, Rust)
- VSCode extension
- GitHub Action
- Enhanced caching strategies

## [0.1.0] - 2025-12-17

### Added - Beta Release

#### Core Features
- **Scanner Module** - File discovery with .gitignore support
- **Analyzer Module** - AST parsing and symbol extraction
- **Generator Module** - Markdown documentation generation
- **LLM Integration** - Local AI enhancement via Ollama
- **Template System** - Handlebars-based customizable templates

#### CLI Commands
- `docgen init` - Initialize configuration file
- `docgen scan` - Scan project files
- `docgen analyze` - Analyze code and extract symbols
- `docgen generate` - Generate complete documentation
- `docgen update` - Incremental documentation updates

#### Configuration
- YAML-based configuration files
- Default config discovery (`docgen.config.yml`, `.docgenrc.yml`)
- Interactive configuration setup
- Config validation with helpful error messages

#### Documentation Features
- Function documentation with parameters and return types
- React component documentation with props
- TypeScript type/interface documentation
- Class documentation with methods
- Project overview generation
- Architecture documentation
- My Bookshelf-compatible frontmatter

#### Output Organization
- Custom structure (by symbol type)
- Mirror source structure
- Flat structure
- Flexible file organization

#### Developer Experience
- Colored terminal output
- Progress indicators (spinners)
- Verbose and debug logging modes
- Dry-run mode for previewing
- Comprehensive error messages
- Force regeneration option

#### Templates
- `function.hbs` - Function documentation template
- `component.hbs` - React component template
- `type.hbs` - TypeScript type template
- `overview.hbs` - Project overview template

#### Type System
- Complete TypeScript type definitions
- Exported types for programmatic usage
- Type-safe configuration

#### Documentation
- Comprehensive README.md
- Architecture documentation (ARCHITECTURE.md)
- Development plan (DEVELOPMENT_PLAN.md)
- Quick start guide (QUICKSTART.md)
- Quick reference (QUICK_REFERENCE.md)
- API documentation (API.md)
- Contributing guidelines (CONTRIBUTING.md)

### Technical Details

#### Supported Languages
- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)
- JSDoc/TSDoc comments

#### Supported Frameworks
- React (components, hooks)
- Next.js (App Router, Pages, API routes)
- Node.js

#### LLM Support
- Ollama integration
- CodeLlama model support
- DeepSeek Coder support
- Qwen2.5 Coder support
- Configurable temperature and max tokens
- Batch processing with parallelization

#### Performance
- Parallel LLM calls
- File system caching
- Incremental updates
- Smart change detection

### Dependencies

#### Runtime Dependencies
- commander ^11.1.0 - CLI framework
- ora ^8.0.1 - Terminal spinners
- chalk ^5.3.0 - Colored output
- enquirer ^2.4.1 - Interactive prompts
- glob ^10.3.10 - File pattern matching
- gray-matter ^4.0.3 - Frontmatter parsing
- handlebars ^4.7.8 - Template engine
- ollama ^0.5.0 - LLM integration
- yaml ^2.3.4 - YAML parsing
- ignore ^5.3.0 - .gitignore support

#### Dev Dependencies
- typescript ^5.3.3
- tsup ^8.0.1 - Build tool
- vitest ^1.1.1 - Testing framework
- eslint ^8.56.0 - Linting
- prettier ^3.1.1 - Code formatting

### System Requirements
- Node.js >= 20.0.0
- Ollama (for LLM features)
- 2GB+ RAM recommended
- Linux, macOS, or Windows

### Known Limitations
- Only TypeScript/JavaScript supported (multi-language coming soon)
- No watch mode yet
- No serve command yet
- Basic caching implementation
- No diagram generation yet

### Breaking Changes
None (initial release)

### Deprecations
None (initial release)

### Security
- No external API calls (fully local)
- Respects .gitignore for privacy
- No code execution (only AST parsing)
- Path validation to prevent traversal attacks

## Development Phases

### Phase 1: Scanner & Parser ✅
- File discovery and classification
- TypeScript/JavaScript parsing
- Symbol extraction basics

### Phase 2: Static Analysis ✅
- Advanced symbol extraction
- Comment parsing
- Pattern detection
- Type resolution

### Phase 3: LLM Integration ✅
- Ollama client
- Prompt engineering
- Batch processing
- Response parsing

### Phase 4: Markdown Generation ✅
- Template system
- Frontmatter generation
- File organization
- Documentation formatting

### Phase 5: CLI Polish ✅
- Configuration system
- Command improvements
- Progress feedback
- Error handling

### Phase 6: Testing & Integration ✅
- Validation
- Documentation
- Beta testing
- Release preparation

## Future Versions

### [0.2.0] - Planned
- Watch mode implementation
- Serve command for preview
- Enhanced caching
- Performance improvements
- Bug fixes from beta feedback

### [0.3.0] - Planned
- Python support
- Go support
- Diagram generation (Mermaid)
- VSCode extension (alpha)

### [1.0.0] - Planned
- Stable release
- Production-ready
- Complete test coverage
- Multi-language support
- Plugin system

---

## Upgrade Guide

### From 0.0.x to 0.1.0
This is the initial beta release. If you were using development versions:

1. Update dependencies: `npm install docgen@latest`
2. Update config file format (if using old format)
3. Run `docgen init` to create new config
4. Test generation: `docgen generate . --dry-run`
5. Generate docs: `docgen generate .`

---

## Support

- Issues: https://github.com/yourusername/docgen/issues
- Discussions: https://github.com/yourusername/docgen/discussions
- Documentation: See README.md and API.md

---

**Legend:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security fixes
