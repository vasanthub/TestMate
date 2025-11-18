import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Question, TestInstance, Repository, DomainStructure } from '../models/question.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
//private apiUrl = 'https://localhost:7221/api';
private apiUrl = 'http://icherish.in/api3/api';
private profileName$ = new BehaviorSubject<string>('default');

  constructor(private http: HttpClient) {
    const urlParams = new URLSearchParams(window.location.search);
    const profile = urlParams.get('profileName');
    if (profile) {
      this.profileName$.next(profile);
    }
  }

  saveTestAttempt(attempt: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-attempts`, attempt);
  }

  getTestAttempts(configId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/test-attempts/${configId}`);
  }

  getProfileName(): string {
    return this.profileName$.value;
  }

  setProfileName(name: string): void {
    this.profileName$.next(name);
  }

  getDomainStructure(): Observable<DomainStructure> {
    return this.http.get<DomainStructure>(`${this.apiUrl}/structure`);
  }

  getRepository(domain: string, topic: string, repository: string): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/repository/${domain}/${topic}/${repository}`);
  }

  generateMCQs(topic: string): Observable<Question[]> {
    return this.http.post<Question[]>(`${this.apiUrl}/reading/generate-mcqs`, {
      topic: topic
    });
  }

  saveTestResult(test: TestInstance): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-results`, test);
  }

  getTestResults(profileName?: string): Observable<TestInstance[]> {
    const profile = profileName || this.getProfileName();
    return this.http.get<TestInstance[]>(`${this.apiUrl}/test-results?profileName=${profile}`);
  }

  getTestById(testId: string): Observable<TestInstance> {
    return this.http.get<TestInstance>(`${this.apiUrl}/test-results/${testId}`);
  }

  generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  saveTestConfiguration(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-configurations`, config);
  }

  getTestConfigurations(domain: string, topic: string, repository: string): Observable<any[]> {
    const profile = this.getProfileName();
    return this.http.get<any[]>(`${this.apiUrl}/test-configurations?domain=${domain}&topic=${topic}&repository=${repository}&profileName=${profile}`);
  }

  deleteTestConfiguration(configId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/test-configurations/${configId}`);
  }

checkAnswer(question: Question, userAnswer: number[] | string): boolean {
  // Auto-detect type based on structure
  if (!question.type) {
    // Text question: has answerText or answerRegex, no options
    if ((question.answerText || question.answerRegex) && !question.options) {
      question.type = 'text';
    }
    // Multiple choice: has options array
    else if (question.options && question.options.length > 0) {
      if (Array.isArray(question.answer) && question.answer.length > 1) {
        question.type = 'multiple';
      } else {
        question.type = 'single';
      }
    }
    // Fallback: check answer type
    else if (typeof question.answer === 'string') {
      question.type = 'text';
    } else if (Array.isArray(question.answer)) {
      question.type = question.answer.length > 1 ? 'multiple' : 'single';
    } else {
      question.type = 'single';
    }
  }

  // Handle text questions
  if (question.type === 'text') {
    if (typeof userAnswer !== 'string') return false;
    
    const userText = userAnswer.trim().toLowerCase();
    
    // Check regex match first (most flexible)
    if (question.answerRegex) {
      try {
        const regex = new RegExp(question.answerRegex, 'i');
        return regex.test(userText);
      } catch (e) {
        console.error('Invalid regex pattern:', question.answerRegex);
      }
    }
    
    // Check answerText field
    if (question.answerText) {
      return userText === question.answerText.trim().toLowerCase();
    }
    
    // Check answer field if it's a string
    if (typeof question.answer === 'string') {
      return userText === question.answer.trim().toLowerCase();
    }
    
    return false;
  }

  // Handle single choice (answer is [4] or 4)
  if (question.type === 'single') {
    let correctIndex: number;
    
    if (Array.isArray(question.answer)) {
      correctIndex = question.answer[0];
    } else if (typeof question.answer === 'number') {
      correctIndex = question.answer;
    } else {
      return false;
    }
    
    const userIndex = Array.isArray(userAnswer) ? userAnswer[0] : null;
    return userIndex === correctIndex;
  }

  // Handle multiple choice (answer is [1, 3, 4])
  if (question.type === 'multiple') {
    if (!Array.isArray(question.answer) || !Array.isArray(userAnswer)) return false;
    if (question.answer.length !== userAnswer.length) return false;
    
    const sortedAnswer = [...question.answer].sort((a, b) => a - b);
    const sortedUser = [...userAnswer].sort((a, b) => a - b);
    return sortedAnswer.every((val, idx) => val === sortedUser[idx]);
  }
  
  return false;
}

  calculateScore(questions: Question[], attempts: any[]): number {
    const correct = attempts.filter(a => a.correct).length;
    return Math.round((correct / questions.length) * 100);
  }
}