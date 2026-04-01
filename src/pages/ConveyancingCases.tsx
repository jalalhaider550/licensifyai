import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Home, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const STEP_LABELS: Record<string, string> = {
  client_intake: "Client Intake",
  contract_pack: "Contract Pack",
  searches: "Searches",
  enquiries: "Enquiries",
  mortgage: "Mortgage",
  report: "Report",
  exchange: "Exchange",
  completion: "Completion",
  post_completion: "Post-Completion",
};

interface ConveyancingCase {
  id: string;
  property_address: string;
  client_type: string;
  client_name: string;
  transaction_type: string;
  price: number;
  current_step: string;
  status: string;
  readiness_score: number;
  created_at: string;
  client_id: string | null;
}

export default function ConveyancingCases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<ConveyancingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stepFilter, setStepFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchCases = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("conveyancing_cases" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Error loading cases", description: error.message, variant: "destructive" });
      } else {
        setCases((data as any[]) || []);
      }
      setLoading(false);
    };
    fetchCases();
  }, [user]);

  const filtered = cases.filter((c) => {
    if (search && !c.property_address.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && c.client_type !== typeFilter) return false;
    if (stepFilter !== "all" && c.current_step !== stepFilter) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conveyancing</h1>
            <p className="text-sm text-muted-foreground mt-1">Property transaction cases</p>
          </div>
          <Button onClick={() => navigate("/conveyancing/new")} className="gap-2">
            <Plus className="h-4 w-4" /> Start Conveyancing Case
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by address…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Client Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stepFilter} onValueChange={setStepFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(STEP_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Case list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Home className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No conveyancing cases yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start your first property transaction case</p>
              <Button onClick={() => navigate("/conveyancing/new")} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Start Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(`/conveyancing/${c.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{c.property_address}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">{c.client_type}</Badge>
                      <Badge variant="secondary">{STEP_LABELS[c.current_step] || c.current_step}</Badge>
                      {c.price > 0 && (
                        <span className="text-xs text-muted-foreground">£{c.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
