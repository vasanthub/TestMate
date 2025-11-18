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

  constructor(private route: ActivatedRoute,
    private router: Router, private dataService: DataService) {}

  ngOnInit(): void {
    this.loadStructure();
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
      this.filteredDomains = [...this.domains];
      this.filteredTopics = {};
      this.filteredRepos = {};
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
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  getFilteredDomains(): string[] {
    return this.searchQuery ? this.filteredDomains : this.domains;
  }

  getFilteredTopics(domain: string): string[] {
    if (this.searchQuery && this.filteredTopics[domain]) {
      return this.filteredTopics[domain];
    }
    return this.getTopics(domain);
  }

  getFilteredRepositories(domain: string, topic: string): string[] {
    const key = `${domain}-${topic}`;
    if (this.searchQuery && this.filteredRepos[key]) {
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