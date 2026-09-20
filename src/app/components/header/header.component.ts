import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  profileName: string = '';
  isTestRoute: boolean = false;
  repoManagement: boolean = false;

  constructor(
    private dataService: DataService,
    private router: Router,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {
    this.dataService.profileName.subscribe(name => this.profileName = name);
    this.updateIsTestRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateIsTestRoute(event.urlAfterRedirects));
    this.settings.repoManagement.subscribe(on => this.repoManagement = on);
  }

  setRepoManagement(value: boolean): void {
    this.settings.setRepoManagement(value);
  }

  private updateIsTestRoute(url: string): void {
    this.isTestRoute = /^\/(test|practice|ai-test)(\/|$|\?)/.test(url);
  }
}
