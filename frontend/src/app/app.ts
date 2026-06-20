import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SurfaceComponent } from '@a2ui/angular/v0_9';
import { AgentService } from './agent/agent.service';

@Component({
  selector: 'app-root',
  imports: [SurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly agent = inject(AgentService);

  protected readonly curriculoBase64 = signal('');
  protected readonly vagaBase64 = signal('');
  protected readonly pergunta = signal('');

  protected readonly podeAnalisar = computed(
    () =>
      !!this.curriculoBase64() &&
      !!this.vagaBase64() &&
      !!this.pergunta().trim() &&
      !this.agent.isRunning(),
  );

  protected onFileChange(event: Event, tipo: 'curriculo' | 'vaga'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? '';
      if (tipo === 'curriculo') {
        this.curriculoBase64.set(base64);
      } else {
        this.vagaBase64.set(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  protected onPerguntaInput(event: Event): void {
    this.pergunta.set((event.target as HTMLTextAreaElement).value);
  }

  protected analisar(): void {
    if (!this.podeAnalisar()) return;
    this.agent.enviar(this.pergunta(), this.curriculoBase64(), this.vagaBase64());
    this.pergunta.set('');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.analisar();
    }
  }
}
