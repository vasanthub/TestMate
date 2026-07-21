import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { RepositoryNode, RepositorySummary } from '../../models/question.model';
import { RepositoryTreeNodeComponent } from '../../components/repository-tree-node/repository-tree-node.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RepositoryTreeNodeComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  activeTab: 'predefined' | 'ai' = 'predefined';
  tree: RepositoryNode[] = [];
  loading = true;
  aiTopic: string = '';
  isLoadingAI: boolean = false;

  expandedPaths: Set<string> = new Set<string>();
  visiblePaths: Set<string> | null = null;

  searchQuery: string = '';
  statusFilter: string = 'all';

  repositorySummaries: { [key: string]: RepositorySummary } = {};

  profileName: string = "default";

  constructor(private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private http: HttpClient) { }

  ngOnInit(): void {
    this.profileName = this.dataService.getProfileName();
    this.loadStructure();
    this.loadRepositorySummaries();

    // Expand ancestor sections based on a deep-link query param (from repository breadcrumbs)
    this.route.queryParams.subscribe(params => {
      if (params['expandPath']) {
        this.expandAncestors(params['expandPath']);
      }
    });
  }

  loadStructure(): void {
    this.dataService.getTree().subscribe({
      next: (tree) => {
        this.tree = tree;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading structure:', err);
        this.loading = false;
      }
    });
  }

  private parseAvgTimeToSeconds(avgTime: string): number {
    let seconds = 0;
    const mMatch = /(\d+)m/.exec(avgTime);
    const sMatch = /(\d+)s/.exec(avgTime);
    if (mMatch) seconds += parseInt(mMatch[1], 10) * 60;
    if (sMatch) seconds += parseInt(sMatch[1], 10);
    return seconds;
  }

  loadRepositorySummaries(): void {
    this.dataService.getRepositorySummaries(this.profileName).subscribe({
      next: (summaries) => {
        Object.keys(summaries).forEach(key => {
          const summary: RepositorySummary = summaries[key];
          if (summary && summary.avgTime && summary.attempted > 0) {
            summary.formattedAvgTime = summary.avgTime;
            const avgSeconds = this.parseAvgTimeToSeconds(summary.avgTime);

            if (summary.remaining > 0 && avgSeconds > 0) {
              const totalRemainingSeconds = summary.remaining * avgSeconds;
              const h = Math.floor(totalRemainingSeconds / 3600);
              const m = Math.floor((totalRemainingSeconds % 3600) / 60);
              const s = totalRemainingSeconds % 60;

              let timeParts: string[] = [];
              if (h > 0) {
                timeParts.push(`${h}h`);
                if (m > 0) timeParts.push(`${m}m`);
              } else {
                if (m > 0) timeParts.push(`${m}m`);
                if (s > 0) timeParts.push(`${s}s`);
              }
              summary.timeToComplete = timeParts.join(' ');
            }
          }
        });
        this.repositorySummaries = summaries;
        this.recomputeVisibility();
      },
      error: (err) => {
        console.error('Error loading repository summaries:', err);
      }
    });
  }

  practiceIncorrect(node: RepositoryNode): void {
    this.router.navigate(['/practice', ...node.path], {
      queryParams: { practiceIncorrectOnly: 'true' }
    });
  }

  navigateToPractice(node: RepositoryNode): void {
    this.router.navigate(['/practice', ...node.path]);
  }

  toggleExpand(key: string): void {
    if (this.expandedPaths.has(key)) {
      this.expandedPaths.delete(key);
    } else {
      this.expandedPaths.add(key);
    }
  }

  clearProgress(payload: { node: RepositoryNode; event: Event }): void {
    const node = payload.node;
    if (confirm(`Clear all practice progress for "${node.name}"?`)) {
      this.dataService.deletePracticeAttempts(node.path, this.profileName).subscribe({
        next: () => {
          localStorage.removeItem(node.path.join('|'));
          this.loadRepositorySummaries();
        },
        error: (err) => {
          console.error('Error clearing progress:', err);
          alert('Failed to clear progress. Please try again.');
        }
      });
    }
  }

  switchTab(tab: 'predefined' | 'ai'): void {
    this.activeTab = tab;
  }

  expandAll(): void {
    const collect = (nodes: RepositoryNode[]) => {
      nodes.forEach(n => {
        if (n.hasChildren) {
          this.expandedPaths.add(n.path.join('|'));
          collect(n.children);
        }
      });
    };
    collect(this.tree);
  }

  collapseAll(): void {
    this.expandedPaths.clear();
  }

  onSearch(): void {
    this.recomputeVisibility();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.recomputeVisibility();
  }

  onStatusFilterChange(): void {
    this.recomputeVisibility();
  }

  private getEffectiveStatus(node: RepositoryNode): string {
    const key = node.path.join('|');
    return this.repositorySummaries[key]?.status || 'not_started';
  }

  private nodeMatchesSelf(node: RepositoryNode, query: string): boolean {
    const nameMatches = !query || node.name.toLowerCase().includes(query);
    const statusMatches = this.statusFilter === 'all' || this.getEffectiveStatus(node) === this.statusFilter;
    return nameMatches && statusMatches;
  }

  private addAllDescendants(node: RepositoryNode, visible: Set<string>): void {
    node.children.forEach(child => {
      visible.add(child.path.join('|'));
      this.addAllDescendants(child, visible);
    });
  }

  // Returns true if this node (or any descendant) is visible. When a node matches
  // by itself, its whole subtree is revealed; when only a descendant matches, only
  // the path down to that descendant is revealed (ancestors shown for context).
  private collectVisible(node: RepositoryNode, query: string, visible: Set<string>, expandTargets: Set<string>): boolean {
    const key = node.path.join('|');
    let anyDescendantVisible = false;
    node.children.forEach(child => {
      if (this.collectVisible(child, query, visible, expandTargets)) anyDescendantVisible = true;
    });

    const selfMatches = this.nodeMatchesSelf(node, query);

    if (selfMatches || anyDescendantVisible) {
      visible.add(key);
      if (selfMatches) this.addAllDescendants(node, visible);
      if (anyDescendantVisible) expandTargets.add(key);
      return true;
    }
    return false;
  }

  recomputeVisibility(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const activeFilter = !!query || this.statusFilter !== 'all';

    if (!activeFilter) {
      this.visiblePaths = null;
      return;
    }

    const visible = new Set<string>();
    const expandTargets = new Set<string>();
    this.tree.forEach(root => this.collectVisible(root, query, visible, expandTargets));
    this.visiblePaths = visible;
    expandTargets.forEach(key => this.expandedPaths.add(key));
  }

  private expandAncestors(joinedPath: string): void {
    const segments = joinedPath.split('|').filter(s => !!s);
    const acc: string[] = [];
    segments.forEach(seg => {
      acc.push(seg);
      this.expandedPaths.add(acc.join('|'));
    });
  }

  startAITest(): void {
    if (!this.aiTopic.trim()) {
      alert('Please enter a topic for the AI-powered test');
      return;
    }

    this.isLoadingAI = true;
    this.dataService.generateMCQs(this.aiTopic).subscribe({
      next: (mcqs) => {
        this.isLoadingAI = false;
        const path = ['AI-Generated', this.aiTopic, 'AI-Generated'];
        const testData = {
          questions: mcqs,
          testName: `AI Test: ${this.aiTopic}`,
          path,
          mode: 'practice',
          isAIGenerated: true
        };
        this.router.navigate(['/practice', ...path], { state: { testData } });
      },
      error: (error) => {
        this.isLoadingAI = false;
        console.error('Error generating MCQs:', error);
        alert('Failed to generate questions. Please try again.');
      }
    });
  }

  copyToClipboard(): void {
    alert('Copy to clipboard feature - to be implemented after test generation');
  }

}
