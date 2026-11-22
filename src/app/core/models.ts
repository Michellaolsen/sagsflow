export type AktType = 'akt' | 'email' | 'dokument' | 'chat' | 'godkendelse';
export type Placering = 'indbakke' | 'skrivebord' | 'arkiv' | 'ingen' | 'slettet';
export type FlagFarve = '' | 'roed' | 'orange' | 'gul' | 'groen' | 'blaa' | 'lilla';
export type GodkendelsesStatus = 'afventer' | 'godkendt' | 'afvist';

export type ListeId =
  | 'favoritter'
  | 'arkivet'
  | 'indbakke'
  | 'skrivebord'
  | 'mit-arkiv'
  | 'sendte'
  | 'chattede'
  | 'udbakke'
  | 'uden-sag'
  | 'aabne-sager';

export interface Bruger {
  id: string;
  navn: string;
  initialer: string;
  enhed: string;
  farve: string;
}

export interface Sag {
  id: number;
  nummer: string;
  titel: string;
  status: 'åben' | 'lukket';
  ansvarligId: string;
  oprettet: Date;
}

export interface Flag {
  farve: FlagFarve;
  /** ISO-dato (yyyy-mm-dd) eller tom streng */
  frist: string;
}

export interface GodkendelsesTrin {
  godkenderId: string;
  status: GodkendelsesStatus;
  kommentar?: string;
  dato?: Date;
}

export interface Godkendelse {
  status: GodkendelsesStatus;
  trin: GodkendelsesTrin[];
  frist: string;
  besked: string;
}

export interface Akt {
  id: number;
  titel: string;
  type: AktType;
  emneord: string[];
  sagId?: number;
  brevdato: Date;
  sorteringsdato: Date;
  fraId: string;
  tilIds: string[];
  tekst: string;
  placering: Placering;
  sendt: boolean;
  favorit: boolean;
  ulaest: boolean;
  mitFlag: Flag;
  teamFlag: Flag;
  godkendelse?: Godkendelse;
}

export interface Soegekriterier {
  tekst: string;
  type: AktType | '';
  sagId: number | null;
  fraId: string;
  fraDato: string;
  tilDato: string;
  emneord: string;
  kunMedFrist: boolean;
}

export const TOMME_KRITERIER: Soegekriterier = {
  tekst: '',
  type: '',
  sagId: null,
  fraId: '',
  fraDato: '',
  tilDato: '',
  emneord: '',
  kunMedFrist: false,
};

export const AKT_TYPER: Record<AktType, { navn: string; ikon: string }> = {
  akt: { navn: 'Akt', ikon: 'description' },
  email: { navn: 'E-mail', ikon: 'mail' },
  dokument: { navn: 'Dokument', ikon: 'article' },
  chat: { navn: 'Chat', ikon: 'chat' },
  godkendelse: { navn: 'Godkendelse', ikon: 'verified' },
};

export const FLAG_FARVER: { id: FlagFarve; navn: string; farve: string }[] = [
  { id: '', navn: 'Intet flag', farve: 'transparent' },
  { id: 'roed', navn: 'Rød', farve: '#e5484d' },
  { id: 'orange', navn: 'Orange', farve: '#f2840f' },
  { id: 'gul', navn: 'Gul', farve: '#e8b10c' },
  { id: 'groen', navn: 'Grøn', farve: '#2ba36b' },
  { id: 'blaa', navn: 'Blå', farve: '#3a6df0' },
  { id: 'lilla', navn: 'Lilla', farve: '#8e4ec6' },
];

export function flagInfo(id: FlagFarve) {
  return FLAG_FARVER.find((f) => f.id === id) ?? FLAG_FARVER[0];
}

export function isoDato(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dag = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dag}`;
}

/** Det trin der aktuelt venter (godkendelser er sekventielle). */
export function aktueltTrin(a: Akt): GodkendelsesTrin | undefined {
  if (a.godkendelse?.status !== 'afventer') return undefined;
  return a.godkendelse.trin.find((t) => t.status === 'afventer');
}

export function venterPaa(a: Akt, brugerId: string): boolean {
  return aktueltTrin(a)?.godkenderId === brugerId;
}
