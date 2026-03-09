declare module "ssm-session" {
  export const ssm: {
    init(socket: WebSocket, options: { token: string; termOptions: { rows: number; cols: number } }): void;
    decode(data: ArrayBuffer): { payloadType: number; payload: Uint8Array; messageType: string; sequenceNumber: number };
    sendACK(socket: WebSocket, message: { messageType: string; sequenceNumber: number }): void;
    sendInitMessage(socket: WebSocket, termOptions: { rows: number; cols: number }): void;
    sendText(socket: WebSocket, data: Uint8Array): void;
  };
}
