import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DataService } from './data.service';
import { LISTE_MAP, matcherKriterier } from './lister';
import { AKT_TYPER, Akt, AktType, FlagFarve, ListeId, Soegekriterier } from './models';

export type MainTab = 'akter' | 'sager' | 'dokumenter' | 'bestillinger';
export type MenuFane = 'app' | 'hoved' | 'indstillinger' | 'admin' | 'hjaelp';
export type FilterId = 'ulaeste' | 'flag' | 'frist' | 'favorit' | 'godkendelse';
export type SoegeFelt = 'titel' | 'fra' | 'sag' | 'emneord' | 'tekst';
export type SortKol = 'titel' | 'brevdato' | 'sorteringsdato' | 'fra' | 'sag';
export type Tema = 'lys' | 'moerk';

export interface Fane {
  id: number;
  kind: 'liste' | 'sag' | 'soegning' | 'akt';
  listeId?: ListeId;
  sagId?: number;
  aktId?: number;
  soegning?: Soegekriterier;
}

export type DialogState =
  | { type: 'ny-akt'; aktType: AktType; titel?: string; tilIds?: string[]; sagId?: number; tekst?: string }
  | { type: 'godkendelse'; aktId?: number }
  | { type: 'soegning'; kriterier?: Soegekriterier }
  | { type: 'kalender' }
  | { type: 'paamindelser' }
  | { type: 'ny-sag' }
  | { type: 'genveje' }
  | { type: 'om' }
  | null;

export interface Toast {
  id: number;
  tekst: string;
  ikon: string;
  handling?: { navn: string; fn: () => void };
}

function hentTema(): Tema {
  try {
    const t = localStorage.getItem('sagsflow.tema');
    if (t === 'lys' || t === 'moerk') return t;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'moerk' : 'lys';
}

/** UI-tilstand: faner, valg, søgning, dialoger, beskeder. */
@Injectable({ providedIn: 'root' })
export class StateService {
  readonly data = inject(DataService);

  private naesteFaneId = 1;
  private naesteToastId = 0;

  // ---------- Layout ----------
  readonly menuFane = signal<MenuFane>('hoved');
  readonly ribbonSkjult = signal(false);
  readonly visLaeserude = signal(true);
  readonly tema = signal<Tema>(hentTema());
  readonly taethed = signal<'normal' | 'kompakt'>('normal');
  readonly sidebarFane = signal<'akter' | 'sager' | 'personer'>('akter');

  // ---------- Faner ----------
  readonly faner = signal<Fane[]>([{ id: 1, kind: 'liste', listeId: 'indbakke' }]);
  readonly aktivFaneId = signal(1);
  readonly aktivFane = computed(() => this.faner().find((f) => f.id === this.aktivFaneId()) ?? this.faner()[0]);
  readonly aktivListeId = computed(() => {
    const f = this.aktivFane();
    return f.kind === 'liste' ? f.listeId! : null;
  });

  // ---------- Søgning, filter, sortering ----------
  readonly mainTab = signal<MainTab>('akter');
  readonly soegetekst = signal('');
  readonly filtre = signal<ReadonlySet<FilterId>>(new Set());
  readonly soegefelter = signal<ReadonlySet<SoegeFelt>>(new Set(['titel', 'fra', 'sag', 'emneord']));
  readonly sortering = signal<{ kol: SortKol; retning: 1 | -1 }>({ kol: 'sorteringsdato', retning: -1 });
  readonly soegehistorik = signal<Soegekriterier[]>([]);

  // ---------- Valg ----------
  readonly valgte = signal<ReadonlySet<number>>(new Set());
  readonly fokusId = signal<number | null>(null);
  readonly senesteAkter = signal<number[]>([]);

  // ---------- Dialoger og beskeder ----------
  readonly dialog = signal<DialogState>(null);
  readonly toasts = signal<Toast[]>([]);

  constructor() {
    effect(() => {
      const root = document.documentElement;
      root.dataset['theme'] = this.tema();
      root.dataset['density'] = this.taethed();
      try {
        localStorage.setItem('sagsflow.tema', this.tema());
      } catch {}
    });
  }

  // ================= Afledte lister =================

  /** Alle akter i den aktive fane (før søgefelt og filtre). */
  readonly faneAkter = computed<Akt[]>(() => {
    const f = this.aktivFane();
    const k = this.data.kontekst;
    const alle = this.data.akter().filter((a) => a.placering !== 'slettet');
    switch (f.kind) {
      case 'liste':
        return alle.filter((a) => LISTE_MAP[f.listeId!].filter(a, k));
      case 'sag':
        return alle.filter((a) => a.sagId === f.sagId);
      case 'soegning':
        return alle.filter((a) => matcherKriterier(a, f.soegning!, k));
      case 'akt':
        return alle.filter((a) => a.id === f.aktId);
      default:
        return [];
    }
  });

  /** Efter søgefelt og filtre. */
  readonly soegeResultat = computed(() => {
    const tekst = this.soegetekst().trim().toLowerCase();
    const felter = this.soegefelter();
    const filtre = this.filtre();
    const k = this.data.kontekst;
    return this.faneAkter().filter((a) => {
      if (filtre.has('ulaeste') && !a.ulaest) return false;
      if (filtre.has('flag') && !a.mitFlag.farve && !a.teamFlag.farve) return false;
      if (filtre.has('frist') && !a.mitFlag.frist && !a.teamFlag.frist) return false;
      if (filtre.has('favorit') && !a.favorit) return false;
      if (filtre.has('godkendelse') && !a.godkendelse) return false;
      if (!tekst) return true;
      const dele: string[] = [];
      if (felter.has('titel')) dele.push(a.titel);
      if (felter.has('fra')) dele.push(k.bruger(a.fraId)?.navn ?? '');
      if (felter.has('sag')) {
        const s = k.sag(a.sagId);
        if (s) dele.push(s.nummer, s.titel);
      }
      if (felter.has('emneord')) dele.push(...a.emneord);
      if (felter.has('tekst')) dele.push(a.tekst);
      return dele.join(' ').toLowerCase().includes(tekst);
    });
  });

  /** Det der vises i tabellen for fanerne Akter/Dokumenter/Bestillinger. */
  readonly akterIVisning = computed(() => {
    const tab = this.mainTab();
    let liste = this.soegeResultat();
    if (tab === 'dokumenter') liste = liste.filter((a) => a.type === 'dokument');
    if (tab === 'bestillinger') liste = liste.filter((a) => !!a.godkendelse);
    const { kol, retning } = this.sortering();
    const k = this.data.kontekst;
    const noegle = (a: Akt): string | number => {
      switch (kol) {
        case 'titel': return a.titel.toLowerCase();
        case 'brevdato': return a.brevdato.getTime();
        case 'sorteringsdato': return a.sorteringsdato.getTime();
        case 'fra': return k.bruger(a.fraId)?.navn ?? '';
        case 'sag': return k.sag(a.sagId)?.nummer ?? '';
      }
    };
    return [...liste].sort((x, y) => {
      const a = noegle(x);
      const b = noegle(y);
      const c = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'da');
      return c * retning;
    });
  });

  readonly sagerIVisning = computed(() => {
    const ids = new Set<number>();
    for (const a of this.soegeResultat()) if (a.sagId != null) ids.add(a.sagId);
    const f = this.aktivFane();
    if (f.kind === 'sag' && f.sagId != null) ids.add(f.sagId);
    return this.data.sager().filter((s) => ids.has(s.id));
  });

  readonly taellere = computed<Record<MainTab, number>>(() => {
    const r = this.soegeResultat();
    return {
      akter: r.length,
      sager: this.sagerIVisning().length,
      dokumenter: r.filter((a) => a.type === 'dokument').length,
      bestillinger: r.filter((a) => !!a.godkendelse).length,
    };
  });

  readonly antalResultater = computed(() => this.taellere()[this.mainTab()]);

  readonly fokusAkt = computed(() => this.data.akt(this.fokusId()));
  readonly harValg = computed(() => this.valgte().size > 0);

  // ================= Faner =================

  faneTitel(f: Fane): string {
    switch (f.kind) {
      case 'liste': return LISTE_MAP[f.listeId!].navn;
      case 'sag': return `Sag ${this.data.sag(f.sagId)?.nummer ?? ''}`;
      case 'soegning': return f.soegning?.tekst ? `Søgning: “${f.soegning.tekst}”` : 'Søgeresultat';
      case 'akt': return this.data.akt(f.aktId ?? null)?.titel ?? 'Akt';
    }
  }

  faneIkon(f: Fane): string {
    switch (f.kind) {
      case 'liste': return LISTE_MAP[f.listeId!].ikon;
      case 'sag': return 'folder_open';
      case 'soegning': return 'manage_search';
      case 'akt': return AKT_TYPER[this.data.akt(f.aktId ?? null)?.type ?? 'akt'].ikon;
    }
  }

  visListe(listeId: ListeId) {
    const id = this.aktivFaneId();
    this.faner.update((l) => l.map((f) => (f.id === id ? { id, kind: 'liste', listeId } : f)));
    this.soegetekst.set('');
    this.nulstilValg();
  }

  nyFane(f: Omit<Fane, 'id'> = { kind: 'liste', listeId: 'indbakke' }) {
    const id = ++this.naesteFaneId;
    this.faner.update((l) => [...l, { ...f, id }]);
    this.aktivFaneId.set(id);
    this.soegetekst.set('');
    this.nulstilValg();
  }

  vaelgFane(id: number) {
    if (id === this.aktivFaneId()) return;
    this.aktivFaneId.set(id);
    this.soegetekst.set('');
    this.nulstilValg();
  }

  lukFane(id: number) {
    const l = this.faner();
    if (l.length === 1) return;
    const i = l.findIndex((f) => f.id === id);
    const rest = l.filter((f) => f.id !== id);
    this.faner.set(rest);
    if (this.aktivFaneId() === id) {
      this.aktivFaneId.set(rest[Math.max(0, i - 1)].id);
      this.nulstilValg();
    }
  }

  gaaTilSag(sagId: number) {
    const findes = this.faner().find((f) => f.kind === 'sag' && f.sagId === sagId);
    if (findes) this.vaelgFane(findes.id);
    else this.nyFane({ kind: 'sag', sagId });
    this.mainTab.set('akter');
  }

  aabnAkt(aktId: number) {
    const findes = this.faner().find((f) => f.kind === 'akt' && f.aktId === aktId);
    if (findes) this.vaelgFane(findes.id);
    else this.nyFane({ kind: 'akt', aktId });
    this.vaelgEn(aktId);
  }

  soeg(k: Soegekriterier) {
    const noegle = JSON.stringify(k);
    this.soegehistorik.update((h) => [k, ...h.filter((x) => JSON.stringify(x) !== noegle)].slice(0, 8));
    this.nyFane({ kind: 'soegning', soegning: { ...k } });
    this.mainTab.set('akter');
  }

  beskrivSoegning(k: Soegekriterier): string {
    const dele: string[] = [];
    if (k.tekst) dele.push(`“${k.tekst}”`);
    if (k.type) dele.push(AKT_TYPER[k.type].navn);
    if (k.sagId != null) dele.push(`Sag ${this.data.sag(k.sagId)?.nummer ?? ''}`);
    if (k.fraId) dele.push(`Fra ${this.data.bruger(k.fraId)?.navn ?? ''}`);
    if (k.emneord) dele.push(`Emneord: ${k.emneord}`);
    if (k.fraDato || k.tilDato) dele.push(`${k.fraDato || '…'} – ${k.tilDato || '…'}`);
    if (k.kunMedFrist) dele.push('Med frist');
    return dele.join(' · ') || 'Alle akter';
  }

  // ================= Valg =================

  nulstilValg() {
    this.valgte.set(new Set());
    this.fokusId.set(null);
  }

  vaelgEn(id: number) {
    this.valgte.set(new Set([id]));
    this.fokusId.set(id);
    this.data.markerLaest([id]);
    this.senesteAkter.update((l) => [id, ...l.filter((x) => x !== id)].slice(0, 6));
  }

  klikRaekke(id: number, ev: MouseEvent) {
    if (ev.ctrlKey || ev.metaKey) {
      const s = new Set(this.valgte());
      if (s.has(id)) s.delete(id);
      else s.add(id);
      this.valgte.set(s);
      this.fokusId.set(s.has(id) ? id : ([...s].at(-1) ?? null));
      return;
    }
    const anker = this.fokusId();
    if (ev.shiftKey && anker != null) {
      const ids = this.akterIVisning().map((a) => a.id);
      const a = ids.indexOf(anker);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        this.valgte.set(new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1)));
        return;
      }
    }
    this.vaelgEn(id);
  }

  vaelgAlle() {
    const ids = this.akterIVisning().map((a) => a.id);
    this.valgte.set(new Set(ids));
    if (this.fokusId() == null && ids.length) this.fokusId.set(ids[0]);
  }

  flytValg(delta: number) {
    const l = this.akterIVisning();
    if (!l.length) return;
    const i = l.findIndex((a) => a.id === this.fokusId());
    const n = i < 0 ? 0 : Math.min(l.length - 1, Math.max(0, i + delta));
    this.vaelgEn(l[n].id);
  }

  // ================= Handlinger =================

  nyAkt(aktType: AktType, sagId?: number) {
    this.dialog.set({ type: 'ny-akt', aktType, sagId });
  }

  svar(mode: 'svar' | 'alle' | 'videresend') {
    const a = this.fokusAkt();
    if (!a) return;
    const migId = this.data.mig.id;
    const basis = a.titel.replace(/^(SV|VS):\s*/i, '');
    const til =
      mode === 'svar' ? [a.fraId] : mode === 'alle' ? [a.fraId, ...a.tilIds] : [];
    const fra = this.data.bruger(a.fraId)?.navn ?? '';
    this.dialog.set({
      type: 'ny-akt',
      aktType: 'email',
      titel: `${mode === 'videresend' ? 'VS' : 'SV'}: ${basis}`,
      tilIds: [...new Set(til)].filter((id) => id !== migId),
      sagId: a.sagId,
      tekst: `\n\n——— ${fra} skrev ———\n${a.tekst}`,
    });
  }

  arkiver() {
    const ids = [...this.valgte()];
    if (!ids.length) return;
    const snap = this.data.snapshot();
    this.data.saetPlacering(ids, 'arkiv');
    this.nulstilValg();
    this.toast(`${this.antalTekst(ids.length)} arkiveret`, 'inventory_2', this.fortryd(snap));
  }

  fjernFraListe() {
    const ids = [...this.valgte()];
    if (!ids.length) return;
    const snap = this.data.snapshot();
    if (this.aktivListeId() === 'favoritter') this.data.saetFavorit(ids, false);
    else this.data.saetPlacering(ids, 'ingen');
    this.nulstilValg();
    this.toast(`${this.antalTekst(ids.length)} fjernet fra listen`, 'playlist_remove', this.fortryd(snap));
  }

  slet() {
    const ids = [...this.valgte()];
    if (!ids.length) return;
    const snap = this.data.snapshot();
    this.data.saetPlacering(ids, 'slettet');
    this.nulstilValg();
    this.faner.update((l) => l.filter((f) => !(f.kind === 'akt' && ids.includes(f.aktId!))) );
    if (!this.faner().some((f) => f.id === this.aktivFaneId())) {
      if (!this.faner().length) this.faner.set([{ id: ++this.naesteFaneId, kind: 'liste', listeId: 'indbakke' }]);
      this.aktivFaneId.set(this.faner()[0].id);
    }
    this.toast(`${this.antalTekst(ids.length)} slettet`, 'delete', this.fortryd(snap));
  }

  saetFlag(hvem: 'mig' | 'team', farve: FlagFarve) {
    const ids = [...this.valgte()];
    if (ids.length) this.data.opdaterFlag(ids, hvem, { farve });
  }

  saetFrist(hvem: 'mig' | 'team', frist: string) {
    const ids = [...this.valgte()];
    if (ids.length) this.data.opdaterFlag(ids, hvem, { frist });
  }

  // ================= Beskeder =================

  toast(tekst: string, ikon = 'check_circle', handling?: Toast['handling']) {
    const id = ++this.naesteToastId;
    this.toasts.update((t) => [...t.slice(-2), { id, tekst, ikon, handling }]);
    setTimeout(() => this.lukToast(id), 6000);
  }

  lukToast(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  private fortryd(snap: Akt[]): Toast['handling'] {
    return { navn: 'Fortryd', fn: () => this.data.gendan(snap) };
  }

  private antalTekst(n: number) {
    return n === 1 ? 'Akten er' : `${n} akter er`;
  }
}
