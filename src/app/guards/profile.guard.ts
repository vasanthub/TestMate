import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DataService } from '../services/data.service';

/**
 * Every page needs a profile so results are stored against someone. If none is
 * known yet (app opened directly, no ?profileName= and nothing remembered), send
 * the user to the profile picker first.
 */
export const profileGuard: CanActivateFn = () => {
  const data = inject(DataService);
  const router = inject(Router);
  return data.hasProfile() ? true : router.createUrlTree(['/profile']);
};
