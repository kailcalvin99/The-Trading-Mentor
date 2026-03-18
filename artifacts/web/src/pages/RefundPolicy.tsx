import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Refund Policy</span>
        </div>

        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-600 dark:text-amber-400 mb-6">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="font-semibold">
            Trading involves significant risk of loss and is not suitable for all investors. This tool is for educational and decision-support purposes only — not financial advice.
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">7-Day Money-Back Guarantee</h1>
              <p className="text-sm text-muted-foreground">We want you to feel confident about your subscription.</p>
            </div>
          </div>

          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Eligibility</h2>
              <p>
                If you are a new subscriber and are not satisfied with your plan, you may request a full refund within
                <strong className="text-foreground"> 7 days</strong> of your initial purchase date. This applies to both monthly and annual subscriptions.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Subscription Cancellation</h2>
              <p>
                You may cancel your subscription at any time from your account settings or by contacting support. When you cancel, your subscription remains active until the end of the current billing period. You will not be charged again after cancellation, and no prorated refunds are issued for unused days in a billing period beyond the 7-day guarantee window.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">24-Hour Drawdown Lock</h2>
              <p>
                ICT Trading Mentor includes a Risk Shield feature that automatically locks your account from trading for 24 hours when your daily loss limit is reached. This lock is a safety feature — not a service outage — and does not affect your access to educational content, the AI mentor, the academy, or the journal during the lock period. Activation of the 24-hour drawdown lock does not constitute grounds for a refund, as the Service continues to function as intended.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">How to Request a Refund</h2>
              <p>
                To request a refund, email us at <strong className="text-primary">support@ictmentor.com</strong> with your
                account email and a brief reason for the request. We aim to process all refund requests within 3–5 business days.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">What Happens After a Refund</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Your subscription will be canceled immediately.</li>
                <li>Your account will revert to the Free plan.</li>
                <li>You will retain access to Free-tier features.</li>
                <li>The refund will be credited to your original payment method.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Exclusions</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Refund requests made after the 7-day window are not eligible.</li>
                <li>Subsequent billing cycles (renewals) are not eligible for refund — you may cancel at any time to prevent future charges.</li>
                <li>Accounts terminated for violating our Terms of Service are not eligible.</li>
                <li>The 24-hour drawdown lock does not qualify as a service disruption for refund purposes.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">Questions?</h2>
              <p>
                If you have questions about this policy, reach out to <strong className="text-primary">support@ictmentor.com</strong> and
                we will be happy to assist.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            <span>Last updated: March 2026</span>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/risk-disclosure" className="hover:text-foreground transition-colors">Risk Disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
