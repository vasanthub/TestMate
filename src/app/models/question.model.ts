export interface Question {
  question: string;
  question_image?: string;
  question_image2?: string;
  options?: string[];
  options_image?: (string | null)[];
  answer: number | number[] | string;
  answerText?: string;
  answer_image?: string;
  answer_image2?: string;
  answerRegex?: string;
  explanation?: string;
  type: 'single' | 'multiple' | 'text';

  // Populated only when a question comes from an aggregated (recursive) fetch.
  // Identifies the exact physical repository file + index it came from, so
  // move/delete/image-edit operations can address it correctly even when a
  // practice session spans multiple descendant repositories.
  __sourcePath?: string[];
  __sourceIndex?: number;
}

export interface AggregatedQuestion {
  question: Question;
  sourcePath: string[];
  sourceIndex: number;
}

export interface QuestionAttempt {
  question_index: number;
  answered?: number[] | string;
  correct: boolean;
  skipped?: boolean;
  incorrectPreviousAttempt: boolean;
  time_taken?: string;
}

export interface TestInstance {
  test_id?: string;
  test_name: string;
  path: string[];
  parent_test?: string;
  retest_type?: 'full_set' | 'incorrect_only' | 'skipped_only' | null;
  created_on: string;
  profileName: string;
  question_range?: {
    start: number;
    end: number;
  };
  questions_attempted: QuestionAttempt[];
  score: number;
  total_questions: number;
  completed: boolean;
}

/**
 * A node in the recursive repository tree. A node can have its own questions
 * (hasOwnQuestions), child repository nodes (hasChildren), both, or neither.
 * Root-level nodes (path.length === 1) are "Subjects" - navigation only, never practicable.
 */
export interface RepositoryNode {
  name: string;
  path: string[];
  hasOwnQuestions: boolean;
  hasChildren: boolean;
  children: RepositoryNode[];
}

export interface RepositorySummary {
  status: 'not_started' | 'started' | 'completed';
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  avgTime?: string;
  lastUpdated: string;

  remaining: number;
  completionPercent: number;
  canPractice: boolean;
  hasChildren: boolean;

  // Added client-side in home.component.ts for display purposes only.
  formattedAvgTime?: string;
  timeToComplete?: string;
}

export interface TestMateSettings {
  maxPracticeQuestions: number;
}
