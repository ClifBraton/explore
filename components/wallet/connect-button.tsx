"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                  >
                    连接钱包
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    切换网络
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 backdrop-blur-md border border-zinc-700/50 rounded-lg transition-colors"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? "Chain"}
                        src={chain.iconUrl}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-sm text-zinc-300">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 backdrop-blur-md border border-zinc-700/50 rounded-lg transition-colors"
                  >
                    <span className="text-sm text-white font-medium">
                      {account.displayName}
                    </span>
                    {account.displayBalance && (
                      <span className="text-sm text-zinc-400">
                        {account.displayBalance}
                      </span>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
