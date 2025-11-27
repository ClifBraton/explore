"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useWalletClient } from "wagmi";
import { loadRelayerSdk, type RelayerSdkModule, type RelayerInstance } from "@/lib/fhevm";

const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io";
const SEPOLIA_CHAIN_ID = 11155111;

interface RelayerContextValue {
  sdk: RelayerSdkModule | null;
  loading: boolean;
  error: Error | null;
  instance: RelayerInstance | null;
  instanceLoading: boolean;
  instanceError: Error | null;
}

const RelayerContext = createContext<RelayerContextValue>({
  sdk: null,
  loading: true,
  error: null,
  instance: null,
  instanceLoading: false,
  instanceError: null,
});

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RelayerContextValue>({
    sdk: null,
    loading: true,
    error: null,
    instance: null,
    instanceLoading: false,
    instanceError: null,
  });
  const { data: walletClient } = useWalletClient();
  const sdk = state.sdk;

  // Load SDK module
  useEffect(() => {
    let cancelled = false;

    loadRelayerSdk()
      .then((sdk) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, sdk, loading: false, error: null }));
        }
      })
      .catch((err) => {
        console.error("[FHEVM] SDK load failed:", err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            sdk: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Create instance (requires wallet connection)
  useEffect(() => {
    let cancelled = false;
    if (!sdk || !walletClient) {
      setState((prev) => ({ ...prev, instance: null, instanceLoading: false, instanceError: null }));
      return;
    }

    const run = async () => {
      try {
        setState((prev) => ({ ...prev, instanceLoading: true, instanceError: null }));

        const config = {
          ...sdk.SepoliaConfig,
          network: SEPOLIA_RPC_URL,
          chainId: SEPOLIA_CHAIN_ID,
          signer: { request: (args: unknown) => (walletClient as unknown as { request: (a: unknown) => Promise<unknown> }).request(args) },
        };

        const instance = await sdk.createInstance(config);
        if (!cancelled) {
          console.log("[FHEVM] Instance created");
          setState((prev) => ({ ...prev, instance, instanceLoading: false, instanceError: null }));
        }
      } catch (err) {
        console.error("[FHEVM] Instance creation failed:", err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            instance: null,
            instanceLoading: false,
            instanceError: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [sdk, walletClient]);

  const value = useMemo(() => state, [state]);

  return <RelayerContext.Provider value={value}>{children}</RelayerContext.Provider>;
}

export function useFhevm() {
  return useContext(RelayerContext);
}
