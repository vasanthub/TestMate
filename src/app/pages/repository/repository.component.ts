import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Question } from '../../models/question.model';
import { TestConfiguration, TestAttempt } from '../../models/test-config.model';

@Component({
  selector: 'app-repository',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './repository.component.html',
  styleUrls: ['./repository.component.scss']
})
export class RepositoryComponent implements OnInit {
  domain: string = '';
  topic: string = '';
  repository: string = '';
  questions: Question[] = [];
  loading = true;
  
  rangeStart: number = 1;
  rangeEnd: number = 0;
  useRange: boolean = true;
  clearPreviousAttempts: boolean = false;
  testName: string = '';
  
  savedTests: TestConfiguration[] = [];
  testAttempts: { [testId: string]: TestAttempt[] } = {};
  
  expandedSections: { [key: string]: boolean } = {
    'header': true,
    'practice': true,
    'practiceOptions': false,
    'savedTests': true,
    'createTest': false
  };
  
  loadingAttempts: { [testId: string]: boolean } = {};
  showCreateTest: boolean = false;

  hideAnswer: boolean = true; //NOT USED - CAN BE RENAMED FOR FUTURE NEED

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.domain = params['domain'];
      this.topic = params['topic'];
      this.repository = params['repository'];
      
      localStorage.setItem("selectedDomain", this.domain);
      localStorage.setItem("selectedTopic", this.topic);
      localStorage.setItem("selectedrepository", this.repository);

      this.loadQuestions();
      this.loadSavedTests();
    });
  }

  toggleSection(sectionId: string): void {
    this.expandedSections[sectionId] = !this.expandedSections[sectionId];
    
    if (sectionId.startsWith('test-') && this.expandedSections[sectionId]) {
      const testId = sectionId.replace('test-', '');
      if (!this.testAttempts[testId]) {
        this.loadTestAttempts(testId);
      }
    }
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections[sectionId] || false;
  }

  loadQuestions(): void {
    this.dataService.getRepository(this.domain, this.topic, this.repository).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.rangeEnd = questions.length;
        this.testName = this.getDefaultTestName();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading questions:', err);
        this.loading = false;
      }
    });
  }

  loadSavedTests(): void {
    this.dataService.getTestConfigurations(this.domain, this.topic, this.repository).subscribe({
      next: (tests) => {
        this.savedTests = tests;
      },
      error: (err) => {
        console.error('Error loading saved tests:', err);
      }
    });
  }

  loadTestAttempts(testId: string): void {
    this.loadingAttempts[testId] = true;
    this.dataService.getTestAttempts(testId).subscribe({
      next: (attempts) => {
        this.testAttempts[testId] = attempts;
        this.loadingAttempts[testId] = false;
      },
      error: (err) => {
        console.error('Error loading test attempts:', err);
        this.loadingAttempts[testId] = false;
      }
    });
  }

  getAttempts(testId: string | undefined): TestAttempt[] {
    if (!testId) return [];
    return this.testAttempts[testId] || [];
  }

  isLoadingAttempts(testId: string): boolean {
    return this.loadingAttempts[testId] || false;
  }

  getAttemptScore(attempt: TestAttempt): number {
    return Math.round((attempt.score / attempt.total_questions) * 100);
  }

  getAttemptLabel(attempt: TestAttempt): string {
    const labels: { [key: string]: string } = {
      'full': 'Full Test',
      'retry': 'Retry',
      'incorrect': 'Incorrect Questions',
      'skipped': 'Skipped Questions'
    };
    return labels[attempt.attempt_type] || 'Test';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatAttemptDate(attempt: TestAttempt): string {
    const dateString = (attempt as any).completed_on || (attempt as any).created_on || '';
    if (!dateString) return 'N/A';
    return this.formatDate(dateString);
  }

  updateTestName(): void {
    this.testName = this.getDefaultTestName();
  }

  getDefaultTestName(): string {
    if (this.useRange && this.rangeStart && this.rangeEnd) {
      return `${this.repository} (${this.rangeStart}–${this.rangeEnd})`;
    }
    return this.repository;
  }

  validateRange(): void {
    if (this.rangeStart < 1) this.rangeStart = 1;
    if (this.rangeEnd > this.questions.length) this.rangeEnd = this.questions.length;
    if (this.rangeStart > this.rangeEnd) this.rangeStart = this.rangeEnd;
    this.updateTestName();
  }

  saveTest(): void {
    const config: TestConfiguration = {
      test_name: this.testName,
      domain: this.domain,
      topic: this.topic,
      repository: this.repository,
      question_range: {
        start: this.useRange ? this.rangeStart : 1,
        end: this.useRange ? this.rangeEnd : this.questions.length
      },
      created_on: new Date().toISOString(),
      profileName: this.dataService.getProfileName()
    };

    this.dataService.saveTestConfiguration(config).subscribe({
      next: () => {
        this.expandedSections['createTest'] = false;
        this.loadSavedTests();
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving test:', err);
      }
    });
  }

  resetForm(): void {
    this.useRange = false;
    this.rangeStart = 1;
    this.rangeEnd = this.questions.length;
    this.testName = this.getDefaultTestName();
  }

  getQuestionStart(test: TestConfiguration): number {
    return test.question_range?.start || 0;
  }

  getQuestionEnd(test: TestConfiguration): number {
    return test.question_range?.end || 0;
  }

  getQuestionCount(test: TestConfiguration): number {
    const start = this.getQuestionStart(test);
    const end = this.getQuestionEnd(test);
    return end - start + 1;
  }

  startTest(testConfig: TestConfiguration): void {
    if (!testConfig.question_range) {
      alert('Invalid test configuration: missing question range');
      return;
    }

    this.router.navigate(['/test', this.domain, this.topic, this.repository], {
      queryParams: {
        testConfigId: testConfig.config_id,
        start: testConfig.question_range.start,
        end: testConfig.question_range.end,
        hideAnswer: this.hideAnswer
      }
    });
  }

  viewAttempt(attempt: TestAttempt): void {
    this.router.navigate(['/test-review'], {
      queryParams: {
        attemptId: attempt.attempt_id
      }
    });
  }

  retakeTest(testConfig: TestConfiguration, attempt: TestAttempt): void {
    this.startTest(testConfig);
  }

  startPractice(): void {
    if (this.clearPreviousAttempts) {
      this.dataService.deletePracticeAttempts(
        this.domain,
        this.topic,
        this.repository,
        this.dataService.getProfileName()
      ).subscribe({
        next: () => {
          console.log('Previous practice attempts cleared successfully');
          this.navigateToPractice();
        },
        error: (err) => {
          console.error('Error clearing practice attempts:', err);
          // Still navigate even if delete fails
          this.navigateToPractice();
        }
      });
    } else {
      this.navigateToPractice();
    }
  }

  private navigateToPractice(): void {
    const queryParams: any = { practice: 'true' };
    if (this.useRange) {
      queryParams.start = this.rangeStart;
      queryParams.end = this.rangeEnd;
      queryParams.hideAnswer = this.hideAnswer;
    }
    this.router.navigate(['/practice', this.domain, this.topic, this.repository], { queryParams });
  }

  deleteTest(testConfig: TestConfiguration): void {
    if (!testConfig.config_id) {
      alert('Cannot delete test: missing configuration ID');
      return;
    }

    if (confirm(`Delete test "${testConfig.test_name}" and all its attempts?`)) {
      this.dataService.deleteTestConfiguration(testConfig.config_id).subscribe({
        next: () => {
          if (testConfig.config_id) {
            delete this.expandedSections['test-' + testConfig.config_id];
            delete this.testAttempts[testConfig.config_id];
          }
          this.loadSavedTests();
        },
        error: (err) => {
          console.error('Error deleting test:', err);
          alert('Failed to delete test. Please try again.');
        }
      });
    }
  }
}