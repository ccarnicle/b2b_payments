import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-2">
        <div className="container mx-auto px-6">
          <div className="bg-primary text-primary-foreground rounded-2xl p-12 grid md:grid-cols-5 gap-12 items-center">
            <div className="space-y-6 md:col-span-3">
              <p className="font-semibold text-secondary-foreground">Smart Pacts for Independent Creators</p>
              <h1 className="text-5xl font-bold font-display tracking-tight leading-relaxed">
                Payments, simplified.
                <br />
                Work, empowered.
              </h1>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center">
                  <span className="mr-3">✅</span>
                  Trustless, onchain agreements
                </li>
                <li className="flex items-center">
                  <span className="mr-3">✅</span>
                  Milestone-based payouts
                </li>
                <li className="flex items-center">
                  <span className="mr-3">✅</span>
                  Terms secured on Filecoin
                </li>
              </ul>
              <div className="text-center lg:text-left">
                <Link
                  href="/dashboard/active"
                  className="inline-block bg-accent text-accent-foreground font-bold py-3 px-8 rounded-lg text-lg hover:bg-opacity-90 transition-colors shadow-lg hover:shadow-xl"
                >
                  Launch App
                </Link>
              </div>
            </div>
            <div className="hidden md:flex justify-center items-center md:col-span-2">
              <div className="w-full max-w-md h-80 overflow-hidden rounded-xl shadow-2xl relative">
                <Image 
                  src="/hero_image.svg" 
                  alt="Pacts Hero Illustration" 
                  fill
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          {/* Card 1 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg">
            <div className="text-5xl mb-4">💡</div>
            <h3 className="text-2xl font-bold mb-2">Prize Pools & Grants</h3>
            <p className="text-muted-foreground mb-6">
              Easily fund hackathons, bounties, and community initiatives with multi-recipient payouts.
            </p>
          </div>
          {/* Card 2 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-2xl font-bold mb-2">Milestone-Based Contracts</h3>
            <p className="text-muted-foreground mb-6">
              Secure agreements that release funds incrementally as project milestones are achieved.
            </p>
          </div>
          {/* Card 3 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-2xl font-bold mb-2">Transparent & Trustless</h3>
            <p className="text-muted-foreground mb-6">
              All terms and payouts are on-chain, providing clarity and reducing disputes.
            </p>
          </div>
        </div>
      </section>

      {/* Horizontal Info Banner */}
      <section className="py-5 bg-background">
        <div className="container mx-auto px-6">
          <div className="bg-primary text-primary-foreground rounded-2xl p-12">
            <h2 className="text-4xl font-bold mb-12 text-center">Your Work, Secured. Your Payouts, Simplified.</h2>
            <div className="grid md:grid-cols-3 gap-12 text-left">
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">For Funders</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Easy setup & funding</li>
                  <li>› Track progress</li>
                  <li>› Efficient distribution</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">For Creators</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Clear terms & milestones</li>
                  <li>› Guaranteed payouts</li>
                  <li>› Focus on your craft</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">Core Technology</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Filecoin Storage (IPFS)</li>
                  <li>› FVM & EVM Compatible</li>
                  <li>› USDC Stablecoins</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Join the Future of Decentralized Work.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Create your first pact, explore active agreements, and experience a fairer way to manage payments.
          </p>
          <Link
            href="/dashboard/active"
            className="inline-block bg-accent text-accent-foreground font-bold py-4 px-10 rounded-lg text-xl hover:bg-opacity-90 transition-colors"
          >
            Explore All Pacts
          </Link>
        </div>
      </section>
    </main>
  );
}