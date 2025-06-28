export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-secondary">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-foreground/60">
        <p>© {year} Escrow Prize Pool. A v0.1 Hackathon Project.</p>
      </div>
    </footer>
  );
}