import TokenGatedSecretABI from "./abi/TokenGatedSecret.json";
import KeyTokenABI from "./abi/KeyToken.json";
import KeyNFTABI from "./abi/KeyNFT.json";

// Contract addresses (Sepolia)
export const CONTRACTS = {
  TokenGatedSecret: {
    address: process.env.NEXT_PUBLIC_SECRET_CONTRACT as `0x${string}`,
    abi: TokenGatedSecretABI.abi,
  },
  KeyToken: {
    address: process.env.NEXT_PUBLIC_KEY_TOKEN_CONTRACT as `0x${string}`,
    abi: KeyTokenABI.abi,
  },
  KeyNFT: {
    address: process.env.NEXT_PUBLIC_KEY_NFT_CONTRACT as `0x${string}`,
    abi: KeyNFTABI.abi,
  },
} as const;

// Gate type enum
export enum GateType {
  NFT_ANY = 0,
  NFT_SPECIFIC = 1,
  ERC20_MIN = 2,
}

// Secret public info interface
export interface SecretPublicInfo {
  secretId: bigint;
  title: string;
  gateContract: `0x${string}`;
  gateType: GateType;
  gateParam: bigint;
  creator: `0x${string}`;
}
