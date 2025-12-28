declare module "bn.js" {
  export default class BN {
    constructor(number: number | string | Buffer | number[] | bigint, base?: number, endian?: "le" | "be");
    toArrayLike(endian: "le" | "be", length: number): Buffer;
    toString(base?: number): string;
    fromTwos(width: number): BN;
    toTwos(width: number): BN;
    isZero(): boolean;
  }
}
