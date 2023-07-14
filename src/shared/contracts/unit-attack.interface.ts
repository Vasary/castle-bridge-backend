import { SocketEventInterface } from './socket-event.interface';

export interface unitAttackInterface extends SocketEventInterface {
  unitId: string;
  enemyId: string;
}
