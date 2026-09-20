import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepositoryNode, RepositorySummary } from '../../models/question.model';

/**
 * A single row in the guided drill-down view: the repository name, a stacked
 * progress bar (correct / incorrect / skipped / remaining) and a legend whose
 * correct & incorrect figures jump straight into that filtered question set.
 * Folders drill one level deeper; anything practicable can start a test in place.
 */
@Component({
  selector: 'app-repository-level-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './repository-level-row.component.html',
  styleUrls: ['./repository-level-row.component.scss']
})
export class RepositoryLevelRowComponent {
  @Input({ required: true }) node!: RepositoryNode;
  @Input() summary: RepositorySummary | null = null;
  @Input() condensed = false;

  @Output() drillIn = new EventEmitter<void>();
  @Output() startPractice = new EventEmitter<void>();
  @Output() reviewAttempted = new EventEmitter<void>();
  @Output() reviewCorrect = new EventEmitter<void>();
  @Output() reviewIncorrect = new EventEmitter<void>();
  @Output() reviewRemaining = new EventEmitter<void>();
  @Output() reviewFlagged = new EventEmitter<void>();

  get canPractice(): boolean {
    return !!this.summary?.canPractice;
  }

  get isRowClickable(): boolean {
    return this.node.hasChildren || this.canPractice;
  }

  get total(): number {
    return this.summary?.totalQuestions ?? 0;
  }

  get attempted(): number {
    return this.summary?.attempted ?? 0;
  }

  // Attempted questions that were neither marked correct nor incorrect (skipped).
  get skipped(): number {
    const s = this.summary;
    if (!s) return 0;
    return Math.max(0, s.attempted - s.correct - s.incorrect);
  }

  get remaining(): number {
    const s = this.summary;
    if (!s) return 0;
    return Math.max(0, s.totalQuestions - s.attempted);
  }

  pct(count: number): number {
    return this.total > 0 ? (count / this.total) * 100 : 0;
  }

  onRowClick(): void {
    if (this.node.hasChildren) {
      this.drillIn.emit();
    } else if (this.canPractice) {
      this.startPractice.emit();
    }
  }

  // The question count is the only way to start a test at this level.
  onCountClick(event: Event): void {
    if (!this.canPractice) return;
    event.stopPropagation();
    this.startPractice.emit();
  }

  onReviewAttempted(event: Event): void {
    event.stopPropagation();
    this.reviewAttempted.emit();
  }

  onReviewCorrect(event: Event): void {
    event.stopPropagation();
    this.reviewCorrect.emit();
  }

  onReviewIncorrect(event: Event): void {
    event.stopPropagation();
    this.reviewIncorrect.emit();
  }

  onReviewRemaining(event: Event): void {
    event.stopPropagation();
    this.reviewRemaining.emit();
  }

  onReviewFlagged(event: Event): void {
    event.stopPropagation();
    this.reviewFlagged.emit();
  }
}
