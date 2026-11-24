import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.service';
import { AKT_TYPER, AktType } from '../core/models';
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

@Component({
  selector: 'app-ny-akt-dialog',
  imports: [FormsModule],
  templateUrl: './ny-akt-dialog.component.html',
  styles: `
    .dlg-foot.split { display: grid; grid-template-columns: 1fr 1fr; }
    .tag-input { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 64px; align-content: flex-start; cursor: text; position: relative; padding-right: 36px; }
    .tag-input input { flex: 1; min-width: 120px; border: 0; outline: none; background: none; height: 26px; }
    .tag-input .tag-ico { position: absolute; right: 10px; top: 10px; color: var(--text-3); font-size: 19px; }
    .suggest { display: flex; flex-wrap: wrap; gap: 6px; }
    .suggest button { height: 26px; padding: 0 10px; border-radius: 999px; border: 1px dashed var(--border-strong); font-size: 12.5px; color: var(--text-2); }
    .suggest button:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
    .sag-felt { position: relative; }
    .sag-felt .input { padding-left: 38px; }
    .sag-lead { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-3); font-size: 20px; pointer-events: none; }
    .sag-liste { margin-top: 4px; max-height: 220px; overflow: auto; padding: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); }
    .sag-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: var(--radius-sm); text-align: left; font-size: 13.5px; color: var(--text); }
    .sag-opt:hover { background: var(--surface-hover); }
    .sag-opt .ms { font-size: 19px; color: var(--text-3); }
    .sag-opt .nr { font-variant-numeric: tabular-nums; color: var(--text-2); flex-shrink: 0; }
    .sag-opt .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sag-opt.opret { color: var(--primary); font-weight: 600; }
    .sag-opt.opret .ms { color: var(--primary); }
    .sag-opt.opret:hover { background: var(--primary-soft); }
    .sag-sektion { margin: 6px 10px 2px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); }
    .sag-tom { padding: 8px 10px; font-size: 13px; color: var(--text-3); }
    .sag-valgt { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 6px 6px 6px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface-2); }
    .sag-valgt.ny { border-color: var(--primary); background: var(--primary-soft); }
    .sag-ico { color: var(--primary); font-size: 20px; }
    .sag-tekst { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; font-size: 13.5px; }
    .sag-tekst .nr { color: var(--text-2); font-variant-numeric: tabular-nums; }
    .sag-tekst small { flex-basis: 100%; font-size: 12px; color: var(--text-3); }
    .ny-badge { padding: 1px 7px; border-radius: 999px; background: var(--primary); color: var(--on-primary); font-size: 11px; font-weight: 600; }
    .sag-skift { padding: 5px 10px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; color: var(--primary); }
    .sag-skift:hover { background: var(--surface-hover); }
    .info { font-size: 16px; color: var(--text-3); cursor: help; }
    .recipients { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .recipients .select { width: auto; min-width: 180px; flex: 1; min-height: 34px; padding: 4px 10px; }
    .person-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 6px 2px 2px; border-radius: 999px; background: var(--surface-hover); font-size: 13px; }
    .person-chip .avatar { width: 24px; height: 24px; font-size: 9.5px; }
    .person-chip button { display: grid; place-items: center; color: var(--text-3); }
    .person-chip button:hover { color: var(--danger); }
    .person-chip .ms { font-size: 16px; }
  `,
})
export class NyAktDialogComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  private readonly titelFelt = viewChild<ElementRef<HTMLInputElement>>('titelFelt');

  readonly aktType: AktType;
  readonly tekster: (typeof TEKSTER)[AktType];

  titel = '';
  emneord: string[] = [];
  emneInput = '';
  sagId: number | null = null;
  tilIds: string[] = [];
  tekst = '';
  readonly forsoegt = signal(false);

  sagSoeg = '';
  nySagTitel: string | null = null;
  readonly sagAaben = signal(false);
  readonly nyTilstand = signal(false);
  private readonly sagFelt = viewChild<ElementRef<HTMLInputElement>>('sagFelt');

  constructor() {
    const st = this.s.dialog();
    const init = st?.type === 'ny-akt' ? st : { aktType: 'akt' as AktType };
    this.aktType = init.aktType;
    this.tekster = TEKSTER[this.aktType];
    if (st?.type === 'ny-akt') {
      this.titel = st.titel ?? '';
      this.tilIds = [...(st.tilIds ?? [])];
      this.sagId = st.sagId ?? null;
      this.tekst = st.tekst ?? '';
    }
    afterNextRender(() => {
      const el = this.titelFelt()?.nativeElement;
      el?.focus();
      el?.setSelectionRange(0, 0);
    });
  }

  get kraeverModtager() {
    return this.aktType === 'email' || this.aktType === 'chat';
  }

  get gyldig() {
    return !!this.titel.trim() && (!this.kraeverModtager || this.tilIds.length > 0);
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

  valgtSag() {
    return this.sagId == null ? undefined : this.d.sager().find((x) => x.id === this.sagId);
  }

  sagForslag() {
    const q = this.sagSoeg.trim().toLowerCase();
    return this.d
      .sager()
      .filter((x) => x.status === 'åben')
      .filter((x) => !q || x.titel.toLowerCase().includes(q) || x.nummer.toLowerCase().includes(q));
  }

  vaelgSag(id: number) {
    this.sagId = id;
    this.nySagTitel = null;
    this.sagSoeg = '';
    this.sagAaben.set(false);
  }

  vaelgNySag() {
    const t = this.sagSoeg.trim();
    if (!t) {
      // Ingen titel endnu: skift feltet til "ny sag"-tilstand og bed om en titel
      this.nyTilstand.set(true);
      this.sagFelt()?.nativeElement.focus();
      return;
    }
    this.nySagTitel = t;
    this.sagId = null;
    this.sagSoeg = '';
    this.sagAaben.set(false);
    this.nyTilstand.set(false);
  }

  rydSag() {
    this.sagId = null;
    this.nySagTitel = null;
    this.sagSoeg = '';
    setTimeout(() => this.sagFelt()?.nativeElement.focus());
  }

  sagTast(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.sagAaben()) {
      ev.stopPropagation();
      this.sagAaben.set(false);
      this.nyTilstand.set(false);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const forslag = this.sagForslag();
      if (!this.nyTilstand() && this.sagSoeg.trim() && forslag.length) this.vaelgSag(forslag[0].id);
      else this.vaelgNySag();
    }
  }

  luk() {
    this.s.dialog.set(null);
  }

  opret() {
    this.forsoegt.set(true);
    if (this.emneInput.trim()) this.tilfoejEmne();
    if (!this.gyldig) return;
    if (this.nySagTitel) this.sagId = this.d.opretSag(this.nySagTitel, this.d.mig.id).id;
    const a = this.d.opretAkt({
      titel: this.titel,
      type: this.aktType,
      emneord: this.emneord,
      sagId: this.sagId,
      tilIds: this.tilIds,
      tekst: this.tekst,
    });
    this.luk();
    const hvor = a.sendt ? 'Mine sendte akter' : 'Mit skrivebord';
    this.s.toast(`${AKT_TYPER[a.type].navn} “${a.titel}” er oprettet i ${hvor}`, 'check_circle', {
      navn: 'Åbn',
      fn: () => this.s.aabnAkt(a.id),
    });
  }
}
