import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepositoryNode } from '../../models/question.model';

/**
 * One row of the repo-library picker: an expand chevron, a checkbox and the
 * repository name, with its children rendered recursively when expanded.
 * Purely presentational - the parent owns the checked set and cascade logic.
 */
@Component({
  selector: 'app-library-tree-node',
  standalone: true,
  imports: [CommonModule, LibraryTreeNodeComponent],
  templateUrl: './library-tree-node.component.html',
  styleUrls: ['./library-tree-node.component.scss']
})
export class LibraryTreeNodeComponent {
  @Input({ required: true }) node!: RepositoryNode;
  @Input() depth = 0;
  @Input({ required: true }) checkedIds!: Set<string>;
  @Input({ required: true }) descendantsById!: Map<string, string[]>;
  @Input({ required: true }) expandedIds!: Set<string>;

  @Output() toggle = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() toggleExpand = new EventEmitter<string>();

  get checked(): boolean {
    return this.checkedIds.has(this.node.id);
  }

  get indeterminate(): boolean {
    if (this.checked || !this.node.hasChildren) return false;
    const desc = this.descendantsById.get(this.node.id) ?? [];
    return desc.some(id => this.checkedIds.has(id));
  }

  get isExpanded(): boolean {
    return this.expandedIds.has(this.node.id);
  }

  onCheck(event: Event): void {
    this.toggle.emit({ id: this.node.id, checked: (event.target as HTMLInputElement).checked });
  }

  onChevron(): void {
    if (this.node.hasChildren) this.toggleExpand.emit(this.node.id);
  }
}
