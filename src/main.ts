import { registerLocaleData } from '@angular/common';
import localeDa from '@angular/common/locales/da';
import { LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

registerLocaleData(localeDa);

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'da' },
  ],
}).catch((err) => console.error(err));
