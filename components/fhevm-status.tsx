"use client";

import { useFhevm } from "@/components/providers/fhevm-provider";

export function FhevmStatus() {
  const { sdk, loading, error, instance, instanceLoading, instanceError } = useFhevm();

  const getStatus = () => {
    if (loading) return { text: "SDK Loading...", color: "bg-yellow-500" };
    if (error) return { text: "SDK Error", color: "bg-red-500" };
    if (!sdk) return { text: "SDK Not Loaded", color: "bg-gray-500" };
    if (instanceLoading) return { text: "Creating Instance...", color: "bg-yellow-500" };
    if (instanceError) return { text: "Instance Error", color: "bg-red-500" };
    if (instance) return { text: "FHEVM Ready", color: "bg-green-500" };
    return { text: "Waiting Wallet", color: "bg-blue-500" };
  };

  const status = getStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${status.color} text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2`}>
        <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
        {status.text}
      </div>
    </div>
  );
}
