import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Landmark,
  CreditCard,
  Bitcoin,
  DollarSign,
  Banknote,
} from "lucide-react";

const UK_LICENSES = [
  {
    id: "uk-pi",
    name: "Payment Institution License",
    authority: "FCA",
    description: "Authorisation to provide payment services in the UK under the Payment Services Regulations 2017.",
    icon: CreditCard,
  },
  {
    id: "uk-emi",
    name: "Electronic Money Institution License",
    authority: "FCA",
    description: "Authorisation to issue electronic money and provide payment services in the UK.",
    icon: Banknote,
  },
  {
    id: "uk-crypto",
    name: "Crypto Asset Registration",
    authority: "FCA",
    description: "Registration under the Money Laundering Regulations for crypto asset activities.",
    icon: Bitcoin,
  },
];

const US_LICENSES = [
  {
    id: "us-msb",
    name: "Money Services Business (MSB) Registration",
    authority: "FinCEN",
    description: "Federal registration as a Money Services Business with the Financial Crimes Enforcement Network.",
    icon: DollarSign,
  },
  {
    id: "us-mtl",
    name: "Money Transmitter License",
    authority: "State Regulators",
    description: "State-level licensing for money transmission activities across US states.",
    icon: Landmark,
  },
];

const SelectLicense = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigate(`/licensing-project/${clientId}/${selected}`);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link
          to={`/clients/${clientId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Client
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Select License Type</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the license you want to prepare. The platform will load the required form and regulatory requirements.
          </p>
        </div>

        {/* United Kingdom */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">United Kingdom</h2>
            <span className="text-xs text-muted-foreground font-mono ml-1">£ GBP</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {UK_LICENSES.map((lic) => {
              const Icon = lic.icon;
              const isSelected = selected === lic.id;
              return (
                <button
                  key={lic.id}
                  onClick={() => setSelected(lic.id)}
                  className={`text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{lic.authority}</span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{lic.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{lic.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* United States */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">United States</h2>
            <span className="text-xs text-muted-foreground font-mono ml-1">$ USD</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {US_LICENSES.map((lic) => {
              const Icon = lic.icon;
              const isSelected = selected === lic.id;
              return (
                <button
                  key={lic.id}
                  onClick={() => setSelected(lic.id)}
                  className={`text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{lic.authority}</span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{lic.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{lic.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleContinue} disabled={!selected} size="lg" className="gap-2">
            Continue to Application Form <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default SelectLicense;
