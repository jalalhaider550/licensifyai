import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="icon" className="h-7 w-7" />
            <span className="font-display font-bold">Licensify AI</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-slate dark:prose-invert">
        <h1 className="font-display text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 6 May 2026</p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">1. Acceptance</h2>
        <p className="text-muted-foreground">
          By accessing or using Licensify AI ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree, you must not use the Service.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">2. Professional Use Only</h2>
        <p className="text-muted-foreground">
          The Service is intended for qualified legal professionals and businesses conducting legitimate legal,
          compliance and licensing work. The output of the Service is a starting point for professional review,
          not a substitute for qualified legal advice.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">3. Acceptable Use</h2>
        <p className="text-muted-foreground">You agree not to use the Service to:</p>
        <ul className="text-muted-foreground list-disc pl-6 space-y-1">
          <li>Engage in unlawful, fraudulent, deceptive or harmful activity.</li>
          <li>Generate, store or distribute content that infringes intellectual property, privacy or confidentiality rights.</li>
          <li>Circumvent security, rate limits, billing, or access controls.</li>
          <li>Misrepresent AI-generated output as independent legal advice.</li>
          <li>Reverse engineer, scrape, resell or sublicense the Service.</li>
          <li>Upload malware, attempt unauthorised access, or interfere with other users.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">4. Account Suspension &amp; Termination</h2>
        <p className="text-muted-foreground">
          Licensify AI reserves the right, at its sole discretion and without prior notice, to suspend, restrict
          or permanently terminate your account and access to the Service if we determine, acting reasonably,
          that you have used the Service improperly, including but not limited to:
        </p>
        <ul className="text-muted-foreground list-disc pl-6 space-y-1">
          <li>Breach of these Terms or any acceptable use provision.</li>
          <li>Use of the Service for unlawful, fraudulent, abusive, harassing or harmful purposes.</li>
          <li>Sharing access credentials, reselling the Service, or systematic data extraction.</li>
          <li>Activity that creates legal, security, regulatory or reputational risk for Licensify AI or its users.</li>
          <li>Repeated misuse of AI features, automated scraping, or attempts to bypass usage limits.</li>
          <li>Non-payment of fees once a paid plan begins.</li>
        </ul>
        <p className="text-muted-foreground">
          Where appropriate and lawful, we will notify you of the reason. Termination may be immediate where
          continued access poses risk. Upon termination, your right to use the Service ceases immediately and
          we may delete or retain your data in accordance with our Privacy Policy and applicable law. Fees paid
          for the period during which improper use occurred are non-refundable.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">5. AI Output Disclaimer</h2>
        <p className="text-muted-foreground">
          AI-generated content may contain errors, omissions or out-of-date information. You are responsible for
          reviewing, verifying and adapting all output before relying on it. Licensify AI is not a law firm and
          does not provide legal advice.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">6. Limitation of Liability</h2>
        <p className="text-muted-foreground">
          To the maximum extent permitted by law, Licensify AI shall not be liable for any indirect, incidental,
          special, consequential or punitive damages arising from your use of, or inability to use, the Service.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">7. Changes</h2>
        <p className="text-muted-foreground">
          We may update these Terms from time to time. Material changes will be notified through the Service or
          via email. Continued use after changes constitutes acceptance.
        </p>

        <h2 className="font-display text-xl font-semibold mt-8 text-foreground">8. Contact</h2>
        <p className="text-muted-foreground">
          Questions about these Terms can be sent to <a href="mailto:support@licensifyai.com" className="text-primary">support@licensifyai.com</a>.
        </p>
      </article>
    </div>
  );
}
