"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/lib/contract";
import { useNotification } from "@/components/providers/notification-provider";

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 bg-zinc-800 rounded px-2 py-1 mt-2">
      <span className="text-zinc-400 text-xs font-mono truncate flex-1">
        {address}
      </span>
      <button
        onClick={handleCopy}
        className="text-zinc-500 hover:text-white shrink-0"
        title="Copy Address"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function MintPanel() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"token" | "nft">("token");

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-xl shadow-xl rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800/50">
        <button
          onClick={() => setActiveTab("token")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "token"
              ? "text-violet-400 bg-violet-500/10 border-b-2 border-violet-500"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Mint Token
        </button>
        <button
          onClick={() => setActiveTab("nft")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "nft"
              ? "text-violet-400 bg-violet-500/10 border-b-2 border-violet-500"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Mint NFT
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "token" ? <MintToken isConnected={isConnected} /> : <MintNFT isConnected={isConnected} />}
      </div>
    </div>
  );
}

function MintToken({ isConnected }: { isConnected: boolean }) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { success: showSuccess } = useNotification();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (isSuccess && !hasNotified.current) {
      hasNotified.current = true;
      showSuccess("Token minted successfully!\n\nPlease wait about 3 minutes for on-chain data synchronization before it can be used for decryption access verification.", true);
      setTimeout(() => reset(), 2000);
    }
    if (!isSuccess) hasNotified.current = false;
  }, [isSuccess, showSuccess, reset]);

  const handleMint = () => {
    writeContract({
      address: CONTRACTS.KeyToken.address,
      abi: CONTRACTS.KeyToken.abi,
      functionName: "mint",
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2"><h3 className="text-white font-medium">Key Token (KEY)</h3><span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Demo Token</span></div>
            <p className="text-zinc-500 text-sm">Get 10,000 KEY per mint</p>
          </div>
        </div>
        <CopyAddress address={CONTRACTS.KeyToken.address || ""} />
      </div>

      <button
        onClick={handleMint}
        disabled={!isConnected || isPending || isConfirming}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {!isConnected ? "Connect Wallet" : isPending ? "Confirming..." : isConfirming ? "On-chain confirming..." : isSuccess ? "Mint Success!" : "Mint Token"}
      </button>
    </div>
  );
}

function MintNFT({ isConnected }: { isConnected: boolean }) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { success: showSuccess } = useNotification();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (isSuccess && !hasNotified.current) {
      hasNotified.current = true;
      showSuccess("NFT minted successfully!\n\nPlease wait about 3 minutes for on-chain data synchronization before it can be used for decryption access verification.", true);
      setTimeout(() => reset(), 2000);
    }
    if (!isSuccess) hasNotified.current = false;
  }, [isSuccess, showSuccess, reset]);

  const handleMint = () => {
    writeContract({
      address: CONTRACTS.KeyNFT.address,
      abi: CONTRACTS.KeyNFT.abi,
      functionName: "mint",
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2"><h3 className="text-white font-medium">Key NFT (KNFT)</h3><span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">Demo NFT</span></div>
            <p className="text-zinc-500 text-sm">Mint one NFT for free</p>
          </div>
        </div>
        <CopyAddress address={CONTRACTS.KeyNFT.address || ""} />
      </div>

      <button
        onClick={handleMint}
        disabled={!isConnected || isPending || isConfirming}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {!isConnected ? "Connect Wallet" : isPending ? "Confirming..." : isConfirming ? "On-chain confirming..." : isSuccess ? "Mint Success!" : "Mint NFT"}
      </button>
    </div>
  );
}
