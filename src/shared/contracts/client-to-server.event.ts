import { SocketMessageInterface } from './socket-message.interface';

export interface ClientToServerEvents {
  chat: (e: SocketMessageInterface) => void;
}