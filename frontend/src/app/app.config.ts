import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { A2UI_RENDERER_CONFIG, A2uiRendererService, BasicCatalog } from '@a2ui/angular/v0_9';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    {
      provide: A2UI_RENDERER_CONFIG,
      useValue: {
        catalogs: [new BasicCatalog()],
      },
    },
    A2uiRendererService,
  ],
};
