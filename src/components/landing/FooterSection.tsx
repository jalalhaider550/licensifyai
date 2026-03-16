import { Shield } from "lucide-react";

export const FooterSection = () => {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">
              Licensify AI
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Licensify AI. All rights reserved. Regulatory automation for legal professionals.
          </p>
        </div>
      </div>
    </footer>
  );
};
