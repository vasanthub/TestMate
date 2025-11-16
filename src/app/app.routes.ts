import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'repository/:domain/:topic/:repository',
    loadComponent: () => import('./pages/repository/repository.component').then(m => m.RepositoryComponent)
  },
  {
    path: 'test/:domain/:topic/:repository',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
  },
  {
    path: 'ai-test',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
  },
  {
    path: 'practice/:domain/:topic/:repository',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
