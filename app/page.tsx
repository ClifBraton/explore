import { WalletConnectButton } from "@/components/wallet/connect-button";
import { MintPanel } from "@/components/mint/mint-panel";
import { CreateSecretPanel } from "@/components/secret/create-secret-panel";
import { SecretList } from "@/components/secret/secret-list";
import { AnimatedBackground } from "@/components/layout/animated-background";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/star.svg" alt="Star" width={28} height={28} className="h-7 w-7 select-none" />
            <h1 className="text-2xl font-light tracking-[0.3em] uppercase text-white drop-shadow-lg">
              explore
            </h1>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Panels */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Create + Mint */}
          <div className="space-y-6">
            <CreateSecretPanel />
            <MintPanel />
          </div>
          {/* Right: Secret List */}
          <SecretList />
        </div>
      </main>
    </div>
  );
}
