"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWalletClient, useWriteContract } from "wagmi";
import { CONTRACTS, GateType, type SecretPublicInfo } from "@/lib/contract";
import { useFhevm } from "@/components/providers/fhevm-provider";
import { useNotification } from "@/components/providers/notification-provider";

export function SecretList() {
  const { address, isConnected } = useAccount();

  const { data: secrets, isLoading, refetch } = useReadContract({
    address: CONTRACTS.TokenGatedSecret.address,
    abi: CONTRACTS.TokenGatedSecret.abi,
    functionName: "getAllSecrets",
  });

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-xl shadow-xl rounded-xl overflow-hidden h-full">
      <div className="border-b border-zinc-800/50 py-3 px-6 flex items-center justify-between">
        <h3 className="text-white font-medium">Encrypted Content List</h3>
        <button
          onClick={() => refetch()}
          className="text-zinc-400 hover:text-white text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Loading...</p>
          </div>
        ) : !secrets || (secrets as SecretPublicInfo[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500">No encrypted content</p>
          </div>
        ) : (
          [...(secrets as SecretPublicInfo[])].reverse().map((secret, idx) => (
            <SecretCard
              key={idx}
              secret={secret}
              userAddress={address}
              isConnected={isConnected}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SecretCard({
  secret,
  userAddress,
  isConnected,
}: {
  secret: SecretPublicInfo;
  userAddress?: `0x${string}`;
  isConnected: boolean;
}) {
  const { instance } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { success: showSuccess, error: showError } = useNotification();
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptStep, setDecryptStep] = useState<string>("");

  const { data: hasAccess } = useReadContract({
    address: CONTRACTS.TokenGatedSecret.address,
    abi: CONTRACTS.TokenGatedSecret.abi,
    functionName: "hasAccess",
    args: [secret.secretId, userAddress!],
    query: { enabled: isConnected && !!userAddress },
  });

  // Get encrypted handles
  const { data: handles } = useReadContract({
    address: CONTRACTS.TokenGatedSecret.address,
    abi: CONTRACTS.TokenGatedSecret.abi,
    functionName: "getSecretHandles",
    args: [secret.secretId],
    account: userAddress,
    query: { enabled: isConnected && !!userAddress && !!hasAccess },
  });

  const isNFT = secret.gateType === GateType.NFT_ANY || secret.gateType === GateType.NFT_SPECIFIC;

  // Get gate contract name
  const { data: gateContractName } = useReadContract({
    address: secret.gateContract as `0x${string}`,
    abi: [{ name: "name", type: "function", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" }],
    functionName: "name",
    query: { enabled: !!secret.gateContract },
  });

  // BigInt to text
  const bigintToString = (val: bigint): string => {
    if (val === BigInt(0)) return "";
    const hex = val.toString(16);
    const bytes = hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)).filter(b => b > 0) || [];
    if (bytes.length > 0) {
      return String.fromCharCode(...bytes);
    }
    return val.toString();
  };

  const isCreator = userAddress?.toLowerCase() === secret.creator.toLowerCase();

  const handleDecrypt = async () => {
    if (!instance || !userAddress || !walletClient) {
      showError("Wallet or FHE not ready");
      return;
    }

    // Non-creators must meet gate requirements
    if (!isCreator && !hasAccess) {
      showError("Gate requirements not met, cannot decrypt");
      return;
    }
    
    setIsDecrypting(true);
    
    try {
      // Creator already has permission, non-creators need to request
      if (!isCreator) {
        setDecryptStep("Requesting access permission...");
        console.log("[Decrypt] Requesting permanent access for secret:", secret.secretId);
        
        const txHash = await writeContractAsync({
          address: CONTRACTS.TokenGatedSecret.address,
          abi: CONTRACTS.TokenGatedSecret.abi,
          functionName: "requestPermanentAccess",
          args: [secret.secretId],
        });
        
        console.log("[Decrypt] Access tx:", txHash);
        setDecryptStep("Waiting for transaction confirmation...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      setDecryptStep("Decrypting...");
      
      // Generate keypair
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "1";

      // Create EIP712 signature
      const eip712 = instance.createEIP712(
        keypair.publicKey,
        [CONTRACTS.TokenGatedSecret.address],
        startTimeStamp,
        durationDays
      );

      const signature = await walletClient.signTypedData({
        account: walletClient.account!,
        domain: eip712.domain as Record<string, unknown>,
        types: eip712.types as Record<string, unknown>,
        primaryType: "UserDecryptRequestVerification",
        message: eip712.message as Record<string, unknown>,
      });

      // Need to get latest handles from contract
      if (!handles) {
        throw new Error("Unable to get encrypted data");
      }
      
      const [, dataHandle] = handles as [string, string];
      console.log("[Decrypt] Data handle:", dataHandle);

      // Call userDecrypt
      const handleContractPairs = [{ handle: dataHandle, contractAddress: CONTRACTS.TokenGatedSecret.address }];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userDecryptFn = (instance as any).userDecrypt;

      const result = await userDecryptFn(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        [CONTRACTS.TokenGatedSecret.address],
        userAddress,
        startTimeStamp,
        durationDays
      );

      console.log("[Decrypt] Result:", result);
      const decryptedValue = result[dataHandle];
      const text = bigintToString(typeof decryptedValue === "bigint" ? decryptedValue : BigInt(decryptedValue || 0));
      setDecryptedText(text || "(Empty content)");
      setDecryptStep("");
      showSuccess("Decryption successful");
    } catch (err) {
      console.error("[Decrypt] Error:", err);
      const msg = err instanceof Error ? err.message : "Decryption failed";
      // Simplify error messages
      if (msg.includes("User denied") || msg.includes("User rejected")) {
        showError("User cancelled operation");
      } else if (msg.includes("GateRequirementNotMet")) {
        showError("Gate requirements not met");
      } else {
        showError(msg.length > 50 ? msg.slice(0, 50) + "..." : msg);
      }
      setDecryptStep("");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 backdrop-blur-sm rounded-lg p-4 hover:bg-zinc-800/50 transition-colors">
      {/* Title + Permission Status */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-medium">{secret.title || "Untitled"}</h4>
        {userAddress?.toLowerCase() === secret.creator.toLowerCase() ? (
          <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400">Creator has automatic decrypt access</span>
        ) : hasAccess ? (
          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Accessible</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">No Access</span>
        )}
      </div>

      {/* Encrypted Content Area */}
      <div className="mb-3">
        {decryptedText ? (
          <div className="bg-zinc-900 rounded-lg p-3 text-sm text-zinc-300">
            {decryptedText}
          </div>
        ) : (
          <div className="bg-black rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Content encrypted</span>
              </div>
              <button
                onClick={handleDecrypt}
                disabled={isDecrypting || !instance}
                className="text-xs px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white rounded transition-colors"
              >
                {isDecrypting ? (decryptStep || "Processing...") : "Decrypt"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="pt-3 border-t border-zinc-700/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Require:</span>
          <span className={`px-1.5 py-0.5 rounded font-medium ${isNFT ? "bg-violet-500/20 text-violet-400" : "bg-blue-500/20 text-blue-400"}`}>{isNFT ? "NFT" : "ERC20"}</span>
          {gateContractName && <span className="text-zinc-300">{gateContractName as string}</span>}
          <button onClick={() => navigator.clipboard.writeText(secret.gateContract)} className="font-mono text-zinc-400 hover:text-white" title={secret.gateContract}>{secret.gateContract.slice(0, 6)}...{secret.gateContract.slice(-4)}</button>
          {secret.gateType === GateType.NFT_SPECIFIC && <span className="text-zinc-500">#{secret.gateParam.toString()}</span>}
          {secret.gateType === GateType.ERC20_MIN && <span className="text-zinc-500">&gt;={secret.gateParam.toString()}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Creator:</span>
          <button onClick={() => navigator.clipboard.writeText(secret.creator)} className="font-mono text-zinc-400 hover:text-white" title={secret.creator}>{secret.creator.slice(0, 6)}...{secret.creator.slice(-4)}</button>
        </div>
      </div>
    </div>
  );
}
