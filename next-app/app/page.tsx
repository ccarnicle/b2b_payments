import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-2">
        <div className="container mx-auto px-6">
          <div className="bg-primary text-primary-foreground rounded-2xl p-12 grid lg:grid-cols-5 gap-12 items-center">
            <div className="space-y-6 lg:col-span-3 text-center lg:text-left">
              <h1 className="text-3xl sm:text-5xl font-bold font-display tracking-tight leading-normal sm:leading-relaxed">
                Simplify Payments.
                <br />
                Unlock Collaboration.
              </h1>
              <ul className="space-y-3 text-base sm:text-lg">
                <li className="flex items-center justify-center lg:justify-start">
                  <span className="mr-3">✅</span>
                  Trustless payments for creators & next-gen science
                </li>
                <li className="flex items-center justify-center lg:justify-start">
                  <span className="mr-3">✅</span>
                  Verifiable agreements secured on Filecoin
                </li>
                <li className="flex items-center justify-center lg:justify-start">
                  <span className="mr-3">✅</span>
                  Lightning-fast Flow transactions, seamless login
                </li>
              </ul>
              <div className="text-center lg:text-left">
                <Link
                  href="/dashboard/active"
                  className="inline-block bg-accent text-accent-foreground font-bold py-3 px-8 rounded-lg text-base sm:text-lg hover:bg-opacity-90 transition-colors shadow-lg hover:shadow-xl"
                >
                  Launch Pact
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center lg:col-span-2">
              <div className="w-full max-w-md h-80 overflow-hidden rounded-xl shadow-2xl relative">
                <Image 
                  src="/hero_image.svg" 
                  alt="Pact Hero Illustration" // Changed alt text
                  fill
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 grid lg:grid-cols-3 gap-8 text-center items-stretch">
          {/* Card 1 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg flex flex-col">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-2xl font-bold mb-2">Prize Pools & Bounties</h3>
            <p className="text-muted-foreground mb-6 flex-grow flex items-center">
              Accelerate hackathons, open research bounties, and community initiatives with transparent, multi-recipient payouts.
            </p>
          </div>
          {/* Card 2 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg flex flex-col">
            <div className="text-5xl mb-4">🤝</div>
            <h3 className="text-2xl font-bold mb-2">Milestone-Based Agreements</h3>
            <p className="text-muted-foreground mb-6 flex-grow flex items-center">
              Securely fund any project or collaboration, from creative commissions to scientific grants, releasing funds incrementally.
            </p>
          </div>
          {/* Card 3 */}
          <div className="bg-card border border-muted p-8 rounded-xl shadow-lg flex flex-col">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-2xl font-bold mb-2">Verifiable & Enduring Trust</h3>
            <p className="text-muted-foreground mb-6 flex-grow flex items-center">
              All terms and payouts are on-chain, backed by Filecoin&#39;s verifiable storage for ultimate clarity and dispute resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Horizontal Info Banner */}
      <section className="py-5 bg-background">
        <div className="container mx-auto px-6">
          <div className="bg-primary text-primary-foreground rounded-2xl p-12">
            <h2 className="text-4xl font-bold mb-12 text-center">Your Work, Protected. Your Payments, Assured.</h2>
            <div className="grid md:grid-cols-3 gap-12 text-left">
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">For Businesses & Funders</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Easy, transparent fund setup</li>
                  <li>› Verifiable progress & deliverables</li>
                  <li>› Efficient, global payouts</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">For Creators & Innovators</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Clear, immutable terms & milestones</li>
                  <li>› Guaranteed payments – no more chasing!</li>
                  <li>› Focus on your craft, not the accounting</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-4 border-b-2 border-secondary pb-2">Core Technology</h4>
                <ul className="space-y-2 text-primary-foreground/80">
                  <li>› Filecoin Verifiable Storage</li>
                  <li>› Flow & FVM EVM Compatible</li>
                  <li>› USDFC Stablecoin</li>
                  <li>› Walletless Login (Privy)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Build the Future of Decentralized Work.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Experience a fairer, faster, and more secure way to manage payments for funders, creators and decentralized science.
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