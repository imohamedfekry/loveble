export const InjectQueue = () => () => undefined;
export const Processor = () => (target: any) => target;
export class WorkerHost {}
export const getQueueToken = (name: string) => `BullQueue_${name}`;
