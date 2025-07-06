export default function InvoicesPage() {
  return (
    <>
      <div className="text-center my-8">
        <h1 className="text-4xl font-bold font-display">Direct Onchain Invoicing</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Send professional invoices with built-in escrow and payment processing.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-background rounded-lg border border-muted p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📄</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Coming Soon!</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Direct onchain invoicing is currently in development. This feature will allow you to:
            </p>
          </div>

          <div className="space-y-4 text-left mb-8">
            <div className="flex items-start space-x-3">
              <span className="text-accent mt-1">✓</span>
              <p className="text-foreground">Generate professional invoices with payment terms</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-accent mt-1">✓</span>
              <p className="text-foreground">Automatic escrow for invoice payments</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-accent mt-1">✓</span>
              <p className="text-foreground">Smart contract-based dispute resolution</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-accent mt-1">✓</span>
              <p className="text-foreground">Multi-token payment support</p>
            </div>
          </div>

          <div className="bg-card border border-muted rounded-md p-4">
            <p className="text-sm text-muted-foreground">
              Want to be notified when invoicing goes live? 
              <span className="text-primary font-medium"> Follow our progress on GitHub!</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 