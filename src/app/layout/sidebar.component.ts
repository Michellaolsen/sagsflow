import { Component, computed, inject, output, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { LISTE_MAP, STANDARD_LISTER } from '../core/lister';
import { Bruger, ListeId, Sag, TOMME_KRITERIER } from '../core/models';
import { StateService } from '../core/state.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  /** Udsendes når brugeren har valgt noget (lukker skuffen på mobil) */
  readonly navigeret = output<void>();

  readonly filter = signal('');
  readonly standardAaben = signal(true);
  readonly favoritter = LISTE_MAP.favoritter;

  private matcher(t: string) {
    return t.toLowerCase().includes(this.filter().trim().toLowerCase());
  }

  readonly visFavoritter = computed(() => this.matcher(this.favoritter.navn));
  readonly standard = computed(() => STANDARD_LISTER.filter((l) => this.matcher(l.navn)));
  readonly sager = computed(() => this.d.sager().filter((x) => this.matcher(`${x.nummer} ${x.titel}`)));
  readonly brugere = computed(() => this.d.brugere.filter((b) => this.matcher(`${b.navn} ${b.enhed}`)));

  readonly badges = computed(() => {
    const alle = this.d.akter().filter((a) => a.placering !== 'slettet');
    const k = this.d.kontekst;
    const res: Partial<Record<ListeId, number>> = {};
    for (const l of [this.favoritter, ...STANDARD_LISTER]) {
      if (!l.badge) continue;
      const n = alle.filter((a) => l.filter(a, k) && (l.badge === 'alle' || a.ulaest)).length;
      if (n) res[l.id] = n;
    }
    return res;
  });

  readonly antalPrSag = computed(() => {
    const m = new Map<number, number>();
    for (const a of this.d.akter()) {
      if (a.sagId != null && a.placering !== 'slettet') m.set(a.sagId, (m.get(a.sagId) ?? 0) + 1);
    }
    return m;
  });

  vis(id: ListeId) {
    this.s.visListe(id);
    this.navigeret.emit();
  }

  aabnSag(sag: Sag) {
    this.s.gaaTilSag(sag.id);
    this.navigeret.emit();
  }

  aktFra(b: Bruger) {
    this.s.soeg({ ...TOMME_KRITERIER, fraId: b.id });
    this.navigeret.emit();
  }
}
