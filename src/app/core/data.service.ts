import { Injectable, computed, effect, signal } from '@angular/core';
import { ListeKontekst } from './lister';
import { Akt, AktType, Bruger, Flag, Godkendelse, Sag, aktueltTrin } from './models';
import { BRUGERE, EMNEORD, MIG_ID, seedAkter, seedSager } from './seed';

const LAGER_NOEGLE = 'sagsflow.data.v1';
const DATO_FELTER = new Set(['brevdato', 'sorteringsdato', 'oprettet', 'dato']);

export interface NyAktInput {
  titel: string;
  type: AktType;
  emneord: string[];
  sagId: number | null;
  tilIds: string[];
  tekst: string;
}

export interface NyGodkendelseInput {
  titel: string;
  sagId: number | null;
  godkenderIds: string[];
  frist: string;
  besked: string;
  /** Hvis sat, knyttes godkendelsen til en eksisterende akt */
  aktId?: number;
}

/**
 * Data-laget. Holder sager og akter i signals og gemmer dem i localStorage.
 * Udskift metoderne her med HTTP-kald, når der kommer en rigtig backend.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly brugere: Bruger[] = BRUGERE;
  readonly mig: Bruger = BRUGERE.find((b) => b.id === MIG_ID)!;
  readonly emneordForslag = EMNEORD;

  readonly sager = signal<Sag[]>(seedSager());
  readonly akter = signal<Akt[]>(seedAkter());
  readonly opdateret = signal(new Date());

  private readonly sagMap = computed(() => new Map(this.sager().map((s) => [s.id, s])));
  private readonly brugerMap = new Map(BRUGERE.map((b) => [b.id, b]));

  readonly kontekst: ListeKontekst = {
    migId: MIG_ID,
    sag: (id) => (id == null ? undefined : this.sagMap().get(id)),
    bruger: (id) => (id == null ? undefined : this.brugerMap.get(id)),
  };

  constructor() {
    this.indlaes();
    effect(() => {
      const data = { sager: this.sager(), akter: this.akter() };
      try {
        localStorage.setItem(LAGER_NOEGLE, JSON.stringify(data));
      } catch {
        /* localStorage utilgængelig – vi kører bare i hukommelsen */
      }
    });
  }

  sag(id?: number | null) {
    return id == null ? undefined : this.sagMap().get(id);
  }
  bruger(id?: string) {
    return id == null ? undefined : this.brugerMap.get(id);
  }
  akt(id: number | null) {
    return id == null ? undefined : this.akter().find((a) => a.id === id && a.placering !== 'slettet');
  }

  // ---------- Fortryd ----------
  snapshot(): Akt[] {
    return this.akter();
  }
  gendan(snap: Akt[]) {
    this.akter.set(snap);
    this.stempel();
  }

  stempel() {
    this.opdateret.set(new Date());
  }

  // ---------- Opret ----------
  opretAkt(input: NyAktInput): Akt {
    const nu = new Date();
    const sendes = input.type === 'email' || input.type === 'chat';
    const a: Akt = {
      id: this.naesteId(),
      titel: input.titel.trim(),
      type: input.type,
      emneord: input.emneord,
      sagId: input.sagId ?? undefined,
      brevdato: nu,
      sorteringsdato: nu,
      fraId: MIG_ID,
      tilIds: input.tilIds,
      tekst: input.tekst,
      placering: sendes ? 'ingen' : 'skrivebord',
      sendt: sendes,
      favorit: false,
      ulaest: false,
      mitFlag: { farve: '', frist: '' },
      teamFlag: { farve: '', frist: '' },
    };
    this.akter.update((l) => [a, ...l]);
    this.stempel();
    return a;
  }

  opretGodkendelse(input: NyGodkendelseInput): Akt {
    const godkendelse: Godkendelse = {
      status: 'afventer',
      frist: input.frist,
      besked: input.besked,
      trin: input.godkenderIds.map((id) => ({ godkenderId: id, status: 'afventer' })),
    };
    if (input.aktId != null) {
      this.opdater([input.aktId], (a) => ({ ...a, godkendelse, sendt: true, sorteringsdato: new Date() }));
      return this.akt(input.aktId)!;
    }
    const a = this.opretAkt({
      titel: input.titel,
      type: 'godkendelse',
      emneord: [],
      sagId: input.sagId,
      tilIds: input.godkenderIds,
      tekst: input.besked,
    });
    this.opdater([a.id], (x) => ({ ...x, godkendelse, sendt: true, placering: 'ingen' }));
    return this.akt(a.id)!;
  }

  opretSag(titel: string, ansvarligId: string): Sag {
    const aar = new Date().getFullYear();
    const loebenr = Math.max(0, ...this.sager().map((s) => Number(s.nummer.split('-')[1]) || 0)) + 1;
    const sag: Sag = {
      id: Math.max(0, ...this.sager().map((s) => s.id)) + 1,
      nummer: `${aar}-${String(loebenr).padStart(4, '0')}`,
      titel: titel.trim(),
      status: 'åben',
      ansvarligId,
      oprettet: new Date(),
    };
    this.sager.update((l) => [...l, sag]);
    this.stempel();
    return sag;
  }

  // ---------- Godkendelser ----------
  godkend(id: number, kommentar: string) {
    this.behandl(id, 'godkendt', kommentar);
  }
  afvis(id: number, kommentar: string) {
    this.behandl(id, 'afvist', kommentar);
  }

  private behandl(id: number, udfald: 'godkendt' | 'afvist', kommentar: string) {
    this.opdater([id], (a) => {
      const aktuelt = aktueltTrin(a);
      if (!a.godkendelse || !aktuelt) return a;
      const trin = a.godkendelse.trin.map((t) =>
        t === aktuelt ? { ...t, status: udfald, dato: new Date(), kommentar: kommentar.trim() || undefined } : t,
      );
      const status =
        udfald === 'afvist' ? 'afvist' : trin.every((t) => t.status === 'godkendt') ? 'godkendt' : 'afventer';
      return { ...a, ulaest: false, godkendelse: { ...a.godkendelse, trin, status } };
    });
  }

  // ---------- Ændringer ----------
  saetPlacering(ids: number[], placering: Akt['placering']) {
    this.opdater(ids, (a) => ({ ...a, placering }));
  }
  saetFavorit(ids: number[], favorit: boolean) {
    this.opdater(ids, (a) => ({ ...a, favorit }));
  }
  toggleFavorit(id: number) {
    this.opdater([id], (a) => ({ ...a, favorit: !a.favorit }));
  }
  markerLaest(ids: number[], laest = true) {
    if (!ids.some((id) => this.akt(id)?.ulaest === laest)) return;
    this.opdater(ids, (a) => ({ ...a, ulaest: !laest }));
  }
  opdaterFlag(ids: number[], hvem: 'mig' | 'team', patch: Partial<Flag>) {
    this.opdater(ids, (a) =>
      hvem === 'mig' ? { ...a, mitFlag: { ...a.mitFlag, ...patch } } : { ...a, teamFlag: { ...a.teamFlag, ...patch } },
    );
  }

  nulstil() {
    this.sager.set(seedSager());
    this.akter.set(seedAkter());
    this.stempel();
  }

  private opdater(ids: number[], fn: (a: Akt) => Akt) {
    const saet = new Set(ids);
    this.akter.update((l) => l.map((a) => (saet.has(a.id) ? fn(a) : a)));
    this.stempel();
  }

  private naesteId() {
    return Math.max(0, ...this.akter().map((a) => a.id)) + 1;
  }

  private indlaes() {
    try {
      const raa = localStorage.getItem(LAGER_NOEGLE);
      if (!raa) return;
      const data = JSON.parse(raa, (k, v) => (DATO_FELTER.has(k) && typeof v === 'string' ? new Date(v) : v));
      if (Array.isArray(data?.sager) && Array.isArray(data?.akter)) {
        this.sager.set(data.sager);
        this.akter.set(data.akter);
      }
    } catch {
      /* ødelagte data – brug demodata */
    }
  }
}
