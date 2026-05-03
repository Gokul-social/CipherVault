declare module "@ika.xyz/sdk" {
  export const Curve: any;
  export const Hash: any;
  export const SignatureAlgorithm: any;
  export class IkaSDK {
    constructor(config: any);
    createUserShareEncryptionKey(pubkey: any): Promise<any>;
    createZeroTrustDwallet(config: any): Promise<any>;
  }
}
