import baseX from "base-x";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const bs58 = baseX(ALPHABET);

export default bs58;
export const encode = bs58.encode;
export const decode = bs58.decode;
