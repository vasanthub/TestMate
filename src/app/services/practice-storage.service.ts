// src/app/services/practice-storage.service.ts

import { Injectable } from '@angular/core';

export interface PracticeProgress {
  domain: string;
  topic: string;
  repository: string;
  questionRange: {
    start: number;
    end: number;
  };
  currentQuestionIndex: number;
  answeredQuestions: {
    [questionIndex: number]: {
      userAnswer: number[] | string;
      isCorrect: boolean;
      timestamp: string;
    };
  };
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class PracticeStorageService {
  private readonly STORAGE_KEY_PREFIX = 'testmate_practice_';

  constructor() {}

  /**
   * Generate a unique key for the practice session
   */
  private generateStorageKey(domain: string, topic: string, repository: string): string {
    return `${this.STORAGE_KEY_PREFIX}${domain}_${topic}_${repository}`;
  }

  /**
   * Save practice progress to localStorage
   */
  savePracticeProgress(progress: PracticeProgress): void {
    try {
      const key = this.generateStorageKey(progress.domain, progress.topic, progress.repository);
      const data = {
        ...progress,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving practice progress:', error);
    }
  }

  /**
   * Load practice progress from localStorage
   */
  loadPracticeProgress(domain: string, topic: string, repository: string): PracticeProgress | null {
    try {
      const key = this.generateStorageKey(domain, topic, repository);
      const data = localStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading practice progress:', error);
      return null;
    }
  }

  /**
   * Update a single question's answer
   */
  updateQuestionAnswer(
    domain: string,
    topic: string,
    repository: string,
    questionIndex: number,
    userAnswer: number[] | string,
    isCorrect: boolean
  ): void {
    const progress = this.loadPracticeProgress(domain, topic, repository);
    
    if (progress) {
      progress.answeredQuestions[questionIndex] = {
        userAnswer,
        isCorrect,
        timestamp: new Date().toISOString()
      };
      this.savePracticeProgress(progress);
    }
  }

  /**
   * Update current question index
   */
  updateCurrentQuestion(
    domain: string,
    topic: string,
    repository: string,
    currentQuestionIndex: number
  ): void {
    const progress = this.loadPracticeProgress(domain, topic, repository);
    
    if (progress) {
      progress.currentQuestionIndex = currentQuestionIndex;
      this.savePracticeProgress(progress);
    }
  }

  /**
   * Clear practice progress for a specific repository
   */
  clearPracticeProgress(domain: string, topic: string, repository: string): void {
    try {
      const key = this.generateStorageKey(domain, topic, repository);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing practice progress:', error);
    }
  }

  /**
   * Check if practice progress exists
   */
  hasPracticeProgress(domain: string, topic: string, repository: string): boolean {
    return this.loadPracticeProgress(domain, topic, repository) !== null;
  }

  /**
   * Get all practice sessions (for listing purposes)
   */
  getAllPracticeSessions(): PracticeProgress[] {
    const sessions: PracticeProgress[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            sessions.push(JSON.parse(data));
          }
        }
      }
    } catch (error) {
      console.error('Error getting all practice sessions:', error);
    }
    
    return sessions;
  }

  /**
   * Get statistics for a practice session
   */
  getPracticeStats(domain: string, topic: string, repository: string): {
    totalAnswered: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
  } | null {
    const progress = this.loadPracticeProgress(domain, topic, repository);
    
    if (!progress) {
      return null;
    }

    const answered = Object.values(progress.answeredQuestions);
    const totalAnswered = answered.length;
    const correctAnswers = answered.filter(a => a.isCorrect).length;
    const incorrectAnswers = totalAnswered - correctAnswers;
    const accuracy = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0;

    return {
      totalAnswered,
      correctAnswers,
      incorrectAnswers,
      accuracy: Math.round(accuracy * 100) / 100
    };
  }
}