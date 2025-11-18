export interface Question {
  question: string;
  question_image?: string;
  options?: string[];
  options_image?: (string | null)[];
  answer: number | number[] | string;
  answerText?: string;
  answerRegex?: string;
  explanation?: string;
  type: 'single' | 'multiple' | 'text';  
}

export interface QuestionAttempt {
  question_index: number;
  answered?: number[] | string;
  correct: boolean;
  skipped?: boolean;
  incorrectPreviousAttempt: boolean;
}

export interface TestInstance {
  test_id?: string;
  test_name: string;
  domain: string;
  topic: string;
  repository: string;
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

export interface Repository {
  domain: string;
  topic: string;
  name: string;
  questions: Question[];
}

export interface DomainStructure {
  [domain: string]: {
    [topic: string]: string[];
  };
}