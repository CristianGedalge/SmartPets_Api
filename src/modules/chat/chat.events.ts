import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
@Injectable()
export class ChatEvents {
  private readonly events = new EventEmitter();
  notify(users: string[], conversationId: string) {
    this.events.emit('change', users, conversationId);
  }
  subscribe(listener: (users: string[], conversationId: string) => void) {
    this.events.on('change', listener);
    return () => {
      this.events.off('change', listener);
    };
  }
}
