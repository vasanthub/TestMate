import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SettingsService, BrowseLayout } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  browseLayout: BrowseLayout;
  condensedList: boolean;
  repoManagement: boolean;

  constructor(private settings: SettingsService) {
    this.browseLayout = settings.browseLayoutValue;
    this.condensedList = settings.condensedListValue;
    this.repoManagement = settings.repoManagementValue;
  }

  setBrowseLayout(value: BrowseLayout): void {
    this.browseLayout = value;
    this.settings.setBrowseLayout(value);
  }

  setCondensedList(value: boolean): void {
    this.condensedList = value;
    this.settings.setCondensedList(value);
  }

  setRepoManagement(value: boolean): void {
    this.repoManagement = value;
    this.settings.setRepoManagement(value);
  }
}
