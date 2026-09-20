import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * How the repository list on the home page is presented.
 *  - 'stepwise'  : pick one level at a time, drilling down from the top (default)
 *  - 'fullTree'  : show the whole hierarchy at once with expand / collapse
 */
export type BrowseLayout = 'stepwise' | 'fullTree';

const KEY_BROWSE_LAYOUT = 'testmate.browseLayout';
const KEY_CONDENSED_LIST = 'testmate.condensedList';
const KEY_REPO_MANAGEMENT = 'testmate.repoManagement';

/**
 * User-facing display preferences for the home page. Persisted to localStorage so
 * a choice sticks across sessions; exposed as observables so open pages react
 * immediately when a setting changes.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly browseLayout$ = new BehaviorSubject<BrowseLayout>(
    this.readString(KEY_BROWSE_LAYOUT) === 'fullTree' ? 'fullTree' : 'stepwise'
  );
  private readonly condensedList$ = new BehaviorSubject<boolean>(
    this.readString(KEY_CONDENSED_LIST) === 'true'
  );
  // Question-authoring tools on the test screen (move / delete question, image
  // upload, bulk-select). Hidden by default - this is a study app first.
  private readonly repoManagement$ = new BehaviorSubject<boolean>(
    this.readString(KEY_REPO_MANAGEMENT) === 'true'
  );

  readonly browseLayout = this.browseLayout$.asObservable();
  readonly condensedList = this.condensedList$.asObservable();
  readonly repoManagement = this.repoManagement$.asObservable();

  get browseLayoutValue(): BrowseLayout {
    return this.browseLayout$.value;
  }

  get condensedListValue(): boolean {
    return this.condensedList$.value;
  }

  get repoManagementValue(): boolean {
    return this.repoManagement$.value;
  }

  setBrowseLayout(value: BrowseLayout): void {
    this.browseLayout$.next(value);
    this.writeString(KEY_BROWSE_LAYOUT, value);
  }

  setCondensedList(value: boolean): void {
    this.condensedList$.next(value);
    this.writeString(KEY_CONDENSED_LIST, String(value));
  }

  setRepoManagement(value: boolean): void {
    this.repoManagement$.next(value);
    this.writeString(KEY_REPO_MANAGEMENT, String(value));
  }

  private readString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeString(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* localStorage unavailable - preference just won't persist */
    }
  }
}
