import { SocketMessageInterface } from './socket-message.interface';

export interface ServerToClientEvents {
  chat: (e: SocketMessageInterface) => void;
}
