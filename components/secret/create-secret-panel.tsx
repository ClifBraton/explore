"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, GateType } from "@/lib/contract";
import { useFhevm } from "@/components/providers/fhevm-provider";

export function CreateSecretPanel() {
  const { address, isConnected } = useAccount();
  const { instance, instanceLoading } = useFhevm();
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [title, setTitle] = useState("");
  const [secretText, setSecretText] = useState("");
  const [gateType, setGateType] = useState<GateType>(GateType.NFT_ANY);
  const [gateContract, setGateContract] = useState<string>("");
  const [gateParam, setGateParam] = useState("0");
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Reset form after success
  const hasHandledSuccess = useRef(false);
  useEffect(() => {
    if (isSuccess && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      // Delay reset to show success state
      setTimeout(() => {
        setTitle("");
        setSecretText("");
        setGateContract("");
        setGateParam("0");
        reset();
      }, 2000);
    }
    if (!isSuccess) {
      hasHandledSuccess.current = false;
    }
  }, [isSuccess, reset]);

  if (!isConnected) {
    return (
      <div className="bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-xl shadow-xl rounded-xl p-6 text-center">
        <p className="text-zinc-400">Please connect wallet</p>
      </div>
    );
  }

  // Convert text to BigInt (max 31 bytes, compatible with euint256)
  const textToBigInt = (text: string): bigint => {
    const bytes = new TextEncoder().encode(text.slice(0, 31));
    let hex = "";
    bytes.forEach(b => { hex += b.toString(16).padStart(2, "0"); });
    return hex ? BigInt("0x" + hex) : BigInt(0);
  };

  // Convert handle to hex string
  const toHex = (handle: unknown): `0x${string}` => {
    if (typeof handle === "string") {
      return handle.startsWith("0x") ? handle as `0x${string}` : `0x${handle}`;
    }
    if (typeof handle === "bigint") {
      return `0x${handle.toString(16).padStart(64, "0")}`;
    }
    if (handle instanceof Uint8Array) {
      return `0x${Array.from(handle).map(b => b.toString(16).padStart(2, "0")).join("")}`;
    }
    return `0x${String(handle)}`;
  };

  const handleSubmit = async () => {
    if (!instance || !address || !title || !secretText) return;

    // Update UI immediately
    setIsEncrypting(true);
    await new Promise(r => setTimeout(r, 10));

    try {
      console.log("[CreateSecret] Starting encryption...");

      // Convert text to BigInt
      const secretBigInt = textToBigInt(secretText);
      console.log("[CreateSecret] Text encoded, length:", secretText.length);

      // Create encrypted input
      const input = instance.createEncryptedInput(CONTRACTS.TokenGatedSecret.address, address);
      input.add64(BigInt(secretText.length)); // Store length
      input.add256(secretBigInt); // Store content
      
      console.log("[CreateSecret] Encrypting...");
      const encrypted = await input.encrypt();
      console.log("[CreateSecret] Encrypted, handles:", encrypted.handles);
      setIsEncrypting(false);

      // Call contract
      console.log("[CreateSecret] Calling contract...");
      writeContract({
        address: CONTRACTS.TokenGatedSecret.address,
        abi: CONTRACTS.TokenGatedSecret.abi,
        functionName: "createSecret",
        args: [
          title,
          toHex(encrypted.handles[0]),
          toHex(encrypted.handles[1]),
          gateContract as `0x${string}`,
          gateType,
          BigInt(gateParam),
          toHex(encrypted.inputProof),
        ],
      });
    } catch (err) {
      setIsEncrypting(false);
      console.error("[CreateSecret] Error:", err);
    }
  };

  const isLoading = isPending || isConfirming || isEncrypting || instanceLoading;

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-xl shadow-xl rounded-xl overflow-hidden">
      <div className="border-b border-zinc-800/50 py-3 px-6">
        <h3 className="text-white font-medium text-center">Publish Encrypted Content</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Encrypted Content */}
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Encrypted Content <span className="text-zinc-500">(max 31 chars)</span></label>
          <input
            type="text"
            value={secretText}
            onChange={(e) => setSecretText(e.target.value.slice(0, 31))}
            placeholder="Enter text to encrypt"
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <p className="text-zinc-500 text-xs mt-1">{secretText.length}/31</p>
        </div>

        {/* Gate Type */}
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Gate Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setGateType(GateType.NFT_ANY)}
              className={`py-2 text-xs rounded-lg transition-colors ${
                gateType === GateType.NFT_ANY
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              Any NFT
            </button>
            <button
              type="button"
              onClick={() => setGateType(GateType.NFT_SPECIFIC)}
              className={`py-2 text-xs rounded-lg transition-colors ${
                gateType === GateType.NFT_SPECIFIC
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              Specific NFT
            </button>
            <button
              type="button"
              onClick={() => setGateType(GateType.ERC20_MIN)}
              className={`py-2 text-xs rounded-lg transition-colors ${
                gateType === GateType.ERC20_MIN
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              Token Balance
            </button>
          </div>
        </div>

        {/* Gate Contract */}
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">
            {gateType === GateType.ERC20_MIN ? "ERC20 Token Contract" : "NFT Contract Address"}
          </label>
          <input
            type="text"
            value={gateContract}
            onChange={(e) => setGateContract(e.target.value)}
            placeholder="0x..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 font-mono"
          />
        </div>

        {/* Gate Parameter */}
        {gateType !== GateType.NFT_ANY && (
          <div>
            <label className="text-zinc-400 text-sm mb-1 block">
              {gateType === GateType.NFT_SPECIFIC ? "Token ID" : "Minimum Balance"}
            </label>
            <input
              type="number"
              value={gateParam}
              onChange={(e) => setGateParam(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !title || !secretText || !instance}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isEncrypting ? "Encrypting..." : isPending ? "Confirming..." : isConfirming ? "On-chain confirming..." : isSuccess ? "Published!" : instanceLoading ? "Loading SDK..." : "Encrypt & Publish"}
        </button>

        {isSuccess && (
          <p className="text-green-400 text-sm text-center">Published successfully!</p>
        )}
      </div>
    </div>
  );
}
