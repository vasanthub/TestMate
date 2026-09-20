import { Routes } from '@angular/router';
import { profileGuard } from './guards/profile.guard';

export const routes: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile-select.component').then(m => m.ProfileSelectComponent)
  },
  {
    path: '',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'repository',
    canActivate: [profileGuard],
    children: [
      { path: '**', loadComponent: () => import('./pages/repository/repository.component').then(m => m.RepositoryComponent) }
    ]
  },
  {
    path: 'test',
    canActivate: [profileGuard],
    children: [
      { path: '**', loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent) }
    ]
  },
  {
    path: 'ai-test',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
  },
  {
    path: 'practice',
    canActivate: [profileGuard],
    children: [
      { path: '**', loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent) }
    ]
  },
{
    path: 'jsonview',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/jsonview/json-viewer.component').then(m => m.JsonViewerComponent)
  },
  {
    path: 'settings',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'library',
    canActivate: [profileGuard],
    loadComponent: () => import('./pages/library/repo-library.component').then(m => m.RepoLibraryComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
