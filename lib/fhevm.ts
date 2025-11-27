/* eslint-disable @typescript-eslint/no-explicit-any */

type RelayerSdkModule = {
  initSDK: () => Promise<void>;
  createInstance: (config: any) => Promise<RelayerInstance>;
  SepoliaConfig: Record<string, unknown>;
};

export type RelayerInstance = {
  createEncryptedInput: (contractAddress: string, signerAddress: string) => any;
  userDecrypt: (...args: any[]) => Promise<any>;
  publicDecrypt: (handles: (string | Uint8Array)[]) => Promise<any>;
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (...args: any[]) => any;
};

let sdkPromise: Promise<RelayerSdkModule> | null = null;

// Try to get the global SDK's initSDK function
function tryGetInitFn(): (() => Promise<void>) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const candidates = [
    w.RelayerSDK?.initSDK,
    w.relayerSDK?.initSDK,
    w.zamaRelayerSDK?.initSDK,
  ];
  return candidates.find((fn): fn is () => Promise<void> => typeof fn === "function") ?? null;
}

// Get SDK module
function getSdkModule(): RelayerSdkModule | null {
  const w = window as any;
  const candidates = [w.RelayerSDK, w.relayerSDK, w.zamaRelayerSDK];
  return candidates.find((mod): mod is RelayerSdkModule => 
    Boolean(mod && typeof mod.createInstance === "function")
  ) ?? null;
}

// Load SDK (only load module, do not create instance)
export async function loadRelayerSdk(): Promise<RelayerSdkModule> {
  if (typeof window === "undefined") {
    throw new Error("Relayer SDK can only be loaded in browser");
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    // Wait for initSDK function to be available
    let initFn = tryGetInitFn();
    for (let i = 0; i < 50 && !initFn; i++) {
      await new Promise((r) => setTimeout(r, 100));
      initFn = tryGetInitFn();
    }

    if (!initFn) {
      throw new Error("Relayer SDK not loaded from CDN");
    }

    // Call initSDK to load WASM
    await initFn();

    // Get SDK module
    const sdk = getSdkModule();
    if (!sdk) {
      throw new Error("Relayer SDK module not found after initialization");
    }

    console.log("[FHEVM] SDK loaded");
    return sdk;
  })();

  return sdkPromise;
}

export type { RelayerSdkModule };
