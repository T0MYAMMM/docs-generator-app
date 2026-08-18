/**
 * Generator Module
 *
 * Main documentation generator that orchestrates markdown generation from analyzed code.
 */

import {
  ProjectAnalysis,
  Symbol,
  DocGenConfig,
  GeneratedDoc,
  GenerationResult,
  AIGeneratedContent,
  CodeExample,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { generateFrontmatter, generateOverviewFrontmatter, serializeFrontmatter } from './frontmatter-generator.js';
import {
  buildFunctionMarkdown,
  buildComponentMarkdown,
  buildClassMarkdown,
  buildTypeMarkdown,
} from './markdown-builder.js';
import { FileOrganizer } from './file-organizer.js';
import { TemplateEngine } from './template-engine.js';

/**
 * Documentation generator
 */
export class Generator {
  private fileOrganizer: FileOrganizer;
  private templateEngine: TemplateEngine;

  constructor(private config: DocGenConfig) {
    this.fileOrganizer = new FileOrganizer(config.output);
    this.templateEngine = new TemplateEngine(config.templates?.['_base']);
  }

  /**
   * Generate documentation from project analysis
   */
  async generate(
    analysis: ProjectAnalysis,
    aiContent?: Map<string, AIGeneratedContent>
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const documents: GeneratedDoc[] = [];
    const errors: Error[] = [];

    logger.info('Starting documentation generation...');

    try {
      // Clean output directory if configured
      if (this.config.output.clean) {
        await this.fileOrganizer.clean();
      }

      // Generate overview document
      if (this.config.generate.overview) {
        try {
          const overviewDoc = await this.generateOverview(analysis, aiContent);
          documents.push(overviewDoc);
        } catch (error) {
          logger.error('Failed to generate overview:', error);
          errors.push(error as Error);
        }
      }

      // Generate architecture document
      if (this.config.generate.architecture) {
        try {
          const archDoc = await this.generateArchitecture(analysis, aiContent);
          documents.push(archDoc);
        } catch (error) {
          logger.error('Failed to generate architecture:', error);
          errors.push(error as Error);
        }
      }

      // Generate symbol documentation
      for (const symbol of analysis.symbols) {
        try {
          // Skip non-exported symbols unless configured otherwise
          if (!symbol.exported && !this.config.behavior.verbose) {
            continue;
          }

          const doc = await this.generateSymbolDoc(symbol, aiContent?.get(symbol.id), analysis.project.path);
          documents.push(doc);
        } catch (error) {
          logger.error(`Failed to generate doc for ${symbol.name}:`, error);
          errors.push(error as Error);
        }
      }

      // Write all documents
      logger.info(`Writing ${documents.length} documents...`);
      const { written, failed } = await this.fileOrganizer.writeDocuments(documents);

      const duration = Date.now() - startTime;

      logger.info(`Generation complete: ${written} files written, ${failed} failed in ${duration}ms`);

      return {
        filesGenerated: written,
        filesSkipped: failed,
        errors,
        documents,
        duration,
      };
    } catch (error) {
      logger.error('Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate overview document
   */
  private async generateOverview(
    analysis: ProjectAnalysis,
    aiContent?: Map<string, AIGeneratedContent>
  ): Promise<GeneratedDoc> {
    const { project, patterns } = analysis;

    // Get AI-generated summary if available
    const overviewContent = aiContent?.get('overview');
    const summary = overviewContent?.summary || `Documentation for ${project.name}`;

    // Check if this is an Airflow project
    const isAirflow = project.framework === 'airflow';

    if (isAirflow) {
      // Use Airflow overview template
      const airflowData = this.prepareAirflowOverviewData(analysis);
      const content = await this.templateEngine.render('airflow-overview', airflowData);

      const frontmatter = {
        title: `${project.name} - Airflow Project Overview`,
        description: project.description || summary,
        tags: ['airflow', 'data-pipelines', 'workflow-orchestration', 'auto-generated'],
        date: new Date().toISOString().split('T')[0],
        author: this.config.frontmatter?.author || 'DocGen',
        category: 'overview',
      };

      const path = this.fileOrganizer.getOverviewPath(project.name);

      return {
        path,
        frontmatter,
        content,
      };
    }

    // Generate frontmatter
    const frontmatter = generateOverviewFrontmatter(
      project.name,
      summary,
      {
        author: this.config.frontmatter?.author,
        defaultTags: this.config.frontmatter?.defaultTags,
      }
    );

    // Build content
    const content = [
      serializeFrontmatter(frontmatter),
      `# ${project.name}`,
      '',
      summary,
      '',
      '## Project Statistics',
      '',
      `- **Files**: ${project.fileCount}`,
      `- **Symbols**: ${project.symbolCount}`,
      `- **Type**: ${project.type}`,
      '',
      '## Dependencies',
      '',
      ...Object.entries(project.dependencies).map(([name, version]) => `- ${name}: ${version}`),
      '',
      '## Documentation',
      '',
      '- [API Reference](./api/index.md)',
      '- [Components](./components/index.md)',
      '- [Types](./types/index.md)',
      '',
    ].join('\n');

    const path = this.fileOrganizer.getOverviewPath(project.name);

    return {
      path,
      frontmatter,
      content,
    };
  }

  /**
   * Generate architecture document
   */
  private async generateArchitecture(
    analysis: ProjectAnalysis,
    aiContent?: Map<string, AIGeneratedContent>
  ): Promise<GeneratedDoc> {
    const { project, patterns } = analysis;

    const archContent = aiContent?.get('architecture');
    const summary = archContent?.summary || `Architecture overview for ${project.name}`;

    const frontmatter = {
      title: `${project.name} - Architecture`,
      description: summary,
      tags: ['architecture', 'overview', 'auto-generated'],
      date: new Date().toISOString().split('T')[0],
      category: 'architecture',
    };

    // Build content
    const content = [
      serializeFrontmatter(frontmatter),
      `# ${project.name} - Architecture`,
      '',
      summary,
      '',
      '## Project Type',
      '',
      `This is a **${project.type}** project.`,
      '',
      '## Detected Patterns',
      '',
      ...patterns.map(p => `- **${p.name}** (${p.type}): ${p.filePath}`),
      '',
      '## Directory Structure',
      '',
      '```',
      '(Structure visualization would go here)',
      '```',
      '',
    ].join('\n');

    const path = this.fileOrganizer.getArchitecturePath();

    return {
      path,
      frontmatter,
      content,
    };
  }

  /**
   * Generate documentation for a single symbol
   */
  private async generateSymbolDoc(
    symbol: Symbol,
    aiContent?: AIGeneratedContent,
    projectRoot?: string
  ): Promise<GeneratedDoc> {
    // Check if this is a Python symbol
    const isPython = symbol.filePath.endsWith('.py');

    // Generate frontmatter
    const frontmatter = generateFrontmatter(
      symbol,
      aiContent?.summary || '',
      {
        author: this.config.frontmatter?.author,
        defaultTags: this.config.frontmatter?.defaultTags,
      }
    );

    // Build markdown content
    let markdownContent: string;

    if (isPython) {
      // Use Python-specific templates
      markdownContent = await this.generatePythonSymbolDoc(symbol, aiContent);
    } else {
      // Use existing TypeScript/JavaScript markdown builders
      switch (symbol.type) {
        case 'function':
          markdownContent = buildFunctionMarkdown(
            symbol,
            aiContent?.description,
            aiContent?.examples
          );
          break;

        case 'component':
        case 'hook':
          markdownContent = buildComponentMarkdown(
            symbol,
            aiContent?.description,
            aiContent?.examples
          );
          break;

        case 'class':
          markdownContent = buildClassMarkdown(
            symbol,
            aiContent?.description,
            aiContent?.examples
          );
          break;

        case 'interface':
        case 'type':
        case 'enum':
          markdownContent = buildTypeMarkdown(symbol, aiContent?.description);
          break;

        default:
          markdownContent = buildFunctionMarkdown(
            symbol,
            aiContent?.description,
            aiContent?.examples
          );
      }
    }

    // Combine frontmatter and content
    const content = serializeFrontmatter(frontmatter) + markdownContent;

    // Get output path
    const path = this.fileOrganizer.getOutputPath(symbol, projectRoot || process.cwd());

    return {
      path,
      frontmatter,
      content,
    };
  }

  /**
   * Generate index files for directories
   */
  async generateIndices(documents: GeneratedDoc[]): Promise<void> {
    const dirMap = new Map<string, string[]>();

    // Group documents by directory
    for (const doc of documents) {
      const dir = doc.path.substring(0, doc.path.lastIndexOf('/'));
      if (!dirMap.has(dir)) {
        dirMap.set(dir, []);
      }
      const fileName = doc.path.substring(doc.path.lastIndexOf('/') + 1);
      dirMap.get(dir)!.push(fileName);
    }

    // Generate index for each directory
    for (const [dir, files] of dirMap) {
      const dirName = dir.substring(dir.lastIndexOf('/') + 1);
      const title = dirName.charAt(0).toUpperCase() + dirName.slice(1);

      await this.fileOrganizer.generateIndex(
        dir,
        title,
        `Documentation for ${dirName}`,
        files
      );
    }
  }

  /**
   * Prepare data for Airflow overview template
   */
  private prepareAirflowOverviewData(analysis: ProjectAnalysis): Record<string, unknown> {
    const { project, patterns, symbols } = analysis;

    // Extract DAGs from patterns
    const dags = patterns
      .filter(p => p.type === 'airflow-dag')
      .map(p => ({
        name: p.name,
        description: p.description || '',
        filePath: p.filePath,
        metadata: p.metadata || {},
      }));

    // Extract custom operators
    const customOperators = patterns
      .filter(p => p.type === 'airflow-custom-operator')
      .map(p => ({
        name: p.name,
        description: p.description || '',
        filePath: p.filePath,
      }));

    // Extract custom sensors
    const customSensors = patterns
      .filter(p => p.type === 'airflow-custom-sensor')
      .map(p => ({
        name: p.name,
        description: p.description || '',
        filePath: p.filePath,
      }));

    return {
      project: {
        name: project.name,
        description: project.description || '',
        fileCount: project.fileCount,
        symbolCount: project.symbolCount,
      },
      date: new Date().toISOString().split('T')[0],
      dagCount: dags.length,
      customOperatorCount: customOperators.length,
      customSensorCount: customSensors.length,
      dags,
      customOperators,
      customSensors,
    };
  }

  /**
   * Generate documentation for Python symbols using templates
   */
  private async generatePythonSymbolDoc(
    symbol: Symbol,
    aiContent?: AIGeneratedContent
  ): Promise<string> {
    const date = new Date().toISOString().split('T')[0];

    // Prepare template data
    const templateData: Record<string, unknown> = {
      name: symbol.name,
      description: aiContent?.description || symbol.comment || '',
      comment: symbol.comment,
      filePath: symbol.filePath,
      line: symbol.line,
      date,
      parameters: symbol.parameters,
      returnType: symbol.returnType,
      extends: symbol.extends,
      implements: symbol.implements,
      tags: symbol.tags || {},
      examples: aiContent?.examples || [],
    };

    // Select template based on symbol type
    let templateName: string;
    if (symbol.type === 'function' || symbol.type === 'method') {
      templateName = 'python-function';
    } else if (symbol.type === 'class') {
      templateName = 'python-class';
    } else {
      // Fallback to function template for other types
      templateName = 'python-function';
    }

    // Render template
    return await this.templateEngine.render(templateName, templateData);
  }
}
