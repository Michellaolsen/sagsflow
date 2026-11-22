import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { AKT_TYPER, Flag, GodkendelsesTrin, aktueltTrin, flagInfo, isoDato, venterPaa } from '../core/models';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-preview',
  imports: [DatePipe],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss',
})
export class PreviewComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  /** Sæt for at vise en bestemt akt (fuld visning i egen fane). Ellers vises den valgte akt. */
  readonly aktId = input<number | null>(null);

  readonly kommentar = signal('');

  readonly fuld = computed(() => this.aktId() != null);
  readonly akt = computed(() => this.d.akt(this.aktId() ?? this.s.fokusId()));
  readonly flereValgt = computed(() => !this.fuld() && this.s.valgte().size > 1);

  readonly type = computed(() => AKT_TYPER[this.akt()?.type ?? 'akt']);
  readonly fra = computed(() => this.d.bruger(this.akt()?.fraId));
  readonly til = computed(() => (this.akt()?.tilIds ?? []).map((id) => this.d.bruger(id)).filter((b) => !!b));
  readonly sag = computed(() => this.d.sag(this.akt()?.sagId));
  readonly venterPaaMig = computed(() => {
    const a = this.akt();
    return !!a && venterPaa(a, this.d.mig.id);
  });
  readonly erMin = computed(() => this.akt()?.fraId === this.d.mig.id);

  bruger(id: string) {
    return this.d.bruger(id);
  }

  flag(f: Flag) {
    return flagInfo(f.farve);
  }

  erAktuelt(t: GodkendelsesTrin) {
    const a = this.akt();
    return !!a && aktueltTrin(a) === t;
  }

  fristStatus(iso: string): 'over' | 'idag' | '' {
    if (!iso) return '';
    const idag = isoDato(new Date());
    return iso < idag ? 'over' : iso === idag ? 'idag' : '';
  }

  trinIkon(t: GodkendelsesTrin) {
    return t.status === 'godkendt' ? 'check' : t.status === 'afvist' ? 'close' : 'schedule';
  }

  godkend() {
    const a = this.akt();
    if (!a) return;
    this.d.godkend(a.id, this.kommentar());
    this.kommentar.set('');
    this.s.toast(`Du har godkendt “${a.titel}”`, 'verified');
  }

  afvis() {
    const a = this.akt();
    if (!a) return;
    this.d.afvis(a.id, this.kommentar());
    this.kommentar.set('');
    this.s.toast(`Du har afvist “${a.titel}”`, 'block');
  }

  luk() {
    this.s.nulstilValg();
  }
}
