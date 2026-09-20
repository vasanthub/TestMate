import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Question, AggregatedQuestion, TestInstance, RepositoryNode, TestMateSettings, SiblingRepository } from '../models/question.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = environment.apiUrl;

  // No real authentication yet - a "profile" just scopes stored test results and
  // progress. It arrives one of two ways:
  //   1. ?profileName=<name> in the URL, when this app is launched from the parent app
  //      (used for the session, not remembered).
  //   2. picked on the profile screen when the app is opened directly, then remembered
  //      in localStorage so it isn't asked for on every visit.
  private static readonly PROFILE_STORAGE_KEY = 'testmate.profileName';
  readonly availableProfiles: readonly string[] = ['Jade', 'Cherish', 'Vasant', 'Jasmine'];

  private profileName$ = new BehaviorSubject<string>('');
  private profileChosen = false;

  /** Emits the active profile name; '' until one is chosen. */
  readonly profileName = this.profileName$.asObservable();

  constructor(private http: HttpClient) {
    const urlProfile = new URLSearchParams(window.location.search).get('profileName');
    if (urlProfile) {
      this.profileName$.next(urlProfile);
      this.profileChosen = true;
    } else {
      const stored = this.readStoredProfile();
      if (stored) {
        this.profileName$.next(stored);
        this.profileChosen = true;
      }
    }
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  /** True once a profile is known (from the URL or a previous choice). */
  hasProfile(): boolean {
    return this.profileChosen;
  }

  private readStoredProfile(): string | null {
    try {
      return localStorage.getItem(DataService.PROFILE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private pathSegment(path: string[]): string {
    return path.map(p => encodeURIComponent(p)).join('/');
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
    this.profileChosen = true;
    try {
      localStorage.setItem(DataService.PROFILE_STORAGE_KEY, name);
    } catch {
      /* localStorage unavailable - profile just won't persist across reloads */
    }
  }

  getSettings(): Observable<TestMateSettings> {
    return this.http.get<TestMateSettings>(`${this.apiUrl}/testmate-settings`);
  }

  // The repository tree is rebuilt server-side by walking the whole data folder,
  // which takes a couple of seconds. It barely changes during a session, so the
  // result is cached in memory: the first load hits the API, every later call
  // (e.g. navigating back to Home from a question) resolves instantly. The cache
  // is dropped by invalidateTreeCache() after anything that could change it, and
  // a full page reload clears it too.
  private cachedTree: RepositoryNode[] | null = null;

  getTree(forceRefresh = false): Observable<RepositoryNode[]> {
    if (!forceRefresh && this.cachedTree) {
      return of(this.cachedTree);
    }
    return this.http.get<RepositoryNode[]>(`${this.apiUrl}/structure`).pipe(
      tap(tree => this.cachedTree = tree)
    );
  }

  invalidateTreeCache(): void {
    this.cachedTree = null;
  }

  getRepository(path: string[]): Observable<AggregatedQuestion[]> {
    return this.http.get<AggregatedQuestion[]>(`${this.apiUrl}/repository/${this.pathSegment(path)}`);
  }

  // Resolves a URL path to the node's permanent, move-resilient repository id. Every
  // page that only knows its path from the route (repository/test pages) must call this
  // before talking to any id-keyed endpoint below.
  resolveRepositoryId(path: string[]): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(`${this.apiUrl}/repository-id/${this.pathSegment(path)}`);
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

  getTestConfigurations(repositoryId: string): Observable<any[]> {
    const profile = this.getProfileName();
    return this.http.get<any[]>(`${this.apiUrl}/test-configurations?repositoryId=${encodeURIComponent(repositoryId)}&profileName=${encodeURIComponent(profile)}`);
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

  // The repository ids a profile has added to its library (roots of chosen
  // branches; descendants are implied). Empty => the profile sees everything.
  getProfileLibrary(profileName?: string): Observable<string[]> {
    const profile = profileName || this.getProfileName();
    return this.http
      .get<{ repositoryIds: string[] }>(`${this.apiUrl}/profile-repos?profileName=${encodeURIComponent(profile)}`)
      .pipe(map(res => res?.repositoryIds ?? []));
  }

  setProfileLibrary(repositoryIds: string[], profileName?: string): Observable<any> {
    const profile = profileName || this.getProfileName();
    return this.http.post(`${this.apiUrl}/profile-repos`, { profileName: profile, repositoryIds });
  }

  updateRepositoryStatus(repositoryId: string, status: string, profileName: string = 'default'): Observable<any> {
    return this.http.post(`${this.apiUrl}/repository-status`, {
      repositoryId,
      status,
      profileName
    });
  }

  updateQuestionImageUrl(
    sourceId: string,
    sourceIndex: number,
    imageUrl: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/question-image-url`, {
      sourceId,
      sourceIndex,
      imageUrl
    });
  }

  uploadImageFromClipboard(
    sourceId: string,
    sourceIndex: number,
    imageBlob: Blob,
    imageName: string,
    imageIndex: number
  ): Observable<any> {
    const formData = new FormData();
    formData.append('sourceId', sourceId);
    formData.append('sourceIndex', sourceIndex.toString());
    formData.append('imageName', imageName);
    formData.append('imageIndex', imageIndex.toString());
    formData.append('image', imageBlob, `${imageName}.png`);

    return this.http.post(`${this.apiUrl}/upload-clipboard-image`, formData);
  }

  savePracticeAttempts(
    repositoryId: string,
    profileName: string,
    attempts: any[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/practice-attempts`, {
      repositoryId,
      profileName,
      attempts
    });
  }

  getPracticeAttempts(
    repositoryId: string,
    profileName?: string
  ): Observable<any[]> {
    const profile = profileName || this.getProfileName();
    return this.http.get<any[]>(`${this.apiUrl}/practice-attempts?repositoryId=${encodeURIComponent(repositoryId)}&profileName=${encodeURIComponent(profile)}`);
  }

  deletePracticeAttempts(
    repositoryId: string,
    profileName?: string
  ): Observable<any> {
    const profile = profileName || this.getProfileName();
    return this.http.post(`${this.apiUrl}/practice-attempts/delete?repositoryId=${encodeURIComponent(repositoryId)}&profileName=${encodeURIComponent(profile)}`, null);
  }

  // Sibling leaf repositories under a parent path (candidates for a move-question target)
  getSiblingRepositories(parentPath: string[]): Observable<SiblingRepository[]> {
    return this.http.get<SiblingRepository[]>(`${this.apiUrl}/repositories/${this.pathSegment(parentPath)}`);
  }

  // Move questions (possibly from multiple source files) into a target repository
  moveQuestions(
    items: { sourceId: string; sourceIndex: number }[],
    targetId: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/move-question`, {
      items,
      targetId
    }).pipe(tap(() => this.invalidateTreeCache()));
  }

  deleteQuestion(
    sourceId: string,
    sourceIndex: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete-question`, {
      sourceId,
      sourceIndex
    }).pipe(tap(() => this.invalidateTreeCache()));
  }

}
