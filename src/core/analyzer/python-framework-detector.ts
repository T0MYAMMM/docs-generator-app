/**
 * Python Framework Pattern Detector
 *
 * Detects patterns specific to popular Python frameworks:
 * - Django: models, views, serializers, admin
 * - Flask: routes, blueprints, views
 * - FastAPI: routes, dependencies, Pydantic models
 */

import { DetectedPattern, Symbol as DocSymbol } from '../../types/index.js';
import { PythonParsedAST } from './python-ast-parser.js';
import { logger } from '../../utils/logger.js';

/**
 * Python Framework Pattern Detector
 *
 * Analyzes Python AST to detect framework-specific patterns.
 */
export class PythonFrameworkDetector {
  /**
   * Detect framework patterns in a single parsed file
   */
  detect(parsed: PythonParsedAST, symbols: DocSymbol[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.success || !parsed.ast) {
      return patterns;
    }

    logger.debug(`Detecting Python framework patterns in ${parsed.filePath}`);

    // Detect Django patterns
    patterns.push(...this.detectDjangoPatterns(parsed, symbols));

    // Detect Flask patterns
    patterns.push(...this.detectFlaskPatterns(parsed, symbols));

    // Detect FastAPI patterns
    patterns.push(...this.detectFastAPIPatterns(parsed, symbols));

    logger.debug(`Detected ${patterns.length} framework patterns in ${parsed.filePath}`);

    return patterns;
  }

  /**
   * Detect framework patterns in multiple files
   */
  detectBatch(
    parsedFiles: PythonParsedAST[],
    symbolsByFile: Map<string, DocSymbol[]>
  ): DetectedPattern[] {
    logger.info('Detecting Python framework patterns...');

    const allPatterns: DetectedPattern[] = [];

    for (const parsed of parsedFiles) {
      const fileSymbols = symbolsByFile.get(parsed.filePath) || [];
      const patterns = this.detect(parsed, fileSymbols);
      allPatterns.push(...patterns);
    }

    logger.success(`Detected ${allPatterns.length} framework patterns`);

    return allPatterns;
  }

  /**
   * Detect Django patterns
   */
  private detectDjangoPatterns(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    for (const cls of parsed.ast.classes) {
      // Django Models (inherit from models.Model)
      if (
        cls.bases.some(
          (base) =>
            base.includes('models.Model') ||
            base === 'Model' ||
            base.includes('django.db.models.Model')
        )
      ) {
        patterns.push({
          type: 'django-model',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Django model: ${cls.name}`,
          metadata: {
            className: cls.name,
            fields: cls.class_vars.map((v) => v.name),
            methods: cls.methods.map((m) => m.name),
          },
        });
      }

      // Django Views (inherit from View or generic views)
      if (
        cls.bases.some(
          (base) =>
            base.includes('View') ||
            base.includes('ListView') ||
            base.includes('DetailView') ||
            base.includes('CreateView') ||
            base.includes('UpdateView') ||
            base.includes('DeleteView')
        )
      ) {
        patterns.push({
          type: 'django-view',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Django view: ${cls.name}`,
          metadata: {
            className: cls.name,
            baseClass: cls.bases.find((b) => b.includes('View')) || cls.bases[0],
            methods: cls.methods.map((m) => m.name),
          },
        });
      }

      // Django Serializers (DRF)
      if (
        cls.bases.some(
          (base) =>
            base.includes('Serializer') ||
            base.includes('ModelSerializer') ||
            base.includes('serializers.Serializer')
        )
      ) {
        patterns.push({
          type: 'django-serializer',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Django REST Framework serializer: ${cls.name}`,
          metadata: {
            className: cls.name,
            baseClass: cls.bases.find((b) => b.includes('Serializer')) || cls.bases[0],
            fields: cls.class_vars.map((v) => v.name),
          },
        });
      }

      // Django Admin
      if (
        cls.bases.some(
          (base) =>
            base.includes('admin.ModelAdmin') ||
            base === 'ModelAdmin' ||
            base.includes('django.contrib.admin.ModelAdmin')
        )
      ) {
        patterns.push({
          type: 'django-admin',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Django admin: ${cls.name}`,
          metadata: {
            className: cls.name,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect Flask patterns
   */
  private detectFlaskPatterns(parsed: PythonParsedAST, _symbols: DocSymbol[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    // Detect Flask app creation
    for (const variable of parsed.ast.variables) {
      if (variable.value && /Flask\s*\(/.test(variable.value)) {
        patterns.push({
          type: 'flask-app',
          name: variable.name,
          filePath: parsed.filePath,
          line: variable.lineno,
          description: `Flask application: ${variable.name}`,
          metadata: {
            variableName: variable.name,
          },
        });
      }

      // Detect Blueprint creation
      if (variable.value && /Blueprint\s*\(/.test(variable.value)) {
        const blueprintName = this.extractBlueprintName(variable.value, variable.name);
        patterns.push({
          type: 'flask-blueprint',
          name: blueprintName,
          filePath: parsed.filePath,
          line: variable.lineno,
          description: `Flask blueprint: ${blueprintName}`,
          metadata: {
            variableName: variable.name,
            blueprintName,
          },
        });
      }
    }

    // Detect Flask routes (functions with @app.route or @blueprint.route decorator)
    for (const func of parsed.ast.functions) {
      const routeDecorator = func.decorators.find(
        (d) => d.includes('.route') || d.includes('route(')
      );

      if (routeDecorator) {
        const route = this.extractRoute(routeDecorator);
        patterns.push({
          type: 'flask-route',
          name: func.name,
          filePath: parsed.filePath,
          line: func.lineno,
          description: func.docstring || `Flask route: ${route || func.name}`,
          metadata: {
            functionName: func.name,
            route: route || '/',
            methods: this.extractMethods(routeDecorator),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect FastAPI patterns
   */
  private detectFastAPIPatterns(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    // Detect FastAPI app creation
    for (const variable of parsed.ast.variables) {
      if (variable.value && /FastAPI\s*\(/.test(variable.value)) {
        patterns.push({
          type: 'fastapi-app',
          name: variable.name,
          filePath: parsed.filePath,
          line: variable.lineno,
          description: `FastAPI application: ${variable.name}`,
          metadata: {
            variableName: variable.name,
          },
        });
      }
    }

    // Detect Pydantic models (inherit from BaseModel)
    for (const cls of parsed.ast.classes) {
      if (
        cls.bases.some(
          (base) =>
            base.includes('BaseModel') ||
            base.includes('pydantic.BaseModel') ||
            base === 'BaseModel'
        )
      ) {
        patterns.push({
          type: 'fastapi-model',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Pydantic model: ${cls.name}`,
          metadata: {
            className: cls.name,
            fields: cls.class_vars.map((v) => v.name),
          },
        });
      }
    }

    // Detect FastAPI routes (functions with @app.get, @app.post, etc.)
    for (const func of parsed.ast.functions) {
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
      const routeDecorator = func.decorators.find((d) =>
        httpMethods.some((method) => d.includes(`.${method}(`))
      );

      if (routeDecorator) {
        const route = this.extractRoute(routeDecorator);
        const method = httpMethods.find((m) => routeDecorator.includes(`.${m}(`)) || 'get';

        patterns.push({
          type: 'fastapi-route',
          name: func.name,
          filePath: parsed.filePath,
          line: func.lineno,
          description: func.docstring || `FastAPI ${method.toUpperCase()} route: ${route || func.name}`,
          metadata: {
            functionName: func.name,
            route: route || '/',
            method: method.toUpperCase(),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Extract blueprint name from Blueprint instantiation
   */
  private extractBlueprintName(code: string, fallback: string): string {
    // Try positional argument: Blueprint('name', ...)
    const positionalMatch = code.match(/Blueprint\s*\(\s*["']([^"']+)["']/);
    if (positionalMatch && positionalMatch[1]) {
      return positionalMatch[1];
    }

    return fallback;
  }

  /**
   * Extract route path from decorator
   */
  private extractRoute(decorator: string): string | undefined {
    // Try to extract route from @app.route('/path')
    const routeMatch = decorator.match(/["']([^"']+)["']/);
    if (routeMatch && routeMatch[1]) {
      return routeMatch[1];
    }

    return undefined;
  }

  /**
   * Extract HTTP methods from Flask route decorator
   */
  private extractMethods(decorator: string): string[] {
    // Try to extract methods from @app.route('/path', methods=['GET', 'POST'])
    const methodsMatch = decorator.match(/methods\s*=\s*\[([^\]]+)\]/);
    if (methodsMatch && methodsMatch[1]) {
      return methodsMatch[1]
        .split(',')
        .map((m) => m.trim().replace(/["']/g, ''));
    }

    return ['GET']; // Default to GET
  }

  /**
   * Get statistics about detected framework patterns
   */
  getStatistics(patterns: DetectedPattern[]): {
    django: { models: number; views: number; serializers: number; admin: number };
    flask: { apps: number; blueprints: number; routes: number };
    fastapi: { apps: number; routes: number; models: number };
  } {
    return {
      django: {
        models: patterns.filter((p) => p.type === 'django-model').length,
        views: patterns.filter((p) => p.type === 'django-view').length,
        serializers: patterns.filter((p) => p.type === 'django-serializer').length,
        admin: patterns.filter((p) => p.type === 'django-admin').length,
      },
      flask: {
        apps: patterns.filter((p) => p.type === 'flask-app').length,
        blueprints: patterns.filter((p) => p.type === 'flask-blueprint').length,
        routes: patterns.filter((p) => p.type === 'flask-route').length,
      },
      fastapi: {
        apps: patterns.filter((p) => p.type === 'fastapi-app').length,
        routes: patterns.filter((p) => p.type === 'fastapi-route').length,
        models: patterns.filter((p) => p.type === 'fastapi-model').length,
      },
    };
  }
}
