export type SddStage = 
  | '01-prd'
  | '02-sdd'
  | '03-tasks'
  | '04-impl'
  | '05-audit'
  | 'completed';

export interface SddConfig {
  version: string;
  projectName: string;
  language: 'pt-BR' | 'en';
  specsDir: string;
  tddRequired: boolean;
  enforceAudit: boolean;
  agentRules: {
    disallowCodeWithoutSpec: boolean;
    atomicTaskExecution: boolean;
  };
}

export type TlcTestType = 'CONTRACT' | 'UNIT' | 'INT' | 'E2E' | 'UI' | 'SMOKE' | 'GENERIC' | 'NONE';

export interface TaskItem {
  id: string;
  title: string;
  isTest: boolean;
  testType: TlcTestType;
  completed: boolean;
  rawText: string;
  lineNumber: number;
  estimatedMinutes: number;
  hasExplicitEstimate: boolean;
  explicitEstimateText?: string;
}

export interface EstimateSummary {
  featureName: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMinutes: number;
  completedMinutes: number;
  pendingMinutes: number;
  completionPercentage: number;
  projectedFinishTime: Date;
  byTlcLayer: Record<TlcTestType, { count: number; minutes: number; completedCount: number }>;
}

export interface FeatureProgress {
  featureName: string;
  currentStage: SddStage;
  stageName: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  files: {
    grillExists: boolean;
    prdExists: boolean;
    sddExists: boolean;
    tasksExists: boolean;
    auditExists: boolean;
  };
}

export interface ValidationIssue {
  stage: SddStage;
  file: string;
  type: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
