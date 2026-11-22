import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { DataService } from '../core/data.service';
import { LISTE_MAP } from '../core/lister';
import { AKT_TYPER, Akt, AktType, FlagFarve, flagInfo } from '../core/models';
import { FilterId, MainTab, SoegeFelt, SortKol, StateService } from '../core/state.service';

@Component({
  selector: 'app-liste',
  imports: [DatePipe],
  templateUrl: './liste.component.html',
  styleUrl: './liste.component.scss',
})
export class ListeComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  readonly menu = signal<'filter' | 'kriterier' | null>(null);

  readonly visningsFaner: { id: MainTab; navn: string }[] = [
    { id: 'akter', navn: 'Akter' },
    { id: 'sager', navn: 'Sager' },
    { id: 'dokumenter', navn: 'Dokumenter' },
    { id: 'bestillinger', navn: 'Bestillinger' },
  ];

  readonly filterValg: { id: FilterId; navn: string; ikon: string }[] = [
    { id: 'ulaeste', navn: 'Kun ulæste', ikon: 'mark_email_unread' },
    { id: 'flag', navn: 'Med flag', ikon: 'flag' },
    { id: 'frist', navn: 'Med frist', ikon: 'event' },
    { id: 'favorit', navn: 'Favoritter', ikon: 'star' },
    { id: 'godkendelse', navn: 'Godkendelser', ikon: 'verified' },
  ];

  readonly feltValg: { id: SoegeFelt; navn: string }[] = [
    { id: 'titel', navn: 'Titel' },
    { id: 'fra', navn: 'Afsender' },
    { id: 'sag', navn: 'Sagsnummer og -titel' },
    { id: 'emneord', navn: 'Emneord' },
    { id: 'tekst', navn: 'Indhold' },
  ];

  readonly kolonner: { id: SortKol; navn: string; cls: string }[] = [
    { id: 'titel', navn: 'Titel', cls: 'c-titel' },
    { id: 'brevdato', navn: 'Brevdato', cls: 'c-dato' },
    { id: 'sorteringsdato', navn: 'Sorteringsdato', cls: 'c-dato2' },
    { id: 'fra', navn: 'Fra', cls: 'c-fra' },
    { id: 'sag', navn: 'Sagsnummer', cls: 'c-sag' },
  ];

  readonly fane = this.s.aktivFane;
  readonly fanesSag = computed(() => {
    const f = this.fane();
    return f.kind === 'sag' ? this.d.sag(f.sagId) : undefined;
  });

  readonly harAktivtFilter = computed(() => !!this.s.soegetekst().trim() || this.s.filtre().size > 0);

  readonly tom = computed(() => {
    if (this.harAktivtFilter()) {
      return { ikon: 'search_off', titel: 'Ingen resultater', tekst: 'Prøv at ændre din søgning eller dine filtre.' };
    }
    const f = this.fane();
    const tekst =
      f.kind === 'liste' ? LISTE_MAP[f.listeId!].tomBesked : f.kind === 'sag' ? 'Sagen har ingen akter endnu.' : 'Søgningen gav ingen resultater.';
    return { ikon: 'inbox', titel: 'Listen er tom', tekst };
  });

  toggle(m: 'filter' | 'kriterier', e: Event) {
    e.stopPropagation();
    this.menu.set(this.menu() === m ? null : m);
  }

  @HostListener('document:click')
  lukMenu() {
    this.menu.set(null);
  }

  toggleFilter(id: FilterId) {
    const s = new Set(this.s.filtre());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.s.filtre.set(s);
  }

  rydFiltre() {
    this.s.filtre.set(new Set());
  }

  toggleFelt(id: SoegeFelt) {
    const s = new Set(this.s.soegefelter());
    if (s.has(id)) {
      if (s.size === 1) return;
      s.delete(id);
    } else s.add(id);
    this.s.soegefelter.set(s);
  }

  sorter(kol: SortKol) {
    const nu = this.s.sortering();
    const tekstKol = kol === 'titel' || kol === 'fra' || kol === 'sag';
    this.s.sortering.set({
      kol,
      retning: nu.kol === kol ? (nu.retning === 1 ? -1 : 1) : tekstKol ? 1 : -1,
    });
  }

  tast(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.s.flytValg(1);
        this.rulTilValgt();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.s.flytValg(-1);
        this.rulTilValgt();
        break;
      case 'Enter':
        if (this.s.fokusId() != null) this.s.aabnAkt(this.s.fokusId()!);
        break;
      case 'Delete':
        this.s.slet();
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.s.vaelgAlle();
        }
        break;
    }
  }

  private rulTilValgt() {
    setTimeout(() => this.grid()?.nativeElement.querySelector('tr.focus')?.scrollIntoView({ block: 'nearest' }));
  }

  typeIkon(t: AktType) {
    return AKT_TYPER[t].ikon;
  }
  typeNavn(t: AktType) {
    return AKT_TYPER[t].navn;
  }
  flagFarve(f: FlagFarve) {
    return flagInfo(f).farve;
  }
  fraNavn(a: Akt) {
    return this.d.bruger(a.fraId)?.navn ?? '';
  }
  sagsnr(a: Akt) {
    return this.d.sag(a.sagId)?.nummer ?? '';
  }
  antalAkter(sagId: number) {
    return this.s.soegeResultat().filter((a) => a.sagId === sagId).length;
  }
  ansvarlig(id: string) {
    return this.d.bruger(id);
  }
}
