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

  getTopics(domain: string): string[] {
    return Object.keys(this.domainStructure[domain] || {});
  }

  getRepositories(domain: string, topic: string): string[] {
    const repos = this.domainStructure[domain]?.[topic] || [];
    // Sort alphabetically
    return repos.sort((a, b) => a.localeCompare(b));
  }

  startAITest(): void {
    if (!this.aiTopic.trim()) {
      alert('Please enter a topic for the AI-powered test');
      return;
    }

//   this.router.navigate(['/practice', 'this.domain', 'this.topic', 'this.repository'], {  });

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
    // This will be implemented when questions are generated
    alert('Copy to clipboard feature - to be implemented after test generation');
  }
  
}