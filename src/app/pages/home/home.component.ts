import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';
import { DomainStructure } from '../../models/question.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  domainStructure: DomainStructure = {};
  domains: string[] = [];
  loading = true;

  constructor(private dataService: DataService) {}

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

  getTopics(domain: string): string[] {
    return Object.keys(this.domainStructure[domain] || {});
  }

  getRepositories(domain: string, topic: string): string[] {
    const repos = this.domainStructure[domain]?.[topic] || [];
    // Sort alphabetically
    return repos.sort((a, b) => a.localeCompare(b));
  }
}