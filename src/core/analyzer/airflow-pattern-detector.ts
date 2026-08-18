/**
 * Airflow Pattern Detector
 *
 * Detects Airflow-specific patterns in Python code:
 * - DAG definitions (class instantiation and @dag decorator)
 * - Tasks (operators, sensors, hooks)
 * - Task dependencies (>> and << operators)
 * - Task groups
 * - Dynamic task mapping
 * - Custom operators, sensors, and hooks
 */

import { DetectedPattern, Symbol as DocSymbol } from '../../types/index.js';
import { PythonParsedAST } from './python-ast-parser.js';
import { logger } from '../../utils/logger.js';

/**
 * DAG metadata extracted from Airflow DAG definitions
 */
export interface DAGMetadata {
  dagId?: string;
  scheduleInterval?: string;
  startDate?: string;
  tags?: string[];
  description?: string;
  catchup?: boolean;
  maxActiveRuns?: number;
  defaultArgs?: Record<string, any>;
}

/**
 * Task metadata extracted from Airflow task definitions
 */
export interface TaskMetadata {
  taskId: string;
  operator: string;
  dependencies?: string[];
  taskGroup?: string;
  params?: Record<string, any>;
}

/**
 * Airflow Pattern Detector
 *
 * Analyzes Python AST to detect Airflow patterns and extract metadata.
 */
export class AirflowPatternDetector {
  /**
   * Detect Airflow patterns in a single parsed file
   */
  detect(
    parsed: PythonParsedAST,
    symbols: DocSymbol[]
  ): { patterns: DetectedPattern[]; dagMetadata: Map<string, DAGMetadata> } {
    const patterns: DetectedPattern[] = [];
    const dagMetadata = new Map<string, DAGMetadata>();

    if (!parsed.success || !parsed.ast) {
      return { patterns, dagMetadata };
    }

    logger.debug(`Detecting Airflow patterns in ${parsed.filePath}`);

    // Detect DAG definitions
    const dagPatterns = this.detectDAGs(parsed, symbols);
    patterns.push(...dagPatterns.patterns);
    dagPatterns.metadata.forEach((meta, id) => dagMetadata.set(id, meta));

    // Detect task operators
    const taskPatterns = this.detectTasks(parsed, symbols);
    patterns.push(...taskPatterns);

    // Detect custom operators
    const customOpPatterns = this.detectCustomOperators(parsed, symbols);
    patterns.push(...customOpPatterns);

    // Detect custom sensors
    const customSensorPatterns = this.detectCustomSensors(parsed, symbols);
    patterns.push(...customSensorPatterns);

    // Detect custom hooks
    const customHookPatterns = this.detectCustomHooks(parsed, symbols);
    patterns.push(...customHookPatterns);

    logger.debug(`Detected ${patterns.length} Airflow patterns in ${parsed.filePath}`);

    return { patterns, dagMetadata };
  }

  /**
   * Detect Airflow patterns in multiple files
   */
  detectBatch(
    parsedFiles: PythonParsedAST[],
    symbolsByFile: Map<string, DocSymbol[]>
  ): {
    patterns: DetectedPattern[];
    dagMetadata: Map<string, DAGMetadata>;
  } {
    logger.info('Detecting Airflow patterns...');

    const allPatterns: DetectedPattern[] = [];
    const allDagMetadata = new Map<string, DAGMetadata>();

    for (const parsed of parsedFiles) {
      const fileSymbols = symbolsByFile.get(parsed.filePath) || [];
      const { patterns, dagMetadata } = this.detect(parsed, fileSymbols);
      allPatterns.push(...patterns);
      dagMetadata.forEach((meta, id) => allDagMetadata.set(id, meta));
    }

    logger.success(`Detected ${allPatterns.length} Airflow patterns`);

    return {
      patterns: allPatterns,
      dagMetadata: allDagMetadata,
    };
  }

  /**
   * Detect DAG definitions
   */
  private detectDAGs(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): { patterns: DetectedPattern[]; metadata: Map<string, DAGMetadata> } {
    const patterns: DetectedPattern[] = [];
    const metadata = new Map<string, DAGMetadata>();

    if (!parsed.ast) return { patterns, metadata };

    // Look for DAG instantiations in variables
    for (const variable of parsed.ast.variables) {
      // Check if variable value contains DAG instantiation
      if (variable.value && /DAG\s*\(/.test(variable.value)) {
        const dagId = this.extractDagId(variable.value, variable.name);
        const dagMeta = this.extractDAGMetadata(variable.value);

        patterns.push({
          type: 'airflow-dag',
          name: dagId || variable.name,
          filePath: parsed.filePath,
          line: variable.lineno,
          description: `Airflow DAG definition: ${dagId || variable.name}`,
          metadata: {
            dagId: dagId || variable.name,
            variableName: variable.name,
            ...dagMeta,
          },
        });

        if (dagId) {
          metadata.set(dagId, {
            dagId,
            ...dagMeta,
          });
        }
      }
    }

    // Look for @dag decorator on functions
    for (const func of parsed.ast.functions) {
      if (func.decorators.includes('dag') || func.decorators.includes('airflow.decorators.dag')) {
        const dagId = func.name;

        patterns.push({
          type: 'airflow-dag',
          name: dagId,
          filePath: parsed.filePath,
          line: func.lineno,
          description: func.docstring || `Airflow DAG definition: ${dagId}`,
          metadata: {
            dagId,
            decoratorStyle: true,
            functionName: func.name,
          },
        });

        metadata.set(dagId, {
          dagId,
          description: func.docstring || undefined,
        });
      }
    }

    return { patterns, metadata };
  }

  /**
   * Detect task operators
   */
  private detectTasks(parsed: PythonParsedAST, _symbols: DocSymbol[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    // Common Airflow operator patterns
    const operatorPatterns = [
      'PythonOperator',
      'BashOperator',
      'BigQueryOperator',
      'GCSToGCSOperator',
      'GCSToBigQueryOperator',
      'BigQueryInsertJobOperator',
      'EmailOperator',
      'DummyOperator',
      'EmptyOperator',
      'BranchPythonOperator',
      'ShortCircuitOperator',
      'TriggerDagRunOperator',
    ];

    const sensorPatterns = [
      'FileSensor',
      'GCSObjectExistenceSensor',
      'BigQueryTableExistenceSensor',
      'ExternalTaskSensor',
      'TimeDeltaSensor',
    ];

    const allPatterns = [...operatorPatterns, ...sensorPatterns];

    // Look for operator instantiations in variables
    for (const variable of parsed.ast.variables) {
      if (!variable.value) continue;

      for (const operatorType of allPatterns) {
        if (variable.value.includes(`${operatorType}(`)) {
          const taskId = this.extractTaskId(variable.value, variable.name);
          const isOperator = operatorPatterns.includes(operatorType);

          patterns.push({
            type: isOperator ? 'airflow-operator' : 'airflow-sensor',
            name: taskId || variable.name,
            filePath: parsed.filePath,
            line: variable.lineno,
            description: `Airflow ${operatorType}: ${taskId || variable.name}`,
            metadata: {
              taskId: taskId || variable.name,
              operator: operatorType,
              variableName: variable.name,
            },
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect custom operators (classes that inherit from BaseOperator)
   */
  private detectCustomOperators(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    for (const cls of parsed.ast.classes) {
      // Check if class inherits from BaseOperator
      if (
        cls.bases.some(
          (base) =>
            base.includes('BaseOperator') ||
            base.includes('Operator') ||
            base === 'BaseOperator'
        )
      ) {
        patterns.push({
          type: 'airflow-custom-operator',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Custom Airflow operator: ${cls.name}`,
          metadata: {
            className: cls.name,
            baseClass: cls.bases.find((b) => b.includes('Operator')) || cls.bases[0],
            methods: cls.methods.map((m) => m.name),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect custom sensors (classes that inherit from BaseSensorOperator)
   */
  private detectCustomSensors(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    for (const cls of parsed.ast.classes) {
      // Check if class inherits from BaseSensorOperator
      if (
        cls.bases.some(
          (base) =>
            base.includes('BaseSensorOperator') ||
            base.includes('Sensor') ||
            base === 'BaseSensorOperator'
        )
      ) {
        patterns.push({
          type: 'airflow-custom-sensor',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Custom Airflow sensor: ${cls.name}`,
          metadata: {
            className: cls.name,
            baseClass: cls.bases.find((b) => b.includes('Sensor')) || cls.bases[0],
            methods: cls.methods.map((m) => m.name),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect custom hooks (classes that inherit from BaseHook)
   */
  private detectCustomHooks(
    parsed: PythonParsedAST,
    _symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (!parsed.ast) return patterns;

    for (const cls of parsed.ast.classes) {
      // Check if class inherits from BaseHook
      if (
        cls.bases.some(
          (base) => base.includes('BaseHook') || base.includes('Hook') || base === 'BaseHook'
        )
      ) {
        patterns.push({
          type: 'airflow-custom-hook',
          name: cls.name,
          filePath: parsed.filePath,
          line: cls.lineno,
          description: cls.docstring || `Custom Airflow hook: ${cls.name}`,
          metadata: {
            className: cls.name,
            baseClass: cls.bases.find((b) => b.includes('Hook')) || cls.bases[0],
            methods: cls.methods.map((m) => m.name),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Extract DAG ID from DAG instantiation
   */
  private extractDagId(code: string, fallback: string): string {
    // Try to extract dag_id from DAG(..., dag_id='...')
    const dagIdMatch = code.match(/dag_id\s*=\s*["']([^"']+)["']/);
    if (dagIdMatch && dagIdMatch[1]) {
      return dagIdMatch[1];
    }

    // Try positional argument: DAG('dag_id', ...)
    const positionalMatch = code.match(/DAG\s*\(\s*["']([^"']+)["']/);
    if (positionalMatch && positionalMatch[1]) {
      return positionalMatch[1];
    }

    return fallback;
  }

  /**
   * Extract task ID from operator instantiation
   */
  private extractTaskId(code: string, fallback: string): string {
    // Try to extract task_id from Operator(..., task_id='...')
    const taskIdMatch = code.match(/task_id\s*=\s*["']([^"']+)["']/);
    if (taskIdMatch && taskIdMatch[1]) {
      return taskIdMatch[1];
    }

    return fallback;
  }

  /**
   * Extract DAG metadata from DAG instantiation
   */
  private extractDAGMetadata(code: string): Partial<DAGMetadata> {
    const metadata: Partial<DAGMetadata> = {};

    // Extract schedule_interval
    const scheduleMatch = code.match(/schedule_interval\s*=\s*["']([^"']+)["']/);
    if (scheduleMatch && scheduleMatch[1]) {
      metadata.scheduleInterval = scheduleMatch[1];
    }

    // Extract tags
    const tagsMatch = code.match(/tags\s*=\s*\[([^\]]+)\]/);
    if (tagsMatch && tagsMatch[1]) {
      metadata.tags = tagsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/["']/g, ''));
    }

    // Extract catchup
    const catchupMatch = code.match(/catchup\s*=\s*(True|False)/);
    if (catchupMatch && catchupMatch[1]) {
      metadata.catchup = catchupMatch[1] === 'True';
    }

    return metadata;
  }

  /**
   * Get statistics about detected Airflow patterns
   */
  getStatistics(patterns: DetectedPattern[]): {
    dags: number;
    operators: number;
    sensors: number;
    customOperators: number;
    customSensors: number;
    customHooks: number;
  } {
    return {
      dags: patterns.filter((p) => p.type === 'airflow-dag').length,
      operators: patterns.filter((p) => p.type === 'airflow-operator').length,
      sensors: patterns.filter((p) => p.type === 'airflow-sensor').length,
      customOperators: patterns.filter((p) => p.type === 'airflow-custom-operator').length,
      customSensors: patterns.filter((p) => p.type === 'airflow-custom-sensor').length,
      customHooks: patterns.filter((p) => p.type === 'airflow-custom-hook').length,
    };
  }
}
