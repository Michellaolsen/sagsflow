import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { AKT_TYPER, Akt, AktType, flagInfo, isoDato } from '../core/models';
import { StateService } from '../core/state.service';

interface Frist {
  akt: Akt;
  dato: string;
  hvad: string;
  farve: string;
}

interface Dag {
  iso: string;
  nr: number;
  iMaaned: boolean;
}

@Component({
  selector: 'app-kalender-dialog',
  imports: [DatePipe],
  templateUrl: './kalender-dialog.component.html',
  styleUrl: './kalender-dialog.component.scss',
})
export class KalenderDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  readonly idag = isoDato(new Date());
  readonly ugedage = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  readonly visning = signal<'kalender' | 'paamindelser'>(
    this.s.dialog()?.type === 'paamindelser' ? 'paamindelser' : 'kalender',
  );
  readonly maaned = signal(this.foersteIMaaned(new Date()));
  readonly valgtDag = signal(this.idag);

  /** Alle frister på tværs af akter: eget flag, teamflag og godkendelsesfrister. */
  readonly frister = computed<Frist[]>(() => {
    const res: Frist[] = [];
    for (const a of this.d.akter()) {
      if (a.placering === 'slettet') continue;
      if (a.mitFlag.frist) {
        res.push({ akt: a, dato: a.mitFlag.frist, hvad: 'Min frist', farve: this.farve(a.mitFlag.farve, '#3a6df0') });
      }
      if (a.teamFlag.frist) {
        res.push({ akt: a, dato: a.teamFlag.frist, hvad: 'Teamfrist', farve: this.farve(a.teamFlag.farve, '#1f9d8a') });
      }
      if (a.godkendelse?.status === 'afventer' && a.godkendelse.frist) {
        res.push({ akt: a, dato: a.godkendelse.frist, hvad: 'Godkendelsesfrist', farve: '#e8a317' });
      }
    }
    return res.sort((x, y) => x.dato.localeCompare(y.dato));
  });

  readonly prDag = computed(() => {
    const m = new Map<string, Frist[]>();
    for (const f of this.frister()) m.set(f.dato, [...(m.get(f.dato) ?? []), f]);
    return m;
  });

  readonly dage = computed<Dag[]>(() => {
    const foerste = this.maaned();
    const forskyd = (foerste.getDay() + 6) % 7; // mandag = 0
    const start = new Date(foerste);
    start.setDate(1 - forskyd);
    return Array.from({ length: 42 }, (_, i) => {
      const dag = new Date(start);
      dag.setDate(start.getDate() + i);
      return { iso: isoDato(dag), nr: dag.getDate(), iMaaned: dag.getMonth() === foerste.getMonth() };
    });
  });

  readonly valgteFrister = computed(() => this.prDag().get(this.valgtDag()) ?? []);

  readonly grupper = computed(() => {
    const alle = this.frister();
    return [
      { navn: 'Overskredet', tone: 'over', frister: alle.filter((f) => f.dato < this.idag) },
      { navn: 'I dag', tone: 'idag', frister: alle.filter((f) => f.dato === this.idag) },
      { navn: 'Kommende', tone: '', frister: alle.filter((f) => f.dato > this.idag) },
    ].filter((g) => g.frister.length);
  });

  skiftMaaned(delta: number) {
    const m = new Date(this.maaned());
    m.setMonth(m.getMonth() + delta);
    this.maaned.set(m);
  }

  gaaTilIdag() {
    this.maaned.set(this.foersteIMaaned(new Date()));
    this.valgtDag.set(this.idag);
  }

  vaelg(dag: Dag) {
    this.valgtDag.set(dag.iso);
    if (!dag.iMaaned) this.maaned.set(this.foersteIMaaned(new Date(dag.iso + 'T12:00')));
  }

  aabn(f: Frist) {
    this.luk();
    this.s.aabnAkt(f.akt.id);
  }

  typeIkon(t: AktType) {
    return AKT_TYPER[t].ikon;
  }

  datoFraIso(iso: string) {
    return new Date(iso + 'T12:00');
  }

  luk() {
    this.s.dialog.set(null);
  }

  private farve(f: Parameters<typeof flagInfo>[0], standard: string) {
    return f ? flagInfo(f).farve : standard;
  }

  private foersteIMaaned(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}
