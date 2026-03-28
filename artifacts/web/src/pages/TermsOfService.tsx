import { Link } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Terms of Service</span>
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
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Please read these terms carefully before using The Trading Mentor.</p>
            </div>
          </div>

          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing or using The Trading Mentor platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. We reserve the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
              <p>
                The Trading Mentor is a subscription-based educational platform that provides AI-powered trading mentorship, educational content, trade planning tools, risk management utilities, journaling features, and analytics. The Service is designed for educational and decision-support purposes only and does not constitute financial advice, investment recommendations, or trading signals.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Account Registration</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>You must be at least 18 years old to create an account.</li>
                <li>You must provide accurate and complete registration information.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must notify us immediately of any unauthorized use of your account.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Subscription & Billing</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>The Service offers Free, Pro, and Elite subscription tiers with varying features and pricing.</li>
                <li>Paid subscriptions are billed on a recurring basis (monthly or annually) through Stripe.</li>
                <li>You authorize us to charge your selected payment method for the subscription fees.</li>
                <li>Subscription prices may change with prior notice; existing subscribers will be notified before any price increase takes effect.</li>
                <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Refund Policy</h2>
              <p>
                New subscribers may request a full refund within 7 days of their initial purchase. For complete details — including the 24-hour drawdown lock feature and subscription cancellation terms — please see our <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Acceptable Use</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
                <li>Share, resell, or redistribute your account access or any content from the Service.</li>
                <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service.</li>
                <li>Interfere with or disrupt the Service or its infrastructure.</li>
                <li>Upload or transmit malicious code, spam, or harmful content.</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Service — including text, graphics, logos, educational materials, AI-generated responses, and software — are owned by The Trading Mentor and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works from any content without our prior written consent.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">8. Educational Disclaimer</h2>
              <p>
                The Service provides educational content related to trading concepts, including Inner Circle Trader (ICT) methodologies. <strong className="text-foreground">Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy or sell any financial instrument.</strong> Trading involves substantial risk of loss and is not suitable for every investor. You are solely responsible for your own trading decisions and outcomes.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">9. AI-Generated Content</h2>
              <p>
                The Service uses artificial intelligence to provide mentorship, analysis, and educational responses. AI-generated content is provided for informational and educational purposes only. It may contain errors or inaccuracies, and should not be relied upon as the sole basis for any trading or investment decision.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, The Trading Mentor and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or trading losses, arising out of or related to your use of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">11. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will immediately cease.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising under these Terms shall be resolved through binding arbitration in accordance with applicable arbitration rules.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">13. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at <strong className="text-primary">support@ictmentor.com</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            <span>Last updated: March 2026</span>
            <div className="flex flex-wrap gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
              <Link to="/risk-disclosure" className="hover:text-foreground transition-colors">Risk Disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
