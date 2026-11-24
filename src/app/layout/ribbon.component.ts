import { NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { FLAG_FARVER, Flag, flagInfo } from '../core/models';
import { MenuFane, StateService } from '../core/state.service';

@Component({
  selector: 'app-ribbon',
  imports: [NgTemplateOutlet],
  templateUrl: './ribbon.component.html',
  styleUrl: './ribbon.component.scss',
})
export class RibbonComponent {
  readonly s = inject(StateService);
  readonly d = inject(DataService);

  readonly menuer: { id: MenuFane; navn: string }[] = [
    { id: 'hoved', navn: 'Overblik' },
    { id: 'indstillinger', navn: 'Indstillinger' },
    { id: 'admin', navn: 'Værktøjer' },
    { id: 'hjaelp', navn: 'Hjælp & værktøjer' },
  ];
  readonly flagFarver = FLAG_FARVER;
  readonly flagInfo = flagInfo;

  /** Hvilken dropdown der er åben */
  readonly menu = signal<string | null>(null);

  readonly fokus = this.s.fokusAkt;
  readonly harValg = this.s.harValg;
  readonly kanSvare = computed(() => this.s.valgte().size === 1 && !!this.fokus());
  readonly fokusSag = computed(() => this.d.sag(this.fokus()?.sagId));
  readonly aabneSager = computed(() => this.d.sager().filter((x) => x.status === 'åben'));
  readonly senesteAkter = computed(() =>
    this.s
      .senesteAkter()
      .map((id) => this.d.akt(id))
      .filter((a) => !!a),
  );
  readonly enhedKort = computed(() => this.d.mig.enhed.split('–')[0].trim());

  toggle(navn: string, e: Event) {
    e.stopPropagation();
    this.menu.set(this.menu() === navn ? null : navn);
  }

  @HostListener('document:click')
  lukMenu() {
    this.menu.set(null);
  }

  vaelgMenu(id: MenuFane) {
    if (this.s.ribbonSkjult()) this.s.ribbonSkjult.set(false);
    else if (this.s.menuFane() === id) {
      this.s.ribbonSkjult.set(true);
      return;
    }
    this.s.menuFane.set(id);
  }

  flagFor(hvem: 'mig' | 'team'): Flag | undefined {
    const a = this.fokus();
    if (!a || !this.harValg()) return undefined;
    return hvem === 'mig' ? a.mitFlag : a.teamFlag;
  }

  frist(hvem: 'mig' | 'team', e: Event) {
    this.s.saetFrist(hvem, (e.target as HTMLInputElement).value);
  }

  udskriv() {
    window.print();
  }

  nulstilDemo() {
    this.d.nulstil();
    this.s.nulstilValg();
    this.s.toast('Demodata er nulstillet', 'restart_alt');
  }

  logUd() {
    this.s.toast('Log ud er ikke tilgængeligt i demoen', 'info');
  }
}
