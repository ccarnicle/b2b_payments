export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-card">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-foreground/60">
        <p>© {year} Smart Vaults. A PL_Genesis Hackathon Project.</p>
      </div>
    </footer>
  );
}