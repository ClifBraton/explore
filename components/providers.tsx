"use client";

import { type ReactNode } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { FhevmProvider } from "@/components/providers/fhevm-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { FhevmStatus } from "@/components/fhevm-status";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
          locale="zh-CN"
        >
          <FhevmProvider>
            <NotificationProvider>
              {children}
              <FhevmStatus />
            </NotificationProvider>
          </FhevmProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { WalletProviders };
