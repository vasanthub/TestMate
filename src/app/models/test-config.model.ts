export interface TestConfiguration {
  config_id?: string;
  test_name: string;
  domain: string;
  topic: string;
  repository: string;
  question_range: {
    start: number;
    end: number;
  };
  created_on: string;
  profileName: string;
}

export interface TestAttempt {
  attempt_id: string;
  test_config_id: string;
  attempt_number: number;
  attempt_type: 'full' | 'retry' | 'incorrect' | 'skipped';
  created_on: string;
  questions_attempted: QuestionAttempt[];
  score: number;
  total_questions: number;
  time_taken?: string;
}

export interface QuestionAttempt {
  question_index: number;
  answered?: number[] | string;
  correct: boolean;
  skipped?: boolean;
}
