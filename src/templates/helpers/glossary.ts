/**
 * Glossary Helper
 *
 * Provides beginner-friendly explanations for technical terms.
 */

/**
 * Airflow glossary entries
 */
export const airflowGlossary = {
  dag: {
    term: 'DAG (Directed Acyclic Graph)',
    definition: 'A workflow or pipeline that defines a series of tasks and their dependencies. Think of it as a recipe that tells Airflow what tasks to run and in what order.',
    example: 'A DAG might define: "First download data, then clean it, then upload to database"',
  },
  operator: {
    term: 'Operator',
    definition: 'A single task or action in your workflow. Each operator does one specific job, like running a Python function, executing a bash command, or transferring data.',
    example: 'PythonOperator runs Python code, BashOperator runs shell commands',
  },
  sensor: {
    term: 'Sensor',
    definition: 'A special type of operator that waits for something to happen before continuing. It keeps checking until a condition is met.',
    example: 'FileSensor waits until a specific file exists before proceeding',
  },
  task: {
    term: 'Task',
    definition: 'A specific instance of an operator in your DAG. When you create an operator and give it a task_id, it becomes a task.',
    example: 'download_data = PythonOperator(task_id="download_data", ...)',
  },
  schedule: {
    term: 'Schedule',
    definition: 'When and how often your DAG should run automatically. Uses cron expressions or presets like @daily, @hourly.',
    example: '@daily means run once every day at midnight',
  },
  dependency: {
    term: 'Task Dependency',
    definition: 'The order that tasks must run in. You specify which tasks must finish before others can start.',
    example: 'task_a >> task_b means "run task_a first, then task_b"',
  },
  hook: {
    term: 'Hook',
    definition: 'A connection manager that handles talking to external systems like databases, cloud services, or APIs. It manages credentials and connections.',
    example: 'BigQueryHook helps you connect to Google BigQuery',
  },
};

/**
 * Python glossary entries
 */
export const pythonGlossary = {
  decorator: {
    term: 'Decorator',
    definition: 'A special function that modifies or enhances another function. It\'s written with an @ symbol above the function.',
    example: '@property makes a method behave like an attribute',
  },
  docstring: {
    term: 'Docstring',
    definition: 'A documentation string that explains what a function or class does. It\'s written in triple quotes right after the function definition.',
    example: '"""This function adds two numbers together"""',
  },
  parameter: {
    term: 'Parameter',
    definition: 'An input value that a function needs to do its job. Like ingredients in a recipe.',
    example: 'def greet(name): - here "name" is a parameter',
  },
  return: {
    term: 'Return Value',
    definition: 'What a function gives back when it finishes. Like the result of a calculation.',
    example: 'def add(a, b): return a + b - returns the sum',
  },
};

/**
 * Generate glossary markdown section
 */
export function generateGlossary(type: 'airflow' | 'python' | 'both' = 'both'): string {
  const sections: string[] = [];

  sections.push('## 📖 Glossary - Understanding the Terms\n');
  sections.push('New to these concepts? Here are simple explanations:\n');

  if (type === 'airflow' || type === 'both') {
    sections.push('### Airflow Terms\n');
    Object.values(airflowGlossary).forEach((entry) => {
      sections.push(`**${entry.term}**`);
      sections.push(`- ${entry.definition}`);
      sections.push(`- Example: ${entry.example}\n`);
    });
  }

  if (type === 'python' || type === 'both') {
    sections.push('### Python Terms\n');
    Object.values(pythonGlossary).forEach((entry) => {
      sections.push(`**${entry.term}**`);
      sections.push(`- ${entry.definition}`);
      sections.push(`- Example: ${entry.example}\n`);
    });
  }

  return sections.join('\n');
}

/**
 * Get a simple explanation for a technical term
 */
export function explainTerm(term: string): string {
  const allGlossary = { ...airflowGlossary, ...pythonGlossary };

  for (const [key, entry] of Object.entries(allGlossary)) {
    if (term.toLowerCase().includes(key)) {
      return entry.definition;
    }
  }

  return term;
}
