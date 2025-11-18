import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DomainStructure } from '../../models/question.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  activeTab: 'predefined' | 'ai' = 'predefined';
  domainStructure: DomainStructure = {};
  domains: string[] = [];
  loading = true;
  aiTopic: string = '';
  isLoadingAI: boolean = false;

  expandedDomains: { [key: string]: boolean } = {};
  expandedTopics: { [key: string]: boolean } = {};
  
  searchQuery: string = '';
  filteredDomains: string[] = [];
  filteredTopics: { [domain: string]: string[] } = {};
  filteredRepos: { [key: string]: string[] } = {};

  repositoryStatuses: { [key: string]: string } = {};
  statusFilter: string = 'all';
  openStatusMenu: string | null = null;

  constructor(private route: ActivatedRoute,
    private router: Router, private dataService: DataService) {}

  ngOnInit(): void {
    this.loadStructure();
    this.loadRepositoryStatuses();
  }

  loadStructure(): void {
    this.dataService.getDomainStructure().subscribe({
      next: (structure) => {
        this.domainStructure = structure;
        this.domains = Object.keys(structure);
        this.filteredDomains = [...this.domains];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading structure:', err);
        this.loading = false;
      }
    });
  }

  loadRepositoryStatuses(): void {
    this.dataService.getRepositoryStatuses().subscribe({
      next: (statuses) => {
        this.repositoryStatuses = statuses;
      },
      error: (err) => {
        console.error('Error loading repository statuses:', err);
      }
    });
  }

  getRepositoryStatus(domain: string, topic: string, repository: string): string {
    const key = `${domain}|${topic}|${repository}`;
    return this.repositoryStatuses[key] || 'not_started';
  }

  updateRepositoryStatus(domain: string, topic: string, repository: string, status: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.dataService.updateRepositoryStatus(domain, topic, repository, status).subscribe({
      next: () => {
        const key = `${domain}|${topic}|${repository}`;
        this.repositoryStatuses[key] = status;
        this.openStatusMenu = null;
      },
      error: (err) => {
        console.error('Error updating repository status:', err);
      }
    });
  }

  toggleStatusMenu(domain: string, topic: string, repository: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const key = `${domain}|${topic}|${repository}`;
    if (this.openStatusMenu === key) {
      this.openStatusMenu = null;
    } else {
      this.openStatusMenu = key;
    }
  }

  isStatusMenuOpen(domain: string, topic: string, repository: string): boolean {
    return this.openStatusMenu === `${domain}|${topic}|${repository}`;
  }

  switchTab(tab: 'predefined' | 'ai'): void {
    this.activeTab = tab;
  }

  toggleDomain(domain: string): void {
    this.expandedDomains[domain] = !this.expandedDomains[domain];
  }

  isDomainExpanded(domain: string): boolean {
    return this.expandedDomains[domain] === true;
  }

  toggleTopic(domain: string, topic: string): void {
    const key = `${domain}-${topic}`;
    this.expandedTopics[key] = !this.expandedTopics[key];
  }

  isTopicExpanded(domain: string, topic: string): boolean {
    const key = `${domain}-${topic}`;
    return this.expandedTopics[key] === true;
  }

  expandAll(): void {
    this.domains.forEach(domain => {
      this.expandedDomains[domain] = true;
      this.getTopics(domain).forEach(topic => {
        const key = `${domain}-${topic}`;
        this.expandedTopics[key] = true;
      });
    });
  }

  collapseAll(): void {
    this.expandedDomains = {};
    this.expandedTopics = {};
  }

  onSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      this.applyFilters();
      return;
    }

    this.filteredDomains = [];
    this.filteredTopics = {};
    this.filteredRepos = {};

    this.domains.forEach(domain => {
      const topics = this.getTopics(domain);
      const matchingTopics: string[] = [];
      let domainMatches = domain.toLowerCase().includes(query);

      topics.forEach(topic => {
        const repos = this.getRepositories(domain, topic);
        const matchingRepos = repos.filter(repo => 
          repo.toLowerCase().includes(query)
        );

        const topicMatches = topic.toLowerCase().includes(query);

        if (topicMatches || matchingRepos.length > 0 || domainMatches) {
          matchingTopics.push(topic);
          const key = `${domain}-${topic}`;
          this.filteredRepos[key] = matchingRepos.length > 0 ? matchingRepos : repos;
          
          if (query) {
            this.expandedDomains[domain] = true;
            this.expandedTopics[key] = true;
          }
        }
      });

      if (domainMatches || matchingTopics.length > 0) {
        this.filteredDomains.push(domain);
        this.filteredTopics[domain] = matchingTopics;
      }
    });

    this.applyStatusFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    this.filteredDomains = [];
    this.filteredTopics = {};
    this.filteredRepos = {};

    this.domains.forEach(domain => {
      const topics = this.getTopics(domain);
      const matchingTopics: string[] = [];
      let domainMatches = !query || domain.toLowerCase().includes(query);

      topics.forEach(topic => {
        const repos = this.getRepositories(domain, topic);
        let matchingRepos = repos;

        if (query) {
          matchingRepos = repos.filter(repo => 
            repo.toLowerCase().includes(query)
          );
        }

        if (this.statusFilter !== 'all') {
          matchingRepos = matchingRepos.filter(repo => 
            this.getRepositoryStatus(domain, topic, repo) === this.statusFilter
          );
        }

        const topicMatches = !query || topic.toLowerCase().includes(query);

        if ((topicMatches || matchingRepos.length > 0 || domainMatches) && 
            (this.statusFilter === 'all' || matchingRepos.length > 0)) {
          matchingTopics.push(topic);
          const key = `${domain}-${topic}`;
          this.filteredRepos[key] = matchingRepos;
          
          if (query || this.statusFilter !== 'all') {
            this.expandedDomains[domain] = true;
            this.expandedTopics[key] = true;
          }
        }
      });

      if ((domainMatches || matchingTopics.length > 0) && 
          (this.statusFilter === 'all' || matchingTopics.length > 0)) {
        this.filteredDomains.push(domain);
        this.filteredTopics[domain] = matchingTopics;
      }
    });
  }

  applyStatusFilter(): void {
    if (this.statusFilter === 'all') return;

    const newFilteredDomains: string[] = [];
    const newFilteredTopics: { [domain: string]: string[] } = {};
    const newFilteredRepos: { [key: string]: string[] } = {};

    this.filteredDomains.forEach(domain => {
      const topics = this.filteredTopics[domain] || this.getTopics(domain);
      const matchingTopics: string[] = [];

      topics.forEach(topic => {
        const key = `${domain}-${topic}`;
        const repos = this.filteredRepos[key] || this.getRepositories(domain, topic);
        const matchingRepos = repos.filter(repo => 
          this.getRepositoryStatus(domain, topic, repo) === this.statusFilter
        );

        if (matchingRepos.length > 0) {
          matchingTopics.push(topic);
          newFilteredRepos[key] = matchingRepos;
        }
      });

      if (matchingTopics.length > 0) {
        newFilteredDomains.push(domain);
        newFilteredTopics[domain] = matchingTopics;
      }
    });

    this.filteredDomains = newFilteredDomains;
    this.filteredTopics = newFilteredTopics;
    this.filteredRepos = newFilteredRepos;
  }

  getFilteredDomains(): string[] {
    return this.searchQuery || this.statusFilter !== 'all' ? this.filteredDomains : this.domains;
  }

  getFilteredTopics(domain: string): string[] {
    if ((this.searchQuery || this.statusFilter !== 'all') && this.filteredTopics[domain]) {
      return this.filteredTopics[domain];
    }
    return this.getTopics(domain);
  }

  getFilteredRepositories(domain: string, topic: string): string[] {
    const key = `${domain}-${topic}`;
    if ((this.searchQuery || this.statusFilter !== 'all') && this.filteredRepos[key]) {
      return this.filteredRepos[key];
    }
    return this.getRepositories(domain, topic);
  }

  highlightMatch(text: string): string {
    if (!this.searchQuery) return text;
    
    const query = this.searchQuery.trim();
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  getTopics(domain: string): string[] {
    return Object.keys(this.domainStructure[domain] || {});
  }

  getRepositories(domain: string, topic: string): string[] {
    const repos = this.domainStructure[domain]?.[topic] || [];
    return repos.sort((a, b) => a.localeCompare(b));
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
        const testData = {
          questions: mcqs,
          testName: `AI Test: ${this.aiTopic}`,
          domain: 'AI-Generated',
          topic: this.aiTopic,
          repository: 'AI-Generated',
          mode: 'practice',
          isAIGenerated: true
        };
        console.log(testData);
        console.log('calling test component...');
        
        this.router.navigate(['/practice', 'this.domain', 'this.topic', 'this.repository'], { state: { testData }  });

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