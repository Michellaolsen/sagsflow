# Sagsflow

Godkendelses- og sagsbehandlingssystem i Angular 19 (standalone components + signals).

## Kom i gang

Kræver Node.js 20 eller nyere.

```powershell
npm install
npm start          # åbner http://localhost:4200
```

## Struktur

```
src/app/
  core/       models.ts, lister.ts (listedefinitioner), seed.ts (demodata),
              data.service.ts (data + localStorage), state.service.ts (UI-tilstand)
  layout/     ribbon (titellinje + bånd), sidebar (lister), liste (tabel), preview (læserude)
  dialogs/    ny akt/e-mail/dokument/chat, ny godkendelse, avanceret søgning,
              kalender/påmindelser, ny sag, hjælp
```

Data gemmes i browserens localStorage. Når der kommer en rigtig backend, er det kun
`DataService` der skal skrives om til HTTP-kald.
