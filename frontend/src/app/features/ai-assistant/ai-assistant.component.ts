import {
  Component, inject, signal, computed,
  ViewChild, ElementRef, AfterViewChecked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule }        from '@angular/forms';
import { TextFieldModule }    from '@angular/cdk/text-field';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }   from '@angular/material/tooltip';
import { AiService }          from '../../core/services/ai.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  error?: boolean;
}

interface AssistantMessage extends ChatMessage {
  sources?: { title?: string; excerpt: string; distance: number }[];
}

const QUICK_PROMPTS = [
  'Rédige un devis pour une fenêtre aluminium 1.2m×1.4m double vitrage',
  'Explique les niveaux de stock critiques et comment les gérer',
  'Quels sont les délais de paiement habituels au Maroc ?',
  'Comment calculer le prix de vente d\'un profilé aluminium ?',
];

@Component({
  selector: 'erp-ai-assistant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, TextFieldModule,
    NgFor, NgIf, DatePipe,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .ai-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 1.75rem;
      gap: 1rem;
      max-width: 900px;
      animation: fadeInUp .3s var(--ease) both;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding-bottom: 1.125rem;
      border-bottom: 1px solid var(--clr-border);
    }

    .ai-avatar {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ai-title   { font-size: 1.125rem; font-weight: 700; color: var(--clr-text); margin: 0; }
    .ai-subtitle{ font-size: .8rem; color: var(--clr-muted); margin: 0; }

    .quick-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }

    .quick-btn {
      padding: .5rem .875rem;
      border: 1.5px solid var(--clr-border);
      border-radius: var(--r-md);
      background: var(--clr-surface);
      color: var(--clr-text-2);
      font-size: .8125rem;
      font-family: inherit;
      cursor: pointer;
      transition: background var(--dur) var(--ease), border-color var(--dur), color var(--dur);
      text-align: left;
      line-height: 1.4;
      max-width: 260px;

      &:hover {
        background: var(--clr-primary-light);
        border-color: #bfdbfe;
        color: var(--clr-primary);
      }
    }

    .messages-wrap {
      flex: 1;
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .messages-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .empty-chat {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--clr-muted);
      text-align: center;
      gap: .5rem;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; opacity: .25; }
      p { margin: 0; font-size: .9375rem; }
    }

    .msg-row-user { display: flex; justify-content: flex-end; }
    .msg-row-bot  { display: flex; justify-content: flex-start; align-items: flex-end; gap: .5rem; }

    .bot-icon {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: .875rem; width: .875rem; height: .875rem; color: #fff; }
    }

    .timestamp {
      font-size: .7rem;
      opacity: .55;
      display: block;
      margin-top: .375rem;
    }

    .typing-indicator {
      background: var(--clr-surface);
      border: 1px solid var(--clr-border);
      border-radius: var(--r-lg);
      border-bottom-left-radius: 4px;
      padding: .75rem 1rem;
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .875rem;
      color: var(--clr-muted);
      box-shadow: var(--shadow-sm);
    }

    .input-area {
      border-top: 1px solid var(--clr-border);
      padding: .875rem 1.25rem;
      display: flex;
      gap: .625rem;
      align-items: flex-end;
      background: #fafafa;
    }

    .input-hint {
      font-size: .7rem;
      color: var(--clr-muted);
      padding: 0 1.25rem .625rem;
      background: #fafafa;
    }
  `],
  template: `
    <div class="ai-layout">

      <!-- Header -->
      <div class="ai-header">
        <div class="ai-avatar">
          <mat-icon style="color:#fff;font-size:1.375rem;width:1.375rem;height:1.375rem">smart_toy</mat-icon>
        </div>
        <div>
          <p class="ai-title">Assistant IA – Menuiserie Aluminium</p>
          <p class="ai-subtitle">Propulsé par Mistral via Ollama · Modèle local, données confidentielles</p>
        </div>
      </div>

      <!-- Quick prompts (when empty) -->
      @if (messages().length === 0) {
        <div class="quick-prompts">
          @for (p of quickPrompts; track p) {
            <button class="quick-btn" (click)="sendQuick(p)">{{ p }}</button>
          }
        </div>
      }

      <!-- Messages -->
      <div class="messages-wrap">
        <div #scrollContainer class="messages-scroll">

          @if (messages().length === 0) {
            <div class="empty-chat">
              <mat-icon>forum</mat-icon>
              <p>Posez une question ou choisissez une suggestion ci-dessus.</p>
            </div>
          }

          @for (msg of messages(); track msg.timestamp) {
            @if (msg.role === 'user') {
              <div class="msg-row-user">
                <div class="chat-bubble user">
                  {{ msg.text }}
                  <span class="timestamp">{{ msg.timestamp | date:'HH:mm' }}</span>
                </div>
              </div>
            } @else {
              <div class="msg-row-bot">
                <div class="bot-icon">
                  <mat-icon>smart_toy</mat-icon>
                </div>
                <div [class]="'chat-bubble bot' + (msg.error ? ' error' : '')">
                  {{ msg.text }}
                  <span class="timestamp">{{ msg.timestamp | date:'HH:mm' }}</span>
                </div>
              </div>
            }
          }

          @if (loading()) {
            <div class="msg-row-bot">
              <div class="bot-icon"><mat-icon>smart_toy</mat-icon></div>
              <div class="typing-indicator">
                <mat-spinner diameter="14"/>
                <span>Mistral réfléchit…</span>
              </div>
            </div>
          }

        </div>

        <!-- Input -->
        <div class="input-area">
          <mat-form-field style="flex:1" appearance="outline" subscriptSizing="dynamic">
            <mat-label>Votre message</mat-label>
            <textarea
              matInput
              cdkTextareaAutosize
              cdkAutosizeMinRows="1"
              cdkAutosizeMaxRows="5"
              [(ngModel)]="inputText"
              (keydown.enter)="onEnter($event)"
              [disabled]="loading()"
              placeholder="Ex: Rédige un e-mail de relance pour un devis en attente…">
            </textarea>
          </mat-form-field>

          <button mat-raised-button color="primary"
                  [disabled]="!canSend()"
                  (click)="send()"
                  matTooltip="Envoyer (Entrée)"
                  style="height:40px;min-width:80px">
            <mat-icon>send</mat-icon>
          </button>

          @if (messages().length > 0) {
            <button mat-icon-button color="warn"
                    (click)="clear()"
                    matTooltip="Effacer la conversation">
              <mat-icon>delete_sweep</mat-icon>
            </button>
          }
        </div>
        <div class="input-hint">Shift+Entrée pour un saut de ligne · Entrée pour envoyer</div>
      </div>

    </div>
  `,
})
export class AiAssistantComponent implements AfterViewChecked {
  private readonly ai = inject(AiService);

  @ViewChild('scrollContainer') private readonly scrollContainer!: ElementRef<HTMLDivElement>;

  readonly quickPrompts = QUICK_PROMPTS;
  readonly messages     = signal<AssistantMessage[]>([]);
  readonly loading      = signal(false);

  inputText = '';
  private conversationId: string | null = null;

  readonly canSend = computed(() => this.inputText.trim().length > 0 && !this.loading());

  private shouldScrollToBottom = false;

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      if (this.canSend()) this.send();
    }
  }

  sendQuick(text: string): void {
    this.inputText = text;
    this.send();
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    this.messages.update(m => [...m, { role: 'user', text, timestamp: new Date() }]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    console.log('[AI Component] Sending message:', text);
    this.ai.assistant({
      message: text,
      conversation_id: this.conversationId ?? undefined,
      use_rag: true,
      top_k: 3,
      temperature: 0.3,
    }).subscribe({
      next: res => {
        console.log('[AI Component] Response received:', res);
        this.conversationId = res.conversation_id;
        const assistantText = this.appendSources(res.reply, res.sources);
        this.messages.update(m => [...m, {
          role: 'assistant',
          text: assistantText,
          timestamp: new Date(),
          sources: res.sources,
        }]);
        this.loading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: err => {
        console.error('[AI Component] Error:', err.status, err.error);
        const errorText = err.status === 503
          ? 'Le modèle IA n\'est pas disponible. Lancez : docker exec erp-ollama ollama pull mistral'
          : 'Une erreur est survenue. Veuillez réessayer.';
        this.messages.update(m => [...m, { role: 'assistant', text: errorText, timestamp: new Date(), error: true }]);
        this.loading.set(false);
        this.shouldScrollToBottom = true;
      },
    });
  }

  private appendSources(text: string, sources?: { title?: string; excerpt: string; distance: number }[]): string {
    if (!sources?.length) {
      return text;
    }

    const formatted = sources
      .map((source, index) => `Source ${index + 1}: ${source.title ?? 'Document'}\n${source.excerpt.trim()}${source.distance != null ? ` (distance: ${source.distance.toFixed(4)})` : ''}`)
      .join('\n\n');

    return `${text}\n\nSources:\n${formatted}`;
  }

  clear(): void { this.messages.set([]); }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}
