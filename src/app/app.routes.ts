import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'repository',
    children: [
      { path: '**', loadComponent: () => import('./pages/repository/repository.component').then(m => m.RepositoryComponent) }
    ]
  },
  {
    path: 'test',
    children: [
      { path: '**', loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent) }
    ]
  },
  {
    path: 'ai-test',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent)
  },
  {
    path: 'practice',
    children: [
      { path: '**', loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent) }
    ]
  },
{
    path: 'jsonview',
    loadComponent: () => import('./pages/jsonview/json-viewer.component').then(m => m.JsonViewerComponent)
  },  
  {
    path: '**',
    redirectTo: ''
  }
];
