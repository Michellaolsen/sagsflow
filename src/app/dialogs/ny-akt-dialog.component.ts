import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { AKT_TYPER, AktType } from '../core/models';
import { HANDLINGSFACETTER, JOURNALPLANER, SAGSFORLOEB } from '../core/seed';
import { StateService } from '../core/state.service';

const TEKSTER: Record<AktType, { titel: string; knap: string; ikon: string; beskrivelse: string }> = {
  akt: {
    titel: 'Ny akt', knap: 'Opret akt', ikon: 'note_add',
    beskrivelse: 'Giv din akt en titel og tilknyt den til en sag. Du kan altid ændre dette senere.',
  },
  email: {
    titel: 'Ny e-mail', knap: 'Send e-mail', ikon: 'mail',
    beskrivelse: 'Skriv en e-mail. Den gemmes som en akt og kan tilknyttes en sag.',
  },
  dokument: {
    titel: 'Nyt dokument', knap: 'Opret dokument', ikon: 'article',
    beskrivelse: 'Opret et dokument på dit skrivebord, og tilknyt det til en sag.',
  },
  chat: {
    titel: 'Ny chat', knap: 'Start chat', ikon: 'chat_add_on',
    beskrivelse: 'Start en chat med en eller flere kolleger. Chatten gemmes som en akt.',
  },
  godkendelse: {
    titel: 'Ny godkendelse', knap: 'Send', ikon: 'verified',
    beskrivelse: '',
  },
};

type Tilstand = 'akt' | 'sag';

@Component({
  selector: 'app-ny-akt-dialog',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './ny-akt-dialog.component.html',
  styles: `
    .dlg.hurtig { width: min(600px, 100%); }
    .dlg-foot.split { display: grid; grid-template-columns: 1fr 1fr; }

    /* Hoved i hurtig-oprettelse */
    .hurtig-head { align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .hh-tekst { flex: 1; }
    .eyebrow { display: block; margin-bottom: 2px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--primary); }
    .hurtig-head h2 { margin: 0; }

    /* Segmenteret vælger: sag / akt */
    .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; margin-bottom: 18px; border-radius: var(--radius); background: var(--surface-hover); border: 1px solid var(--border); }
    .seg button { display: flex; align-items: center; justify-content: center; gap: 7px; height: 38px; border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 600; color: var(--text-2); transition: background 0.15s, color 0.15s, box-shadow 0.15s; }
    .seg button small { font-weight: 500; color: var(--text-3); }
    .seg button:hover { color: var(--text); }
    .seg button.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm), 0 0 0 1px var(--border); }
    .seg .ms { font-size: 18px; }
    .seg-sag { color: #e8a317; }
    .seg-akt { color: var(--primary); }

    /* Boksen "Tilknyt til sag" */
    .sag-boks { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-2); }
    .sag-boks-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .sag-boks.inline .sag-boks-head { padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    .sb-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--text); }
    .link { display: inline-flex; align-items: center; gap: 3px; padding: 4px 6px; margin: -4px -6px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; color: var(--primary); }
    .link:hover { background: var(--surface-hover); }
    .link .ms { font-size: 17px; }
    .inline-note { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary); font-size: 12.5px; font-weight: 600; }
    .inline-note .ms { font-size: 17px; }
    .sag-boks .field { margin-bottom: 0; }
    .sag-boks .field-row { row-gap: 10px; }
    .sag-boks > .error { font-size: 12px; color: var(--danger); }
    .field-row { row-gap: 0; }

    .tag-input { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 44px; align-content: flex-start; cursor: text; position: relative; padding-right: 36px; }
    .tag-input input { flex: 1; min-width: 120px; border: 0; outline: none; background: none; height: 26px; }
    .tag-input .tag-ico { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3); font-size: 19px; }
    .suggest { display: flex; flex-wrap: wrap; gap: 6px; }
    .suggest button { height: 26px; padding: 0 10px; border-radius: 999px; border: 1px dashed var(--border-strong); font-size: 12.5px; color: var(--text-2); }
    .suggest button:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
    .info { font-size: 16px; color: var(--text-3); cursor: help; font-weight: normal; }
    .recipients { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .recipients .select { width: auto; min-width: 180px; flex: 1; min-height: 34px; padding: 4px 10px; }
    .person-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 6px 2px 2px; border-radius: 999px; background: var(--surface-hover); font-size: 13px; }
    .person-chip .avatar { width: 24px; height: 24px; font-size: 9.5px; }
    .person-chip button { display: grid; place-items: center; color: var(--text-3); }
    .person-chip button:hover { color: var(--danger); }
    .person-chip .ms { font-size: 16px; }
    .btn .ms { font-size: 18px; }
  `,
})
export class NyAktDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  private readonly titelFelt = viewChild<ElementRef<HTMLInputElement>>('titelFelt');
  private readonly sagTitelFelt = viewChild<ElementRef<HTMLInputElement>>('sagTitelFelt');

  readonly aktType: AktType;
  readonly tekster: (typeof TEKSTER)[AktType];
  /** "Ny akt" viser hurtig-oprettelsen, hvor man kan vælge mellem sag og akt */
  readonly hurtig: boolean;

  readonly journalplaner = JOURNALPLANER;
  readonly handlingsfacetter = HANDLINGSFACETTER;
  readonly sagsforloeb = SAGSFORLOEB;

  readonly tilstand = signal<Tilstand>('akt');
  readonly nySagInline = signal(false);
  readonly forsoegt = signal(false);

  titel = '';
  emneord: string[] = [];
  emneInput = '';
  sagId: number | null = null;
  tilIds: string[] = [];
  tekst = '';

  /** Felter til en ny sag – både "Opret sag" og "Opret ny sag inline" */
  sag = {
    titel: '',
    ansvarligId: this.d.mig.id,
    journalplan: JOURNALPLANER[0],
    handlingsfacet: HANDLINGSFACETTER[0],
    sagsforloeb: SAGSFORLOEB[0],
  };

  constructor() {
    const st = this.s.dialog();
    const init = st?.type === 'ny-akt' ? st : { aktType: 'akt' as AktType };
    this.aktType = init.aktType;
    this.tekster = TEKSTER[this.aktType];
    this.hurtig = this.aktType === 'akt';
    if (st?.type === 'ny-akt') {
      this.titel = st.titel ?? '';
      this.tilIds = [...(st.tilIds ?? [])];
      this.sagId = st.sagId ?? null;
      this.tekst = st.tekst ?? '';
    }
    afterNextRender(() => this.fokuser());
  }

  get kraeverModtager() {
    return this.aktType === 'email' || this.aktType === 'chat';
  }

  /** En almindelig akt skal altid ligge på en sag */
  get sagPaakraevet() {
    return this.aktType === 'akt';
  }

  aabneSager() {
    return this.d.sager().filter((x) => x.status === 'åben' || x.id === this.sagId);
  }

  skiftTilstand(t: Tilstand) {
    if (this.tilstand() === t) return;
    this.tilstand.set(t);
    this.forsoegt.set(false);
    setTimeout(() => this.fokuser());
  }

  aabnInline() {
    this.nySagInline.set(true);
    setTimeout(() => this.sagTitelFelt()?.nativeElement.focus());
  }

  private fokuser() {
    const el = (this.tilstand() === 'sag' ? this.sagTitelFelt() : this.titelFelt())?.nativeElement;
    el?.focus();
    el?.setSelectionRange(0, 0);
  }

  forslag() {
    const q = this.emneInput.trim().toLowerCase();
    return this.d.emneordForslag
      .filter((e) => !this.emneord.includes(e) && (!q || e.toLowerCase().includes(q)))
      .slice(0, 6);
  }

  tilfoejEmne(e = this.emneInput) {
    const v = e.trim().replace(/,$/, '');
    if (v && !this.emneord.some((x) => x.toLowerCase() === v.toLowerCase())) this.emneord = [...this.emneord, v];
    this.emneInput = '';
  }

  fjernEmne(e: string) {
    this.emneord = this.emneord.filter((x) => x !== e);
  }

  emneTast(ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      this.tilfoejEmne();
    } else if (ev.key === 'Backspace' && !this.emneInput && this.emneord.length) {
      this.emneord = this.emneord.slice(0, -1);
    }
  }

  andreBrugere() {
    return this.d.brugere.filter((b) => b.id !== this.d.mig.id && !this.tilIds.includes(b.id));
  }

  tilfoejModtager(ev: Event) {
    const sel = ev.target as HTMLSelectElement;
    if (sel.value) this.tilIds = [...this.tilIds, sel.value];
    sel.value = '';
  }

  fjernModtager(id: string) {
    this.tilIds = this.tilIds.filter((x) => x !== id);
  }

  bruger(id: string) {
    return this.d.bruger(id);
  }

  luk() {
    this.s.dialog.set(null);
  }

  private opretNySag() {
    const { titel, ansvarligId, journalplan, handlingsfacet, sagsforloeb } = this.sag;
    return this.d.opretSag(titel, ansvarligId, { journalplan, handlingsfacet, sagsforloeb });
  }

  opret() {
    if (this.emneInput.trim()) this.tilfoejEmne();
    this.forsoegt.set(true);

    // ----- Top-down: opret sag og gå til sagsvinduet -----
    if (this.tilstand() === 'sag') {
      if (!this.sag.titel.trim()) return;
      const sag = this.opretNySag();
      this.luk();
      this.s.gaaTilSag(sag.id);
      this.s.toast(`Sag ${sag.nummer} er oprettet`, 'create_new_folder');
      return;
    }

    // ----- Bottom-up: opret akt (evt. med ny sag inline) -----
    const titelOk = !!this.titel.trim();
    const modtagerOk = !this.kraeverModtager || this.tilIds.length > 0;
    const sagOk = this.nySagInline() ? !!this.sag.titel.trim() : !this.sagPaakraevet || this.sagId != null;
    if (!titelOk || !modtagerOk || !sagOk) return;

    let nySagNr: string | null = null;
    if (this.nySagInline()) {
      const sag = this.opretNySag();
      this.sagId = sag.id;
      nySagNr = sag.nummer;
    }

    const a = this.d.opretAkt({
      titel: this.titel,
      type: this.aktType,
      emneord: this.emneord,
      sagId: this.sagId,
      tilIds: this.tilIds,
      tekst: this.tekst,
    });
    this.luk();

    if (this.hurtig) {
      this.s.aabnAkt(a.id);
      const ekstra = nySagNr ? ` på den nye sag ${nySagNr}` : '';
      this.s.toast(`Akt “${a.titel}” er oprettet${ekstra}`, 'check_circle');
      return;
    }

    const hvor = a.sendt ? 'Mine sendte akter' : 'Mit skrivebord';
    this.s.toast(`${AKT_TYPER[a.type].navn} “${a.titel}” er oprettet i ${hvor}`, 'check_circle', {
      navn: 'Åbn',
      fn: () => this.s.aabnAkt(a.id),
    });
  }
}
