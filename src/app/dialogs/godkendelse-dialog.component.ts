import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { isoDato } from '../core/models';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-godkendelse-dialog',
  imports: [FormsModule],
  templateUrl: './godkendelse-dialog.component.html',
  styles: `
    .linked { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--surface-2); border: 1px solid var(--border); margin-bottom: 16px; }
    .linked .ms { color: var(--primary); }
    .linked small { display: block; color: var(--text-3); font-size: 12px; }
    .approvers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .approvers li { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
    .approvers .num { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); font-size: 12px; font-weight: 700; }
    .approvers .name { flex: 1; min-width: 0; }
    .approvers .name small { display: block; color: var(--text-3); font-size: 12px; }
    .approvers .icon-btn { width: 28px; height: 28px; }
    .approvers .icon-btn .ms { font-size: 18px; }
    .add-row { margin-top: 8px; }
  `,
})
export class GodkendelseDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  private readonly titelFelt = viewChild<ElementRef<HTMLInputElement>>('titelFelt');

  readonly aktId: number | undefined;
  readonly akt = computed(() => (this.aktId != null ? this.d.akt(this.aktId) : undefined));

  titel = '';
  sagId: number | null = null;
  godkendere: string[] = [];
  frist = isoDato(new Date(Date.now() + 3 * 86_400_000));
  besked = '';
  readonly forsoegt = signal(false);
  readonly minDato = isoDato(new Date());

  readonly aabneSager = computed(() => this.d.sager().filter((x) => x.status === 'åben'));

  constructor() {
    const st = this.s.dialog();
    this.aktId = st?.type === 'godkendelse' ? st.aktId : undefined;
    const a = this.akt();
    if (a) {
      this.titel = a.titel;
      this.sagId = a.sagId ?? null;
    }
    afterNextRender(() => this.titelFelt()?.nativeElement.focus());
  }

  get gyldig() {
    return !!this.titel.trim() && this.godkendere.length > 0;
  }

  bruger(id: string) {
    return this.d.bruger(id);
  }

  ledige() {
    return this.d.brugere.filter((b) => !this.godkendere.includes(b.id));
  }

  tilfoej(ev: Event) {
    const sel = ev.target as HTMLSelectElement;
    if (sel.value) this.godkendere = [...this.godkendere, sel.value];
    sel.value = '';
  }

  flyt(i: number, delta: number) {
    const l = [...this.godkendere];
    const j = i + delta;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    this.godkendere = l;
  }

  fjern(i: number) {
    this.godkendere = this.godkendere.filter((_, x) => x !== i);
  }

  luk() {
    this.s.dialog.set(null);
  }

  send() {
    this.forsoegt.set(true);
    if (!this.gyldig) return;
    const a = this.d.opretGodkendelse({
      titel: this.akt() ? this.titel : this.titel.startsWith('Godkendelse:') ? this.titel : `Godkendelse: ${this.titel}`,
      sagId: this.sagId,
      godkenderIds: this.godkendere,
      frist: this.frist,
      besked: this.besked,
      aktId: this.aktId,
    });
    this.luk();
    const foerste = this.d.bruger(this.godkendere[0])?.navn;
    this.s.toast(`Sendt til godkendelse hos ${foerste}`, 'send', {
      navn: 'Vis',
      fn: () => this.s.aabnAkt(a.id),
    });
  }
}
