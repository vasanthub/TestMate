import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-profile-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-select.component.html',
  styleUrls: ['./profile-select.component.scss']
})
export class ProfileSelectComponent {
  readonly profiles: readonly string[];
  readonly current: string;

  constructor(private data: DataService, private router: Router) {
    this.profiles = data.availableProfiles;
    this.current = data.hasProfile() ? data.getProfileName() : '';
  }

  choose(name: string): void {
    this.data.setProfileName(name);
    this.router.navigateByUrl('/');
  }
}
