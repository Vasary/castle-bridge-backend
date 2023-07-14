import { SocketEventInterface } from './socket-event.interface';

export interface SocketMessageInterface {
  nickname: string;
  event: SocketEventInterface;
}
