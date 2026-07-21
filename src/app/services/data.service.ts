import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Question, AggregatedQuestion, TestInstance, RepositoryNode, TestMateSettings } from '../models/question.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl;
  private profileName$ = new BehaviorSubject<string>('Jade');

  constructor(private http: HttpClient) {
    const urlParams = new URLSearchParams(window.location.search);
    const profile = urlParams.get('profileName');
    if (profile) {
      this.profileName$.next(profile);
    }
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  private pathSegment(path: string[]): string {
    return path.map(p => encodeURIComponent(p)).join('/');
  }

  private pathQuery(path: string[], extra: { [key: string]: string } = {}): string {
    const params = path.map(p => `path=${encodeURIComponent(p)}`);
    Object.keys(extra).forEach(key => params.push(`${key}=${encodeURIComponent(extra[key])}`));
    return params.join('&');
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

  getSettings(): Observable<TestMateSettings> {
    return this.http.get<TestMateSettings>(`${this.apiUrl}/testmate-settings`);
  }

  getTree(): Observable<RepositoryNode[]> {
    return this.http.get<RepositoryNode[]>(`${this.apiUrl}/structure`);
  }

  getRepository(path: string[]): Observable<AggregatedQuestion[]> {
    return this.http.get<AggregatedQuestion[]>(`${this.apiUrl}/repository/${this.pathSegment(path)}`);
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

  getTestConfigurations(path: string[]): Observable<any[]> {
    const profile = this.getProfileName();
    return this.http.get<any[]>(`${this.apiUrl}/test-configurations?${this.pathQuery(path, { profileName: profile })}`);
  }

  deleteTestConfiguration(configId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-configurations/${configId}/delete`, null);
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

  getRepositorySummaries(profileName?: string): Observable<{ [key: string]: any }> {
    const profile = profileName || this.getProfileName();
    return this.http.get<{ [key: string]: any }>(`${this.apiUrl}/repository-summaries?profileName=${profile}`);
  }

  getRepositoryStatuses(profileName: string = 'default'): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>(`${this.apiUrl}/repository-status?profileName=${profileName}`);
  }

  updateRepositoryStatus(path: string[], status: string, profileName: string = 'default'): Observable<any> {
    return this.http.post(`${this.apiUrl}/repository-status`, {
      path,
      status,
      profileName
    });
  }

  updateQuestionImageUrl(
    sourcePath: string[],
    sourceIndex: number,
    imageUrl: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/question-image-url`, {
      sourcePath,
      sourceIndex,
      imageUrl
    });
  }

  uploadImageFromClipboard(
    sourcePath: string[],
    sourceIndex: number,
    imageBlob: Blob,
    imageName: string,
    imageIndex: number
  ): Observable<any> {
    const formData = new FormData();
    sourcePath.forEach(segment => formData.append('sourcePath', segment));
    formData.append('sourceIndex', sourceIndex.toString());
    formData.append('imageName', imageName);
    formData.append('imageIndex', imageIndex.toString());
    formData.append('image', imageBlob, `${imageName}.png`);

    return this.http.post(`${this.apiUrl}/upload-clipboard-image`, formData);
  }

  savePracticeAttempts(
    path: string[],
    profileName: string,
    attempts: any[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/practice-attempts`, {
      path,
      profileName,
      attempts
    });
  }

  getPracticeAttempts(
    path: string[],
    profileName?: string
  ): Observable<any[]> {
    const profile = profileName || this.getProfileName();
    return this.http.get<any[]>(`${this.apiUrl}/practice-attempts?${this.pathQuery(path, { profileName: profile })}`);
  }

  deletePracticeAttempts(
    path: string[],
    profileName?: string
  ): Observable<any> {
    const profile = profileName || this.getProfileName();
    return this.http.post(`${this.apiUrl}/practice-attempts/delete?${this.pathQuery(path, { profileName: profile })}`, null);
  }

  // Sibling leaf repositories under a parent path (candidates for a move-question target)
  getSiblingRepositories(parentPath: string[]): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/repositories/${this.pathSegment(parentPath)}`);
  }

  // Move questions (possibly from multiple source files) into a target repository
  moveQuestions(
    items: { sourcePath: string[]; sourceIndex: number }[],
    targetPath: string[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/move-question`, {
      items,
      targetPath
    });
  }

  deleteQuestion(
    sourcePath: string[],
    sourceIndex: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete-question`, {
      sourcePath,
      sourceIndex
    });
  }

}
