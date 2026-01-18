import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { LatexService } from '../../services/latex.service';
import { Question, QuestionAttempt, TestInstance } from '../../models/question.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('answerInput') answerInput?: ElementRef;
   @ViewChild('timerText', { static: false }) timerText!: ElementRef<HTMLDivElement>;
   
  domain: string = '';
  topic: string = '';
  repository: string = '';
  isPractice: boolean = false;
  
  questions: Question[] = [];
  currentIndex: number = 0;
  attempts: QuestionAttempt[] = [];
  
  userAnswer: any = null;
  selectedOptions: boolean[] = [];
  textAnswer: string = '';
  
  startTime: Date = new Date();
  elapsedTime: string = '00:00';
  timerInterval: any;
  showTimer: boolean = false; // Default OFF
  
  showResult: boolean = false;
  finalScore: number = 0;
  
  loading = true;
  testStarted = false;
  
  isAnswerSubmitted: boolean = false;
  isCurrentAnswerCorrect: boolean = false;
  showFeedback: boolean = false;
  
  parentTestId?: string;
  retestType?: string;

  isAIGenerated: boolean = false;
  aiGeneratedQuestions: Question[] = [];
  testName: string = '';
  mode: 'practice' | 'test' = 'practice';
  userAnswers: (number[] | string)[] = [];

  hideAnswer: boolean=true;

  showMoveQuestionDialog: boolean = false;
  availableRepositories: string[] = [];
  selectedTargetRepository: string = '';
  isMovingQuestion: boolean = false;

  // Add these properties to TestComponent class
  showDeleteQuestionDialog: boolean = false;
  isDeletingQuestion: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private latexService: LatexService,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as any;

    if (state?.testData) {
      this.questions = state.testData.questions;
      this.testName = state.testData.testName;
      this.domain = state.testData.domain;
      this.topic = state.testData.topic;
      this.repository = state.testData.repository;
      this.mode = state.testData.mode || 'practice';
      this.isAIGenerated = state.testData.isAIGenerated || false;
      
      if (this.isAIGenerated) {
        this.aiGeneratedQuestions = [...this.questions];
      }
      
      this.initializeAnswers();
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.domain = params['domain'];
      this.topic = params['topic'];
      this.repository = params['repository'];

      console.log(this.repository);
    });

    this.route.url.subscribe(segments => {
      this.isPractice = segments[0]?.path === 'practice';
    });

    this.route.queryParams.subscribe(params => {
      const start = params['start'] ? parseInt(params['start']) : null;
      const end = params['end'] ? parseInt(params['end']) : null;
      this.parentTestId = params['parentTestId'];
      this.retestType = params['retestType'];

      this.hideAnswer = params['hideAnswer'] === 'true';
      console.log("start: ", start);
      console.log("end: ", end);
      console.log("hideAnswer: ", this.hideAnswer);
      
      if (this.isAIGenerated)
      {
          this.loadAIQuestions();
          this.initializeAnswer();
      }
      else{
        this.loadQuestions(start, end);
      }
        
    });

    this.startTimer();
    
    // Add keyboard listener for Ctrl+Enter
    document.addEventListener('keyup', this.handleKeyPress);
  }

  loadAIQuestions(){   
      this.attempts = this.questions.map((_, index) => ({
        question_index: index,
        correct: false,
        skipped: true,
        incorrectPreviousAttempt: false
      }));

      this.loading = false;
      this.testStarted = true;
    }


  initializeAnswers(): void {
    this.userAnswers = new Array(this.questions.length).fill(null);
  }

  ngAfterViewInit(): void {
    this.focusAnswerInput();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    document.removeEventListener('keyup', this.handleKeyPress);
  }

  handleKeyPress = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !this.showResult) {
      event.preventDefault();
      if (!this.isAnswerSubmitted) {
        this.submitAnswer();
      } else if (!this.isCurrentAnswerCorrect) {
        this.nextQuestion();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextQuestion();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousQuestion();
    }
    
  };

  focusAnswerInput(): void {
    setTimeout(() => {
      if (this.answerInput) {
        this.answerInput.nativeElement.focus();
      } else {
        // Try to focus on first radio/checkbox if available
        const firstInput = document.querySelector('input[type="radio"], input[type="checkbox"], textarea') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  }

  toggleTimer(): void {
    this.showTimer = !this.showTimer;
  }

  ClipboardCopyStatus: string="";
  copyQuestionToClipboard(): void {
    const question = this.currentQuestion;
    let text = question.question;
    
    if (question.options) {
      text += '\n\nOptions:\n';
      question.options.forEach((opt, idx) => {
        text += `${idx + 1}. ${opt}\n`;
      });
    }
    this.ClipboardCopyStatus="Copied!";
    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => {
        this.ClipboardCopyStatus="";
      }, 400);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  
 

  updateQuestionImageUrl(
    domain: string,
    topic: string,
    repository: string,
    questionIndex: number,
    imageUrl: string,
    event: Event
  ): void {
  event.preventDefault();
  event.stopPropagation();
    

  this.dataService.updateQuestionImageUrl(domain, topic, repository, questionIndex, 1, imageUrl).subscribe({
      next: () => {
        const key = `${domain}|${topic}|${repository}|${questionIndex}`;
        // Update local cache or state if needed
        // this.questionImageUrls[key] = imageUrl;
        // this.openImageUrlMenu = null;
        
        // Optional: Show success notification
        console.log(`Image URL updated successfully for question at index ${questionIndex}`);
      },
      error: (err) => {
        console.error('Error updating question image URL:', err);
        // Optional: Show error notification to user
      }
    });
  }

// ANGULAR COMPONENT METHOD
uploadImageFromClipboard(
  domain: string,
  topic: string,
  repository: string,
  questionIndex: number,
  imageIndex: number,
  event: Event
): void {
  event.preventDefault();
  event.stopPropagation();

  // Prompt user for image name
  //const imageName = prompt('Enter image name (without extension):');
  const imageName = '';
  // if (!imageName || imageName.trim() === '') {
  //   console.log('Image upload cancelled');
  //   return;
  // }

  // Access clipboard
  navigator.clipboard.read().then((clipboardItems) => {
    if (clipboardItems.length === 0) {
      alert('No items in clipboard');
      return;
    }

    const clipboardItem = clipboardItems[0];
    if (!clipboardItem.types.some(type => type.startsWith('image/'))) {
      alert('Clipboard does not contain an image');
      return;
    }

    const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
    if (!imageType) {
      alert('Could not determine image type');
      return;
    }

    clipboardItem.getType(imageType).then((blob) => {
      this.dataService.uploadImageFromClipboard(
        domain,
        topic,
        repository,
        questionIndex,
        blob,
        imageName,
        imageIndex
      ).subscribe({
        next: (response) => {
          this.ClipboardCopyStatus="Image uploaded successfully";
          // alert(`Image uploaded successfully: ${response.imageUrl}`);
          // Update your question with the image URL if needed
        },
        error: (err) => {
          console.error('Error uploading image:', err);
          alert('Failed to upload image');
        }
      });
    });
  }).catch((err) => {
    console.error('Error accessing clipboard:', err);
    alert('Failed to access clipboard');
  });
}


  
  loadQuestions(start?: number | null, end?: number | null): void {
    this.dataService.getRepository(this.domain, this.topic, this.repository).subscribe({
      next: (questions) => {
        const filterQuestions = this.route.snapshot.queryParams['filterQuestions'];        
        
        // Load practice attempts from server
        this.dataService.getPracticeAttempts(this.domain, this.topic, this.repository).subscribe({
          next: (serverAttempts) => {
            console.log("serverAttempts loaded");
            console.log(serverAttempts);
            
            if (filterQuestions === 'true' && serverAttempts && serverAttempts.length > 0) {
              const indices: number[] = serverAttempts.map(a => a.question_index);
              this.questions = indices.map(i => questions[i]).filter(q => q !== undefined);          
            } 
            else if (start && end) {
              this.questions = questions.slice(start - 1, end);
            }
            else {
              this.questions = questions;
            }
            
            if (serverAttempts && serverAttempts.length > 0)
            {
              this.attempts = serverAttempts;          
            }
            else
            {          
               this.attempts = this.questions.map((_, index) => ({
                  question_index: index,
                  correct: false,
                  skipped: true, 
                  incorrectPreviousAttempt: false
                }));         
            }
            
            this.loading = false;
            this.testStarted = true;
            this.initializeAnswer();
          },
          error: (err) => {
            console.error('Error loading practice attempts:', err);
            // Initialize with default attempts if server fetch fails
            this.attempts = this.questions.map((_, index) => ({
              question_index: index,
              correct: false,
              skipped: true, 
              incorrectPreviousAttempt: false
            }));
            
            this.loading = false;
            this.testStarted = true;
            this.initializeAnswer();
          }
        });
      },
      error: (err) => {
        console.error('Error loading questions:', err);
        this.loading = false;
      }
    });
  }

startTimer(): void {
  this.ngZone.runOutsideAngular(() => {
    this.timerInterval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - this.startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const newElapsed = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;

      // ✅ update DOM directly — stay outside Angular zone
      this.timerText.nativeElement.textContent = newElapsed;
    }, 1000);
    });
}

  initializeAnswer(): void {
    const question = this.questions[this.currentIndex];
    
    this.isAnswerSubmitted = false;
    this.isCurrentAnswerCorrect = false;
    this.showFeedback = false;
    this.ClipboardCopyStatus="";
    
    if (question.options) {
      this.selectedOptions = new Array(question.options.length).fill(false);
      const attempt = this.attempts[this.currentIndex];
      if (attempt.answered && Array.isArray(attempt.answered)) {
        attempt.answered.forEach(idx => {
          this.selectedOptions[idx - 1] = true;
        });
      }
      if (!attempt.skipped) {
        this.isAnswerSubmitted = true;
        if (attempt.incorrectPreviousAttempt) this.isAnswerSubmitted = false;
        this.isCurrentAnswerCorrect = attempt.correct;
        this.showFeedback = true;
        if (attempt.incorrectPreviousAttempt) this.showFeedback = false;
      }
    } else {
      this.textAnswer = (this.attempts[this.currentIndex].answered as string) || '';
      const attempt = this.attempts[this.currentIndex];
      if (!attempt.skipped) {
        this.isAnswerSubmitted = true;
        if (attempt.incorrectPreviousAttempt) this.isAnswerSubmitted = false;
        this.isCurrentAnswerCorrect = attempt.correct;
        this.showFeedback = true;
        if (attempt.incorrectPreviousAttempt) this.showFeedback = false;
      }
    }

    //this.showFeedback = !this.hideAnswer;

    console.log("Summary333333333333:");
    console.log("showFeedback", this.showFeedback);
    console.log("isAnswerSubmitted",this.isAnswerSubmitted);
    console.log("incorrectPreviousAttempt",this.attempts[this.currentIndex].incorrectPreviousAttempt);    
    console.log("getQuestionStatus",this.getQuestionStatus(this.currentIndex));

    this.focusAnswerInput();
  }

  get currentQuestion(): Question {
    return this.questions[this.currentIndex];
  }

  get isMultipleChoice(): boolean {
    return !!(this.currentQuestion.options && this.currentQuestion.options.length > 0);
  }

  get isSingleAnswer(): boolean {
    if (!this.isMultipleChoice) return false;
    const answer = this.currentQuestion.answer;
    if (Array.isArray(answer)) {
      return answer.length === 1;
    }
    return typeof answer === 'number';
  }

  get isMultipleAnswer(): boolean {
    if (!this.isMultipleChoice) return false;
    const answer = this.currentQuestion.answer;
    return Array.isArray(answer) && answer.length > 1;
  }

  get isTextAnswer(): boolean {
    return !this.isMultipleChoice || !!(this.currentQuestion.answerText || this.currentQuestion.answerRegex);
  }

renderLatex(text: string): SafeHtml {
  const rendered = this.latexService.renderLatex(text);
  return this.sanitizer.bypassSecurityTrustHtml(rendered);
}

  onOptionChange(index: number): void {
    if (this.isSingleAnswer) {
      this.selectedOptions = new Array(this.selectedOptions.length).fill(false);
      this.selectedOptions[index] = true;
    }
  }

  submitAnswer(): void {
    const attempt = this.attempts[this.currentIndex];
    attempt.incorrectPreviousAttempt=false;
    
    if (this.isMultipleChoice) {
      const selected = this.selectedOptions
        .map((val, idx) => val ? idx + 1 : null)
        .filter(val => val !== null) as number[];
      
      if (selected.length > 0) {
        attempt.answered = selected;
        attempt.correct = this.dataService.checkAnswer(this.currentQuestion, selected);
        attempt.skipped = false;
      } else {
        return;
      }
    } else {
      if (this.textAnswer.trim()) {
        attempt.answered = this.textAnswer.trim();
        attempt.correct = this.dataService.checkAnswer(this.currentQuestion, this.textAnswer.trim());
        attempt.skipped = false;
      } else {
        return;
      }
    }
    
    this.isAnswerSubmitted = true;
    this.isCurrentAnswerCorrect = attempt.correct;    
    this.showFeedback = true;
    
    if (this.isCurrentAnswerCorrect) {
      setTimeout(() => {
        if (this.currentIndex < this.questions.length - 1) {
          this.nextQuestion();
        }
      }, 1000);
    }
  }

  revealAnswer(): void {
    console.log("Summary:");
    console.log("showFeedback", this.showFeedback);
    console.log("isAnswerSubmitted",this.isAnswerSubmitted);
    console.log("incorrectPreviousAttempt",this.attempts[this.currentIndex].incorrectPreviousAttempt);    
    console.log("getQuestionStatus",this.getQuestionStatus(this.currentIndex));
    this.showFeedback = true;    
  }

  markAsCorrect(): void {
    const attempt = this.attempts[this.currentIndex];
    attempt.correct = true;
    attempt.skipped = false;
    if (!attempt.answered) {
      attempt.answered = this.textAnswer.trim();
    }
    this.isCurrentAnswerCorrect = true;
    this.showFeedback = true;
    
    setTimeout(() => {
      if (this.currentIndex < this.questions.length - 1) {
        this.nextQuestion();
      }
    }, 100);
  }

  markAsIncorrect(): void {
    const attempt = this.attempts[this.currentIndex];
    attempt.correct = false;
    attempt.skipped = false;
    attempt.incorrectPreviousAttempt=true;
    if (!attempt.answered) {
      attempt.answered = this.textAnswer.trim();
    }
    this.isCurrentAnswerCorrect = false;
    this.showFeedback = true;

    setTimeout(() => {
      if (this.currentIndex < this.questions.length - 1) {
        this.nextQuestion();
      }
    }, 100);
  }

  goToQuestion(index: number): void {
    this.currentIndex = index;
    this.initializeAnswer();
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.initializeAnswer();
    }  
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.initializeAnswer();
    }
        console.log("Summary2:");
    console.log(this.showFeedback);
    console.log(this.isAnswerSubmitted);
    console.log(this.getQuestionStatus(this.currentIndex));
  }

  getQuestionStatus(index: number): string {
    const attempt = this.attempts[index];
    if (attempt.skipped) return 'unanswered';
    if (attempt.correct) return 'correct';
    if (attempt.incorrectPreviousAttempt) return 'incorrectPreviousAttempt';
    return attempt.correct ? 'correct' : 'incorrect';
  }

  getQuestionImage(imageIndex: number): string {
    if (imageIndex==1)
      var imageUrl = this.currentQuestion.question_image;
    if (imageIndex==3)
      var imageUrl = this.currentQuestion.answer_image;
    
    if (!imageUrl) {
      return '';
    }

    // Check if it's already a complete URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Prefix with the base URL if it's not a complete URL
    return `http://icherish.in/files/images/testmate/${imageUrl}`;
  }

  isCorrectOption(index: number): boolean {
    const question = this.currentQuestion;
    if (!question.answer) return false;
    
    if (Array.isArray(question.answer)) {
      return question.answer.includes(index + 1);
    }
    
    if (typeof question.answer === 'number') {
      return question.answer === (index + 1);
    }
    
    return false;
  }

  get answeredCount(): number {
    return this.attempts.filter(a => !a.skipped).length;
  }

  get correctCount(): number {
    return this.attempts.filter(a => a.correct).length;
  }

  get incorrectCount(): number {
    return this.attempts.filter(a => !a.correct && !a.skipped).length;
  }

  get skippedCount(): number {
    return this.attempts.filter(a => a.skipped).length;
  }

  finishTest(): void {
    this.finalScore = this.dataService.calculateScore(this.questions, this.attempts);

    this.attempts = this.attempts.map(a => ({
            ...a,
            incorrectPreviousAttempt: !a.skipped && !a.correct
          }));
    
    const incorrectIndices = this.attempts
      .map((a, i) => !a.correct && !a.skipped ? i : -1)
      .filter(i => i !== -1);
    
    console.log('finishTest');
    console.log(incorrectIndices);
    console.log(this.attempts);

    // Save to server instead of localStorage
    const profileName = this.dataService.getProfileName();
    this.dataService.savePracticeAttempts(
      this.domain,
      this.topic,
      this.repository,
      profileName,
      this.attempts
    ).subscribe({
      next: () => {
        console.log('Practice attempts saved successfully to server');
      },
      error: (err) => {
        console.error('Error saving practice attempts to server:', err);
        // Fallback to localStorage if server save fails
        localStorage.setItem(this.topic + '_' + this.repository, JSON.stringify(this.attempts));
      }
    });
    

    if (!this.isPractice) {
      this.saveTestResult();
    }
    
    this.showResult = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  saveTestResult(): void {
    const testConfigId = this.route.snapshot.queryParams['testConfigId'];
    
    if (testConfigId) {
      this.saveTestAttempt(testConfigId);
    } else {
      this.saveAsTestInstance();
    }
  }

  saveTestAttempt(testConfigId: string): void {
    this.dataService.getTestAttempts(testConfigId).subscribe({
      next: (existingAttempts) => {
        const attemptNumber = existingAttempts.length + 1;
        const retestType = this.route.snapshot.queryParams['retestType'];
        
        let attemptType: 'full' | 'retry' | 'incorrect' | 'skipped' = 'full';
        if (retestType === 'incorrect_only') attemptType = 'incorrect';
        else if (retestType === 'skipped_only') attemptType = 'skipped';
        else if (this.parentTestId) attemptType = 'retry';
        
        const attempt = {
          test_config_id: testConfigId,
          attempt_number: attemptNumber,
          attempt_type: attemptType,
          created_on: new Date().toISOString(),
          questions_attempted: this.attempts,
          score: this.finalScore,
          total_questions: this.questions.length,
          time_taken: this.elapsedTime
        };

        this.dataService.saveTestAttempt(attempt).subscribe({
          next: () => console.log('Test attempt saved successfully'),
          error: (err) => console.error('Error saving test attempt:', err)
        });
      },
      error: (err) => {
        console.error('Error getting existing attempts:', err);
        const attempt = {
          test_config_id: testConfigId,
          attempt_number: 1,
          attempt_type: 'full' as const,
          created_on: new Date().toISOString(),
          questions_attempted: this.attempts,
          score: this.finalScore,
          total_questions: this.questions.length,
          time_taken: this.elapsedTime
        };

        this.dataService.saveTestAttempt(attempt).subscribe({
          next: () => console.log('Test attempt saved successfully'),
          error: (err) => console.error('Error saving test attempt:', err)
        });
      }
    });
  }

  saveAsTestInstance(): void {
    let testName = `${this.repository} - ${new Date().toLocaleDateString()}`;
    
    if (this.parentTestId && this.retestType) {
      testName = this.generateRetestName();
    }
    
    const testInstance = {
      test_id: this.dataService.generateTestId(),
      test_name: testName,
      domain: this.domain,
      topic: this.topic,
      repository: this.repository,
      parent_test: this.parentTestId,
      retest_type: this.retestType as any,
      created_on: new Date().toISOString(),
      profileName: this.dataService.getProfileName(),
      questions_attempted: this.attempts,
      score: this.finalScore,
      total_questions: this.questions.length,
      completed: true
    };

    this.dataService.saveTestResult(testInstance).subscribe({
      next: () => console.log('Test saved successfully'),
      error: (err) => console.error('Error saving test:', err)
    });
  }

  generateRetestName(): string {
    let baseName = `${this.repository}`;
    
    if (this.retestType === 'incorrect_only') {
      baseName += ' - Incorrect Only';
    } else if (this.retestType === 'skipped_only') {
      baseName += ' - Skipped Only';
    } else {
      baseName += ' - Retest';
    }
    
    return baseName;
  }

  retakeFull(): void {
    this.router.navigate(['/test', this.domain, this.topic, this.repository]);
    window.location.reload();
  }

  retakeIncorrect(): void {
    const incorrectIndices = this.attempts
      .map((a, i) => !a.correct && !a.skipped ? i : -1)
      .filter(i => i !== -1);
    
    console.log(incorrectIndices);

    if (incorrectIndices.length > 0) {
     
      this.dataService.getTestResults(this.dataService.getProfileName()).subscribe({
        next: (tests) => {
          const currentTest = tests[0];
          
          this.router.navigate(['/test', this.domain, this.topic, this.repository], {
            queryParams: { 
              retestType: 'incorrect_only',
              parentTestId: currentTest?.test_id,
              filterQuestions: 'true'
            }
          });
          window.location.reload();
        }
      });
    }
  }

  retakeSkipped(): void {
    const skippedIndices = this.attempts
      .map((a, i) => a.skipped ? i : -1)
      .filter(i => i !== -1);
    
    if (skippedIndices.length > 0) {      
      
      this.dataService.getTestResults(this.dataService.getProfileName()).subscribe({
        next: (tests) => {
          const currentTest = tests[0];
          
          this.router.navigate(['/test', this.domain, this.topic, this.repository], {
            queryParams: { 
              retestType: 'skipped_only',
              parentTestId: currentTest?.test_id,
              filterQuestions: 'true'
            }
          });
          window.location.reload();
        }
      });
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  viewResults(): void {
    this.router.navigate(['/results']);
  }

   copyQuestionsToClipboard(): void {
    if (!this.isAIGenerated || this.aiGeneratedQuestions.length === 0) {
      return;
    }

    const jsonString = JSON.stringify(this.aiGeneratedQuestions, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      alert('Questions copied to clipboard in JSON format!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  }

  
openMoveQuestionDialog(): void {
  this.showMoveQuestionDialog = true;
  this.loadAvailableRepositories();
}

closeMoveQuestionDialog(): void {
  this.showMoveQuestionDialog = false;
  this.selectedTargetRepository = '';
}

loadAvailableRepositories(): void {
  this.dataService.getRepositoriesForTopic(this.domain, this.topic).subscribe({
    next: (repositories) => {
      // Filter out the current repository
      this.availableRepositories = repositories.filter(repo => repo !== this.repository);
    },
    error: (err) => {
      console.error('Error loading repositories:', err);
      alert('Failed to load available repositories');
    }
  });
}

moveCurrentQuestion(): void {
  if (!this.selectedTargetRepository) {
    alert('Please select a target repository');
    return;
  }

  const confirmMove = confirm(
    `Are you sure you want to move this question from "${this.repository}" to "${this.selectedTargetRepository}"?\n\n` +
    `This action cannot be undone and will:\n` +
    `- Remove the question from the current repository\n` +
    `- Add it to the target repository\n` +
    `- Reload the current test`
  );

  if (!confirmMove) {
    return;
  }

  this.isMovingQuestion = true;

  this.dataService.moveQuestion(
    this.domain,
    this.topic,
    this.repository,
    this.currentIndex,
    this.selectedTargetRepository
  ).subscribe({
    next: () => {
      //alert(`Question successfully moved to "${this.selectedTargetRepository}"`);
      this.closeMoveQuestionDialog();
      
      // Reload the questions to reflect the change
      this.reloadQuestions();
    },
    error: (err) => {
      console.error('Error moving question:', err);
      alert('Failed to move question: ' + (err.error?.message || err.message));
      this.isMovingQuestion = false;
    }
  });
}

reloadQuestions(): void {
  this.loading = true;
  
  this.dataService.getRepository(this.domain, this.topic, this.repository).subscribe({
    next: (questions) => {
      this.questions = questions;
      
      // Adjust current index if it's now out of bounds
      if (this.currentIndex >= this.questions.length) {
        this.currentIndex = Math.max(0, this.questions.length - 1);
      }
      
      // Reinitialize attempts
      this.attempts = this.questions.map((_, index) => ({
        question_index: index,
        correct: false,
        skipped: true,
        incorrectPreviousAttempt: false
      }));
      
      this.loading = false;
      this.isMovingQuestion = false;
      this.initializeAnswer();
    },
    error: (err) => {
      console.error('Error reloading questions:', err);
      alert('Failed to reload questions. Redirecting to home.');
      this.router.navigate(['/']);
    }
  });
}

// Add these methods to TestComponent class

openDeleteQuestionDialog(): void {
  this.showDeleteQuestionDialog = true;
}

closeDeleteQuestionDialog(): void {
  this.showDeleteQuestionDialog = false;
}

deleteCurrentQuestion(): void {
  const confirmDelete = confirm(
    `Are you sure you want to DELETE this question?\n\n` +
    `Repository: ${this.repository}\n` +
    `Question ${this.currentIndex + 1} of ${this.questions.length}\n\n` +
    `This action CANNOT be undone!\n` +
    `The question will be permanently removed from the repository.`
  );

  if (!confirmDelete) {
    return;
  }

  this.isDeletingQuestion = true;

  this.dataService.deleteQuestion(
    this.domain,
    this.topic,
    this.repository,
    this.currentIndex
  ).subscribe({
    next: () => {
      //alert('Question successfully deleted');
      this.closeDeleteQuestionDialog();
      
      // Reload the questions to reflect the change
      this.reloadQuestions();
    },
    error: (err) => {
      console.error('Error deleting question:', err);
      alert('Failed to delete question: ' + (err.error?.message || err.message));
      this.isDeletingQuestion = false;
    }
  });
}

}