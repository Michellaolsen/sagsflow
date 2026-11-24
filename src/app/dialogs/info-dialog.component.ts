import { Component, inject } from '@angular/core';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-info-dialog',
  template: `
    <div class="dlg-backdrop" (click)="luk()">
      <div class="dlg" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        @if (s.dialog()?.type === 'genveje') {
          <div class="dlg-head">
            <span class="dlg-icon"><span class="ms">keyboard</span></span>
            <div><h2>Tastaturgenveje</h2><p>Arbejd hurtigere uden mus.</p></div>
            <button class="icon-btn" (click)="luk()" aria-label="Luk"><span class="ms">close</span></button>
          </div>
          <div class="dlg-body">
            <table class="keys">
              @for (g of genveje; track g[0]) {
                <tr><td><kbd>{{ g[0] }}</kbd></td><td>{{ g[1] }}</td></tr>
              }
            </table>
          </div>
        } @else {
          <div class="dlg-head">
            <span class="dlg-icon"><span class="ms">folder_managed</span></span>
            <div><h2>Om Sagsflow</h2><p>Godkendelses- og sagsbehandlingssystem · version 0.1</p></div>
            <button class="icon-btn" (click)="luk()" aria-label="Luk"><span class="ms">close</span></button>
          </div>
          <div class="dlg-body">
            <p>Prototype bygget i Angular. Data gemmes lokalt i din browser, så du kan afprøve alle funktioner uden en server.</p>
            <p>Brug <strong>Værktøjer → Nulstil demodata</strong> for at starte forfra.</p>
          </div>
        }
        <div class="dlg-foot">
          <button class="btn btn-primary" (click)="luk()">Luk</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .keys { width: 100%; border-collapse: collapse; font-size: 14px; }
    .keys td { padding: 8px 4px; border-bottom: 1px solid var(--border); }
    .keys td:first-child { width: 150px; }
    kbd { font-family: inherit; font-size: 12px; padding: 2px 8px; border: 1px solid var(--border-strong); border-bottom-width: 2px; border-radius: 6px; background: var(--surface-2); }
    p { margin: 0 0 12px; color: var(--text-2); }
  `,
})
export class InfoDialogComponent {
  readonly s = inject(StateService);

  readonly genveje: [string, string][] = [
    ['Alt + N', 'Ny akt'],
    ['Alt + M', 'Ny e-mail'],
    ['Alt + G', 'Ny godkendelse'],
    ['Alt + F', 'Avanceret søgning'],
    ['Alt + K', 'Åbn kalender'],
    ['/', 'Gå til søgefeltet'],
    ['↑ / ↓', 'Flyt markering i listen'],
    ['Enter', 'Åbn valgt akt i ny fane'],
    ['Ctrl + A', 'Vælg alle i listen'],
    ['Ctrl + klik', 'Vælg flere akter'],
    ['Shift + klik', 'Vælg et interval'],
    ['Delete', 'Slet valgte akter'],
    ['Esc', 'Luk dialog'],
  ];

  luk() {
    this.s.dialog.set(null);
  }
}
