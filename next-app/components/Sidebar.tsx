'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard/create",
      label: "Create Pact",
      icon: "+"
    },
    {
      href: "/dashboard/active",
      label: "Active Pacts",
      icon: "⚡"
    },
    {
      href: "/dashboard/completed",
      label: "Completed Pacts",
      icon: "✓"
    },
    {
      href: "/dashboard/invoices",
      label: "Invoices",
      icon: "📄"
    }
  ];

  return (
    <aside className="w-64 min-h-full p-6 flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Manage your pacts and agreements</p>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-foreground hover:bg-secondary/20 hover:text-primary'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-8">
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
