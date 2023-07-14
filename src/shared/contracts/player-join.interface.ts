import { SocketEventInterface } from './socket-event.interface';

export interface PlayerJoinInterface extends SocketEventInterface {
  id: string;
  nickname: string;
}
