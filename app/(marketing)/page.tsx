import { UsernameClaimHero } from "./_components/username-claim-hero";

export default function Home() {
  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col justify-center px-6 py-24">
        <UsernameClaimHero />
      </div>
    </section>
  );
}
