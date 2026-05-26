import { Lock } from "lucide-react";

interface LockedFeatureProps {
  title?: string;
}

export const LockedFeature = ({ title }: LockedFeatureProps) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-10 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        {title && (
          <h2 className="mt-5 font-display text-lg font-semibold text-foreground">{title}</h2>
        )}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Upgrade your plan to unlock this feature. Contact us at{" "}
          <span className="font-medium text-foreground">licensifyai@gmail.com</span>
        </p>
      </div>
    </div>
  );
};
