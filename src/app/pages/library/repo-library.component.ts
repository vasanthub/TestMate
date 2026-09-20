import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { RepositoryNode } from '../../models/question.model';
import { indexTree, TreeIndex } from '../../utils/repo-library';
import { LibraryTreeNodeComponent } from '../../components/library-tree-node/library-tree-node.component';

@Component({
  selector: 'app-repo-library',
  standalone: true,
  imports: [CommonModule, RouterModule, LibraryTreeNodeComponent],
  templateUrl: './repo-library.component.html',
  styleUrls: ['./repo-library.component.scss']
})
export class RepoLibraryComponent implements OnInit {
  tree: RepositoryNode[] = [];
  loading = true;
  saving = false;
  saved = false;
  error = '';

  profileName = '';
  checkedIds = new Set<string>();
  expandedIds = new Set<string>();

  private index: TreeIndex = { parentById: new Map(), descendantsById: new Map() };
  private roots = new Set<string>();

  constructor(private data: DataService) {}

  get descendantsById() {
    return this.index.descendantsById;
  }

  get selectionCount(): number {
    return this.checkedIds.size;
  }

  get dirty(): boolean {
    const current = this.computeRoots();
    if (current.size !== this.roots.size) return true;
    for (const id of current) if (!this.roots.has(id)) return true;
    return false;
  }

  ngOnInit(): void {
    this.profileName = this.data.getProfileName();

    forkJoin({
      tree: this.data.getTree(),
      assigned: this.data.getProfileLibrary().pipe(catchError(() => of<string[]>([])))
    }).subscribe({
      next: ({ tree, assigned }) => {
        this.tree = tree;
        this.index = indexTree(tree);
        this.roots = new Set(assigned);

        // Seed the working set from the stored roots, expanding each into its subtree.
        const checked = new Set<string>(assigned);
        for (const id of assigned) {
          for (const d of this.index.descendantsById.get(id) ?? []) checked.add(d);
        }
        this.checkedIds = checked;

        // Open the first level so there's something to click straight away.
        tree.forEach(n => { if (n.hasChildren) this.expandedIds.add(n.id); });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading repo library:', err);
        this.error = 'Could not load repositories.';
        this.loading = false;
      }
    });
  }

  onToggle({ id, checked }: { id: string; checked: boolean }): void {
    const affected = [id, ...(this.index.descendantsById.get(id) ?? [])];
    const next = new Set(this.checkedIds);

    if (checked) {
      affected.forEach(x => next.add(x));
    } else {
      affected.forEach(x => next.delete(x));
      // An ancestor can't stay fully-checked once a descendant leaves.
      let parent = this.index.parentById.get(id);
      while (parent) {
        next.delete(parent);
        parent = this.index.parentById.get(parent);
      }
    }
    this.checkedIds = next;
    this.saved = false;
  }

  onToggleExpand(id: string): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
  }

  selectAll(): void {
    const all = new Set<string>();
    const walk = (nodes: RepositoryNode[]) => nodes.forEach(n => { all.add(n.id); walk(n.children); });
    walk(this.tree);
    this.checkedIds = all;
    this.saved = false;
  }

  clearAll(): void {
    this.checkedIds = new Set<string>();
    this.saved = false;
  }

  save(): void {
    this.saving = true;
    this.error = '';
    const roots = [...this.computeRoots()];

    this.data.setProfileLibrary(roots).subscribe({
      next: () => {
        this.roots = new Set(roots);
        this.saving = false;
        this.saved = true;
      },
      error: (err) => {
        console.error('Error saving repo library:', err);
        this.saving = false;
        this.error = 'Could not save. Please try again.';
      }
    });
  }

  // The minimal set to persist: a checked node whose parent is not checked.
  private computeRoots(): Set<string> {
    const roots = new Set<string>();
    for (const id of this.checkedIds) {
      const parent = this.index.parentById.get(id);
      if (!parent || !this.checkedIds.has(parent)) roots.add(id);
    }
    return roots;
  }
}
