import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { AKT_TYPER, AktType, Soegekriterier, TOMME_KRITERIER } from '../core/models';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-soegning-dialog',
  imports: [FormsModule],
  template: `
    <div class="dlg-backdrop" (click)="luk()">
      <form class="dlg" role="dialog" aria-modal="true" aria-labelledby="sg-titel" (click)="$event.stopPropagation()" (ngSubmit)="soeg()">
        <div class="dlg-head">
          <span class="dlg-icon"><span class="ms">manage_search</span></span>
          <div>
            <h2 id="sg-titel">Avanceret søgning</h2>
            <p>Søg på tværs af alle akter. Resultatet åbner i en ny fane.</p>
          </div>
          <button type="button" class="icon-btn" (click)="luk()" aria-label="Luk"><span class="ms">close</span></button>
        </div>
        <div class="dlg-body">
          <div class="field">
            <label for="sg-tekst">Fritekst</label>
            <input #tekstFelt id="sg-tekst" name="tekst" class="input" placeholder="Titel, indhold, afsender, sagsnummer…" [(ngModel)]="k.tekst" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="sg-type">Type</label>
              <select id="sg-type" name="type" class="select" [(ngModel)]="k.type">
                <option value="">Alle typer</option>
                @for (t of typer; track t.id) {
                  <option [value]="t.id">{{ t.navn }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="sg-fra">Fra</label>
              <select id="sg-fra" name="fra" class="select" [(ngModel)]="k.fraId">
                <option value="">Alle afsendere</option>
                @for (b of d.brugere; track b.id) {
                  <option [value]="b.id">{{ b.navn }}</option>
                }
              </select>
            </div>
          </div>
          <div class="field">
            <label for="sg-sag">Sag</label>
            <select id="sg-sag" name="sag" class="select" [(ngModel)]="k.sagId">
              <option [ngValue]="null">Alle sager</option>
              @for (sg of d.sager(); track sg.id) {
                <option [ngValue]="sg.id">{{ sg.nummer }} · {{ sg.titel }}</option>
              }
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="sg-fradato">Brevdato fra</label>
              <input id="sg-fradato" name="fraDato" type="date" class="input" [(ngModel)]="k.fraDato" />
            </div>
            <div class="field">
              <label for="sg-tildato">Brevdato til</label>
              <input id="sg-tildato" name="tilDato" type="date" class="input" [(ngModel)]="k.tilDato" />
            </div>
          </div>
          <div class="field">
            <label for="sg-emne">Emneord</label>
            <input id="sg-emne" name="emneord" class="input" list="sg-emneord" placeholder="Fx Budget" [(ngModel)]="k.emneord" />
            <datalist id="sg-emneord">
              @for (e of d.emneordForslag; track e) {
                <option [value]="e"></option>
              }
            </datalist>
          </div>
          <label class="checkbox">
            <input type="checkbox" name="frist" [(ngModel)]="k.kunMedFrist" />
            Kun akter med frist
          </label>
        </div>
        <div class="dlg-foot">
          <button type="button" class="btn btn-ghost" (click)="nulstil()">Nulstil</button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-secondary" (click)="luk()">Annullér</button>
          <button type="submit" class="btn btn-primary"><span class="ms">search</span>Søg</button>
        </div>
      </form>
    </div>
  `,
})
export class SoegningDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);
  private readonly tekstFelt = viewChild<ElementRef<HTMLInputElement>>('tekstFelt');

  readonly typer = (Object.keys(AKT_TYPER) as AktType[]).map((id) => ({ id, navn: AKT_TYPER[id].navn }));
  k: Soegekriterier;

  constructor() {
    const st = this.s.dialog();
    this.k = { ...TOMME_KRITERIER, ...(st?.type === 'soegning' ? st.kriterier : {}) };
    afterNextRender(() => this.tekstFelt()?.nativeElement.focus());
  }

  nulstil() {
    this.k = { ...TOMME_KRITERIER };
  }

  luk() {
    this.s.dialog.set(null);
  }

  soeg() {
    this.luk();
    this.s.soeg({ ...this.k });
  }
}
