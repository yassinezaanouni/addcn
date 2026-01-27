import { UsernameClaimHero } from "./_components/username-claim-hero";

export default function Home() {
  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="container hero-padding">
        <UsernameClaimHero />
      </div>
    </section>
  );
}
