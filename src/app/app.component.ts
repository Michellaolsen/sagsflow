import { DatePipe } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { DataService } from './core/data.service';
import { StateService } from './core/state.service';
import { GodkendelseDialogComponent } from './dialogs/godkendelse-dialog.component';
import { InfoDialogComponent } from './dialogs/info-dialog.component';
import { KalenderDialogComponent } from './dialogs/kalender-dialog.component';
import { NyAktDialogComponent } from './dialogs/ny-akt-dialog.component';
import { NySagDialogComponent } from './dialogs/ny-sag-dialog.component';
import { SoegningDialogComponent } from './dialogs/soegning-dialog.component';
import { ListeComponent } from './layout/liste.component';
import { PreviewComponent } from './layout/preview.component';
import { RibbonComponent } from './layout/ribbon.component';
import { SidebarComponent } from './layout/sidebar.component';

@Component({
  selector: 'app-root',
  imports: [
    DatePipe,
    RibbonComponent,
    SidebarComponent,
    ListeComponent,
    PreviewComponent,
    NyAktDialogComponent,
    GodkendelseDialogComponent,
    SoegningDialogComponent,
    KalenderDialogComponent,
    NySagDialogComponent,
    InfoDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  readonly s = inject(StateService);
  readonly d = inject(DataService);
  readonly sidebarAaben = signal(false);

  private readonly nu = signal(Date.now());
  private readonly ur = setInterval(() => this.nu.set(Date.now()), 30_000);

  readonly minutterSiden = computed(() =>
    Math.max(0, Math.floor((this.nu() - this.d.opdateret().getTime()) / 60_000)),
  );

  ngOnDestroy() {
    clearInterval(this.ur);
  }

  opdater() {
    this.d.stempel();
    this.nu.set(Date.now());
  }

  @HostListener('document:keydown', ['$event'])
  tast(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.s.dialog()) {
      this.s.dialog.set(null);
      return;
    }
    if (this.s.dialog()) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const handlinger: Record<string, () => void> = {
        n: () => this.s.nyAkt('akt'),
        m: () => this.s.nyAkt('email'),
        g: () => this.s.dialog.set({ type: 'godkendelse' }),
        f: () => this.s.dialog.set({ type: 'soegning' }),
        k: () => this.s.dialog.set({ type: 'kalender' }),
      };
      const fn = handlinger[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
      return;
    }

    const maal = e.target as HTMLElement | null;
    if (maal?.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('liste-soeg')?.focus();
    }
  }
}
