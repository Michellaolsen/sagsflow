import { Akt, Bruger, Sag, isoDato } from './models';

export const MIG_ID = 'sh';

export const BRUGERE: Bruger[] = [
  { id: 'sh', navn: 'Sofie Holm', initialer: 'SH', enhed: 'Udvikling og Teknologi – Team 2', farve: '#047c6e' },
  { id: 'al', navn: 'Anders Lund', initialer: 'AL', enhed: 'Indkøb', farve: '#e0731a' },
  { id: 'cb', navn: 'Camilla Berg', initialer: 'CB', enhed: 'Økonomi', farve: '#8e4ec6' },
  { id: 'jf', navn: 'Jonas Friis', initialer: 'JF', enhed: 'Udvikling og Teknologi – Team 2', farve: '#1f9d8a' },
  { id: 'ld', navn: 'Line Dahl', initialer: 'LD', enhed: 'HR', farve: '#d4477a' },
  { id: 'pk', navn: 'Peter Krogh', initialer: 'PK', enhed: 'Direktionen', farve: '#4a6b8a' },
];

export const EMNEORD = [
  'Indkøb', 'Tilbud', 'Budget', 'HR', 'Rekruttering', 'Kontrakt', 'GDPR',
  'Netværk', 'Møde', 'Referat', 'Leverandør', 'Økonomi', 'IT-sikkerhed', 'Ferie',
];

function dage(n: number, h = 9, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
}
const frist = (n: number) => isoDato(dage(n));

export function seedSager(): Sag[] {
  const aar = new Date().getFullYear();
  return [
    { id: 1, nummer: `${aar}-0142`, titel: 'Indkøb af bærbare computere', status: 'åben', ansvarligId: 'sh', oprettet: dage(-40) },
    { id: 2, nummer: `${aar}-0157`, titel: 'Rekruttering – fullstack-udvikler', status: 'åben', ansvarligId: 'ld', oprettet: dage(-25) },
    { id: 3, nummer: `${aar}-0163`, titel: `Budget ${aar + 1} – IT`, status: 'åben', ansvarligId: 'sh', oprettet: dage(-18) },
    { id: 4, nummer: `${aar}-0171`, titel: 'Databehandleraftale – hostingleverandør', status: 'åben', ansvarligId: 'sh', oprettet: dage(-9) },
    { id: 5, nummer: `${aar - 1}-0988`, titel: 'Opgradering af netværk', status: 'lukket', ansvarligId: 'pk', oprettet: dage(-210) },
  ];
}

function akt(p: Partial<Akt> & Pick<Akt, 'id' | 'titel' | 'type' | 'fraId'>): Akt {
  const brevdato = p.brevdato ?? dage(0);
  return {
    emneord: [],
    tilIds: [],
    tekst: '',
    placering: 'ingen',
    sendt: false,
    favorit: false,
    ulaest: false,
    mitFlag: { farve: '', frist: '' },
    teamFlag: { farve: '', frist: '' },
    sorteringsdato: brevdato,
    ...p,
    brevdato,
  };
}

export function seedAkter(): Akt[] {
  const aar = new Date().getFullYear();
  return [
    akt({
      id: 1, titel: 'Tilbud på 40 bærbare computere', type: 'email', fraId: 'al', tilIds: ['sh'], sagId: 1,
      brevdato: dage(-1, 14, 12), placering: 'indbakke', ulaest: true, emneord: ['Indkøb', 'Tilbud'],
      tekst: 'Hej Sofie\n\nVedhæftet finder du tilbuddet fra leverandøren på 40 stk. bærbare computere inkl. dockingstationer og 3 års on-site service.\n\nSamlet pris: 398.400 kr. ekskl. moms.\nTilbuddet er gældende i 14 dage.\n\nVenlig hilsen\nAnders',
    }),
    akt({
      id: 2, titel: 'Godkendelse: Indkøb af bærbare (ramme 420.000 kr.)', type: 'godkendelse', fraId: 'cb', sagId: 1,
      brevdato: dage(0, 8, 41), ulaest: true, sendt: true, emneord: ['Indkøb', 'Budget'],
      tekst: 'Indstilling om godkendelse af indkøb af 40 bærbare computere inden for en samlet ramme på 420.000 kr. ekskl. moms. Udgiften afholdes af IT-driftsbudgettet.',
      godkendelse: {
        status: 'afventer', frist: frist(2), besked: 'Vi skal bestille inden fredag for at nå leveringen i januar.',
        trin: [
          { godkenderId: 'jf', status: 'godkendt', dato: dage(-1, 16, 5), kommentar: 'Teknisk spec ser fin ud.' },
          { godkenderId: 'sh', status: 'afventer' },
          { godkenderId: 'pk', status: 'afventer' },
        ],
      },
    }),
    akt({
      id: 3, titel: 'Ansøgning – fullstack-udvikler (Mads Ravn)', type: 'dokument', fraId: 'ld', sagId: 2,
      brevdato: dage(-2, 10, 30), placering: 'indbakke', emneord: ['HR', 'Rekruttering'],
      mitFlag: { farve: 'gul', frist: frist(5) },
      tekst: 'Ansøgning og CV fra Mads Ravn. Line beder om en faglig vurdering inden samtalerunde 1.',
    }),
    akt({
      id: 4, titel: 'Referat: Styregruppemøde', type: 'akt', fraId: 'sh', sagId: 3,
      brevdato: dage(-3, 15, 0), placering: 'skrivebord', favorit: true, emneord: ['Møde', 'Referat'],
      tekst: '1. Status på budgetproces\n2. Prioritering af projekter\n3. Eventuelt\n\nBeslutning: Budgetudkast v3 sendes til godkendelse i næste uge.',
    }),
    akt({
      id: 5, titel: `Budgetudkast IT ${aar + 1} v3`, type: 'dokument', fraId: 'sh', sagId: 3,
      brevdato: dage(-1, 11, 20), placering: 'skrivebord', emneord: ['Budget', 'Økonomi'],
      mitFlag: { farve: 'roed', frist: frist(1) }, teamFlag: { farve: 'blaa', frist: frist(7) },
      tekst: 'Tredje udkast til IT-budgettet. Ændringer siden v2: licensudgifter justeret, netværk flyttet til anlæg.',
    }),
    akt({
      id: 6, titel: 'Godkendelse: Ny databehandleraftale', type: 'godkendelse', fraId: 'sh', sagId: 4,
      brevdato: dage(-1, 9, 15), sendt: true, emneord: ['GDPR', 'Kontrakt', 'Leverandør'],
      tekst: 'Udkast til databehandleraftale med hostingleverandøren. Juridisk har gennemgået bilag 1–3.',
      godkendelse: {
        status: 'afventer', frist: frist(4), besked: 'Kan I nå at kigge på den inden torsdag?',
        trin: [
          { godkenderId: 'al', status: 'afventer' },
          { godkenderId: 'cb', status: 'afventer' },
        ],
      },
    }),
    akt({
      id: 7, titel: 'Spørgsmål til netværksopgraderingen', type: 'chat', fraId: 'jf', tilIds: ['sh'], sagId: 5,
      brevdato: dage(-4, 13, 47), sendt: true, emneord: ['Netværk'],
      tekst: 'Jonas: Har vi stadig adgang til den gamle switch-konfiguration?\nSofie: Ja, den ligger på sagen som bilag.',
    }),
    akt({
      id: 8, titel: 'Kontrakt – Netværksleverandør A/S', type: 'dokument', fraId: 'pk', sagId: 5,
      brevdato: dage(-120, 10, 0), placering: 'arkiv', emneord: ['Kontrakt', 'Netværk', 'Leverandør'],
      tekst: 'Underskrevet kontrakt vedr. levering og installation af nyt netværksudstyr.',
    }),
    akt({
      id: 9, titel: 'Noter fra leverandørmøde', type: 'akt', fraId: 'sh',
      brevdato: dage(0, 10, 5), placering: 'skrivebord', emneord: ['Møde', 'Leverandør'],
      tekst: 'Leverandøren kan levere i uge 3. Mangler endelig pris på dockingstationer.',
    }),
    akt({
      id: 10, titel: 'SV: Tilbud på licenser', type: 'email', fraId: 'sh', tilIds: ['al'], sagId: 1,
      brevdato: dage(-5, 9, 50), sendt: true, emneord: ['Indkøb'],
      tekst: 'Tak Anders – vi går videre med 3-årig licens.',
    }),
    akt({
      id: 11, titel: 'Godkendelse: Ferieplan Q1', type: 'godkendelse', fraId: 'ld',
      brevdato: dage(-8, 12, 0), placering: 'arkiv', sendt: true, emneord: ['Ferie', 'HR'],
      tekst: 'Ferieplan for første kvartal til godkendelse.',
      godkendelse: {
        status: 'godkendt', frist: frist(-4), besked: '',
        trin: [
          { godkenderId: 'sh', status: 'godkendt', dato: dage(-6, 9, 12) },
          { godkenderId: 'pk', status: 'godkendt', dato: dage(-5, 14, 40), kommentar: 'OK fra direktionen.' },
        ],
      },
    }),
    akt({
      id: 12, titel: `Indkaldelse: Kick-off budget ${aar + 1}`, type: 'email', fraId: 'cb', tilIds: ['sh', 'jf'], sagId: 3,
      brevdato: dage(-2, 8, 5), placering: 'indbakke', emneord: ['Budget', 'Møde'],
      teamFlag: { farve: 'groen', frist: frist(-1) },
      tekst: 'Kære alle\n\nI indkaldes hermed til kick-off på budgetprocessen. Dagsorden følger.\n\nMvh Camilla',
    }),
    akt({
      id: 13, titel: 'Udkast: Stillingsopslag', type: 'dokument', fraId: 'sh', sagId: 2,
      brevdato: dage(-6, 14, 30), placering: 'skrivebord', emneord: ['Rekruttering'],
      tekst: 'Vi søger en erfaren fullstack-udvikler med kendskab til Angular og .NET.',
    }),
  ];
}
