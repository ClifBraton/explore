# Explore - Token-Gated Encrypted Content

**Powered by Zama FHE technology, exploring token/NFT-based decryption access control.**

Explore is a token-gated encrypted content platform built on Zama FHEVM. This project explores how to use tokens or NFTs to gain decryption access to on-chain encrypted content, implementing secure access control through Zama's fully homomorphic encryption technology.

> **Protocol Limitation:** Due to FHEVM protocol design, decryption access granted via `FHE.allow()` is permanent and cannot be revoked. Once a user gains access to a secret, they can still decrypt it even after transferring their tokens/NFTs (but cannot access newly published content).

## Key Features

- **Token/NFT gated access** - Content decryption requires holding specific ERC20 tokens or ERC721 NFTs
- **Multiple gate types** - Support for NFT (any), NFT (specific tokenId), and ERC20 (minimum balance)
- **On-chain encryption** - All secret content stored as FHE ciphertexts (euint64/euint256)
- **Creator permanent access** - Creators always have decryption rights to their own content
- **Real-time gate verification** - Access rights verified at the moment of decryption request

## Architecture

The platform uses Zama FHEVM for encrypted content management:

- **Smart contract:** `TokenGatedSecret.sol` manages secret creation, access requests, and ACL-based access control
- **Encrypted fields:** Secret value (euint64), Secret data (euint256)
- **Public fields:** Title, gate contract address, gate type, gate parameters, creator address
- **Access control:** `FHE.allow()` grants decryption rights after verifying gate requirements

## Gate Types

- `NFT_ANY` - Must hold any NFT from collection
- `NFT_SPECIFIC` - Must hold specific tokenId (param: tokenId)
- `ERC20_MIN` - Must hold minimum token balance (param: minBalance)

## FHEVM Protocol Limitations

Due to the design of the Zama FHEVM protocol, there are important limitations to understand:

### Important Notes

1. **Permanent Access Cannot Be Revoked**
   - Once `FHE.allow()` is called, the user has permanent decryption rights
   - This is a protocol-level limitation, not a design choice


2. **Token Transfer Does Not Revoke Access**
   - If a user gains access to Secret A while holding tokens
   - Then transfers their tokens to another address
   - They can still decrypt Secret A (already authorized)
   - But they CANNOT access new Secret B (gate check fails)

3. **Per-Content Authorization**
   - Each secret has independent access control
   - Authorization for Secret A does not grant access to Secret B
   - New content always requires fresh gate verification

### Security Model

```
Timeline:
1. User holds Token X
2. User requests access to Secret A -> Gate check PASSES -> FHE.allow() called
3. User transfers Token X away
4. User can still decrypt Secret A (already authorized)
5. Creator publishes Secret B (also gated by Token X)
6. User requests access to Secret B -> Gate check FAILS -> Access denied
```

This design ensures:
- Existing authorized content remains accessible (cannot be revoked)
- New content requires current token ownership
- Creators cannot retroactively revoke access to already-shared content

## How It Works

### Publishing Content

```
1. Create Secret    -> Enter title + encrypted content + gate requirements
2. FHE Encryption   -> Content encrypted with Zama FHE public key
3. On-chain Storage -> Encrypted handles stored in smart contract
4. Creator Access   -> FHE.allow() automatically grants creator permanent access
```

### Accessing Content

```
1. Browse Secrets   -> View titles and gate requirements
2. Check Gate       -> Contract verifies token/NFT ownership
3. Request Access   -> Call requestPermanentAccess() if gate check passes
4. FHE Decryption   -> Use Relayer SDK userDecrypt() to decrypt content
5. View Content     -> Decrypted content displayed to user
```

## Smart Contract

### Core Functions

- `createSecret()` - Create encrypted content with gate requirements
- `requestPermanentAccess()` - Request decryption access (requires gate check)
- `requestTransientAccess()` - Request temporary access (current tx only)
- `getSecretHandles()` - Get encrypted handles (requires gate check)
- `hasAccess()` - Check if user has access rights
- `meetsGateRequirement()` - Check if user meets gate requirements
- `getAllSecrets()` - Get all secrets public info

### Data Structure

```solidity
struct Secret {
    string title;           // Public - visible to all
    euint64 secretValue;    // Encrypted - FHE ciphertext
    euint256 secretData;    // Encrypted - FHE ciphertext
    address gateContract;   // Gate token/NFT contract
    GateType gateType;      // NFT_ANY, NFT_SPECIFIC, ERC20_MIN
    uint256 gateParam;      // tokenId or minBalance
    address creator;        // Content creator
    bool exists;
}
```

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Wallet:** RainbowKit + Wagmi v2
- **FHE SDK:** Zama Relayer SDK (CDN 0.3.0-5)

### Blockchain
- **Smart Contracts:** Solidity ^0.8.27
- **FHE Framework:** Zama FHEVM v0.9
- **Development:** Hardhat
- **Network:** Zama Protocol (Sepolia testnet)

## Getting Started

### Prerequisites

```bash
Node.js >= 18.0.0
npm or pnpm
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd explore

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_SECRET_CONTRACT=0x...
NEXT_PUBLIC_KEY_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_KEY_NFT_CONTRACT=0x...
```

### Development

```bash
# Run the development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
explore/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── providers/         # Context providers
│   │   ├── fhevm-provider.tsx
│   │   └── notification-provider.tsx
│   ├── secret/            # Secret components
│   │   ├── create-secret-panel.tsx
│   │   └── secret-list.tsx
│   └── mint/              # Demo token mint
│       └── mint-panel.tsx
├── lib/
│   └── contract.ts        # Contract addresses & ABIs
└── public/                # Static assets
```

## Contract Configuration

Contract addresses are configured via environment variables:

- `NEXT_PUBLIC_SECRET_CONTRACT` - TokenGatedSecret
- `NEXT_PUBLIC_KEY_TOKEN_CONTRACT` - KeyToken (ERC20)
- `NEXT_PUBLIC_KEY_NFT_CONTRACT` - KeyNFT (ERC721)
