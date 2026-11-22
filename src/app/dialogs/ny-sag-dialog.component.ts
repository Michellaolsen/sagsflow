import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-ny-sag-dialog',
  imports: [FormsModule],
  template: `
    <div class="dlg-backdrop" (click)="luk()">
      <form class="dlg" role="dialog" aria-modal="true" aria-labelledby="ns-titel" (click)="$event.stopPropagation()" (ngSubmit)="opret()">
        <div class="dlg-head">
          <span class="dlg-icon"><span class="ms">create_new_folder</span></span>
          <div>
            <h2 id="ns-titel">Ny sag</h2>
            <p>Sagen får automatisk et sagsnummer.</p>
          </div>
          <button type="button" class="icon-btn" (click)="luk()" aria-label="Luk"><span class="ms">close</span></button>
        </div>
        <div class="dlg-body">
          <div class="field">
            <label for="ns-titel-felt">Sagstitel</label>
            <input #titelFelt id="ns-titel-felt" name="titel" class="input" autocomplete="off"
              placeholder="Fx Indkøb af mødelokaleudstyr"
              [class.invalid]="forsoegt() && !titel.trim()" [(ngModel)]="titel" />
            @if (forsoegt() && !titel.trim()) {
              <span class="error">Titlen skal udfyldes.</span>
            }
          </div>
          <div class="field">
            <label for="ns-ansvarlig">Sagsansvarlig</label>
            <select id="ns-ansvarlig" name="ansvarlig" class="select" [(ngModel)]="ansvarligId">
              @for (b of d.brugere; track b.id) {
                <option [value]="b.id">{{ b.navn }}{{ b.id === d.mig.id ? ' (dig)' : '' }}</option>
              }
            </select>
          </div>
        </div>
        <div class="dlg-foot">
          <button type="button" class="btn btn-secondary" (click)="luk()">Annullér</button>
          <button type="submit" class="btn btn-primary">Opret sag</button>
        </div>
      </form>
    </div>
  `,
})
export class NySagDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);
  private readonly titelFelt = viewChild<ElementRef<HTMLInputElement>>('titelFelt');

  titel = '';
  ansvarligId = this.d.mig.id;
  readonly forsoegt = signal(false);

  constructor() {
    afterNextRender(() => this.titelFelt()?.nativeElement.focus());
  }

  luk() {
    this.s.dialog.set(null);
  }

  opret() {
    this.forsoegt.set(true);
    if (!this.titel.trim()) return;
    const sag = this.d.opretSag(this.titel, this.ansvarligId);
    this.luk();
    this.s.gaaTilSag(sag.id);
    this.s.toast(`Sag ${sag.nummer} er oprettet`, 'create_new_folder');
  }
}
