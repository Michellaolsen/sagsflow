import { Akt, Bruger, ListeId, Sag, Soegekriterier, isoDato, venterPaa } from './models';

export interface ListeKontekst {
  migId: string;
  sag: (id?: number) => Sag | undefined;
  bruger: (id?: string) => Bruger | undefined;
}

export interface ListeDef {
  id: ListeId;
  navn: string;
  ikon: string;
  /** Hvad tallet ved siden af listen tæller */
  badge?: 'ulaeste' | 'alle';
  tomBesked: string;
  filter: (a: Akt, k: ListeKontekst) => boolean;
}

export const LISTER: ListeDef[] = [
  {
    id: 'favoritter',
    navn: 'Favoritter',
    ikon: 'star',
    tomBesked: 'Markér akter med en stjerne for at samle dem her.',
    filter: (a) => a.favorit,
  },
  {
    id: 'arkivet',
    navn: 'Alle sager',
    ikon: 'inventory_2',
    tomBesked: 'Der er ingen journaliserede akter endnu.',
    filter: (a) => a.sagId != null,
  },
  {
    id: 'indbakke',
    navn: 'Min indbakke',
    ikon: 'inbox',
    badge: 'ulaeste',
    tomBesked: 'Du har ingen nye akter. Godt arbejde!',
    filter: (a, k) => a.placering === 'indbakke' || venterPaa(a, k.migId),
  },
  {
    id: 'skrivebord',
    navn: 'Mit skrivebord',
    ikon: 'desk',
    tomBesked: 'Akter du opretter, lander her.',
    filter: (a) => a.placering === 'skrivebord',
  },
  {
    id: 'mit-arkiv',
    navn: 'Mit arkiv',
    ikon: 'folder_special',
    tomBesked: 'Arkivér akter for at rydde op i dine lister.',
    filter: (a) => a.placering === 'arkiv',
  },
  {
    id: 'sendte',
    navn: 'Mine sendte akter',
    ikon: 'send',
    tomBesked: 'Du har ikke sendt nogen akter.',
    filter: (a, k) => a.fraId === k.migId && a.sendt,
  },
  {
    id: 'chattede',
    navn: 'Mine chattede akter',
    ikon: 'forum',
    tomBesked: 'Ingen chats endnu.',
    filter: (a, k) => a.type === 'chat' && (a.fraId === k.migId || a.tilIds.includes(k.migId)),
  },
  {
    id: 'udbakke',
    navn: 'Udbakke',
    ikon: 'outbox',
    badge: 'alle',
    tomBesked: 'Ingen af dine godkendelser afventer svar.',
    filter: (a, k) => a.fraId === k.migId && a.godkendelse?.status === 'afventer',
  },
  {
    id: 'uden-sag',
    navn: 'Mine akter uden sag',
    ikon: 'draft',
    tomBesked: 'Alle dine akter er knyttet til en sag.',
    filter: (a, k) => a.sagId == null && a.fraId === k.migId,
  },
  {
    id: 'aabne-sager',
    navn: 'Mine åbne sager',
    ikon: 'folder_open',
    tomBesked: 'Du er ikke ansvarlig for nogen åbne sager.',
    filter: (a, k) => {
      const s = k.sag(a.sagId);
      return !!s && s.status === 'åben' && s.ansvarligId === k.migId;
    },
  },
];

export const LISTE_MAP = Object.fromEntries(LISTER.map((l) => [l.id, l])) as Record<ListeId, ListeDef>;
export const STANDARD_LISTER = LISTER.filter((l) => l.id !== 'favoritter');

export function matcherKriterier(a: Akt, k: Soegekriterier, ktx: ListeKontekst): boolean {
  if (k.tekst) {
    const sag = ktx.sag(a.sagId);
    const tekst = [a.titel, a.tekst, ktx.bruger(a.fraId)?.navn, sag?.nummer, sag?.titel, ...a.emneord]
      .join(' ')
      .toLowerCase();
    if (!tekst.includes(k.tekst.toLowerCase())) return false;
  }
  if (k.type && a.type !== k.type) return false;
  if (k.sagId != null && a.sagId !== k.sagId) return false;
  if (k.fraId && a.fraId !== k.fraId) return false;
  const dato = isoDato(a.brevdato);
  if (k.fraDato && dato < k.fraDato) return false;
  if (k.tilDato && dato > k.tilDato) return false;
  if (k.emneord && !a.emneord.some((e) => e.toLowerCase().includes(k.emneord.toLowerCase()))) return false;
  if (k.kunMedFrist && !a.mitFlag.frist && !a.teamFlag.frist && !a.godkendelse?.frist) return false;
  return true;
}
