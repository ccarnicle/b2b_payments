'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard/create",
      label: "Create A Pact",
      shortLabel: "Create",
      icon: "+"
    },
    {
      href: "/dashboard/active",
      label: "Active Pacts",
      shortLabel: "Active",
      icon: "⚡"
    },
    {
      href: "/dashboard/completed",
      label: "Completed Pacts",
      shortLabel: "Complete",
      icon: "✓"
    },
    {
      href: "/dashboard/invoices",
      label: "Invoices",
      shortLabel: "Invoices",
      icon: "📄"
    }
  ];

  return (
    <aside className="w-20 md:w-64 min-h-screen p-3 md:p-6 flex flex-col bg-secondary/20">
      <div className="mb-6 md:mb-8">
        <h2 className="text-sm md:text-lg font-semibold text-foreground mb-1 md:mb-2 hidden md:block">Dashboard</h2>
        <p className="text-xs md:text-sm text-muted-foreground hidden md:block">Manage your pacts and agreements</p>
      </div>
      
      <nav className="space-y-1 md:space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col md:flex-row items-center justify-center md:justify-start space-x-0 md:space-x-3 px-2 md:px-4 py-2 md:py-3 rounded-md text-xs md:text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-secondary/20 hover:text-primary'
                }
              `}
              title={item.label}
            >
              <span className="text-lg md:text-lg mb-1 md:mb-0">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
              <span className="block md:hidden text-xs text-center leading-tight">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-6 md:pt-8 hidden md:block">
        <div className="p-4 bg-background rounded-md border border-muted">
          <h3 className="text-sm font-medium text-foreground mb-1">Need Help?</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Check out our documentation for guides and examples.
          </p>
          <Link 
            href="/docs" 
            className="text-xs text-primary hover:text-accent font-medium"
          >
            View Documentation →
          </Link>
        </div>
      </div>
    </aside>
  );
}
