import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepositoryNode, RepositorySummary } from '../../models/question.model';

@Component({
  selector: 'app-repository-tree-node',
  standalone: true,
  imports: [CommonModule, RepositoryTreeNodeComponent],
  templateUrl: './repository-tree-node.component.html',
  styleUrls: ['./repository-tree-node.component.scss']
})
export class RepositoryTreeNodeComponent {
  @Input({ required: true }) node!: RepositoryNode;
  @Input() depth = 0;
  @Input({ required: true }) expandedPaths!: Set<string>;
  @Input() summaries: { [key: string]: RepositorySummary } = {};
  @Input() visiblePaths: Set<string> | null = null;
  @Input() searchQuery = '';

  @Output() toggleExpand = new EventEmitter<string>();
  @Output() navigate = new EventEmitter<RepositoryNode>();
  @Output() practiceIncorrect = new EventEmitter<RepositoryNode>();
  @Output() clearProgress = new EventEmitter<{ node: RepositoryNode; event: Event }>();

  get key(): string {
    // Must match the backend's summaries-dictionary key format (pipe-joined path segments).
    return this.node.path.join('|');
  }

  get isVisible(): boolean {
    return !this.visiblePaths || this.visiblePaths.has(this.key);
  }

  get isExpanded(): boolean {
    return this.expandedPaths.has(this.key);
  }

  get summary(): RepositorySummary | null {
    return this.summaries[this.key] || null;
  }

  onChevronClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleExpand.emit(this.key);
  }

  // Clicking the row (the repository name) only ever navigates the tree: it expands/collapses
  // children when there are any, and does nothing on a childless leaf. Starting practice is a
  // separate, deliberate action - see onQuestionsClick.
  onRowClick(): void {
    if (this.node.hasChildren) {
      this.toggleExpand.emit(this.key);
    }
  }

  // The question-count cell is the only way to start practice. If this node can't be practiced
  // directly (over the limit, or a Subject), let the click fall through to the row's default
  // expand/collapse behavior instead of being a dead click target.
  onQuestionsClick(event: Event): void {
    if (!this.summary?.canPractice) return;
    event.preventDefault();
    event.stopPropagation();
    this.navigate.emit(this.node);
  }

  onPracticeIncorrect(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.practiceIncorrect.emit(this.node);
  }

  onClearProgress(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearProgress.emit({ node: this.node, event });
  }

  highlight(text: string): string {
    if (!this.searchQuery || !this.searchQuery.trim()) return text;
    const escaped = this.searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}
