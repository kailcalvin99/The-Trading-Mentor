import { Link } from "react-router-dom";
import { ArrowLeft, Lock, AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Privacy Policy</span>
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
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">How we collect, use, and protect your information.</p>
            </div>
          </div>

          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Information We Collect</h2>
              <p className="mb-2">We collect the following types of information when you use ICT Trading Mentor:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground">Account Information:</strong> Name, email address, and password when you create an account.</li>
                <li><strong className="text-foreground">Payment Information:</strong> Billing details processed securely through Stripe. We do not store your full credit card number on our servers.</li>
                <li><strong className="text-foreground">Usage Data:</strong> Information about how you interact with the Service, including pages visited, features used, and session duration.</li>
                <li><strong className="text-foreground">Trade Data:</strong> Trade entries, journal notes, and analytics data you voluntarily input into the platform.</li>
                <li><strong className="text-foreground">AI Interaction Data:</strong> Conversations and queries you submit to the AI mentor feature.</li>
                <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, device type, and IP address.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>To provide, maintain, and improve the Service.</li>
                <li>To process payments and manage your subscription.</li>
                <li>To personalize your experience and deliver relevant educational content.</li>
                <li>To power AI mentor responses and improve AI accuracy over time.</li>
                <li>To send service-related notifications, updates, and support communications.</li>
                <li>To detect, prevent, and address technical issues or fraudulent activity.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Data Sharing</h2>
              <p className="mb-2">We do not sell your personal information. We may share data with:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground">Payment Processors:</strong> Stripe processes your payment information under their own privacy policy.</li>
                <li><strong className="text-foreground">AI Service Providers:</strong> Anonymized or pseudonymized interaction data may be shared with AI providers to deliver mentorship features.</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose information if required by law, regulation, or legal process.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Cookies & Tracking</h2>
              <p>
                We use essential cookies to maintain your session and authentication status. We may also use analytics cookies to understand how users interact with the Service. You can control cookie settings through your browser preferences, though disabling essential cookies may affect your ability to use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information, including encryption in transit (TLS/SSL), secure password hashing, and access controls. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Data Retention</h2>
              <p>
                We retain your account and trade data for as long as your account is active or as needed to provide the Service. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
              <p className="mb-2">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                <li><strong className="text-foreground">Portability:</strong> Request a copy of your data in a portable format.</li>
                <li><strong className="text-foreground">Opt-Out:</strong> Opt out of marketing communications at any time.</li>
                <li><strong className="text-foreground">Restriction:</strong> Request that we limit how we use your data.</li>
              </ul>
              <p className="mt-2">
                To exercise any of these rights, contact us at <strong className="text-primary">support@ictmentor.com</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">8. California Privacy Rights (CCPA)</h2>
              <p>
                If you are a California resident, you have the right to know what personal information we collect, request deletion of your data, and opt out of any sale of personal information. We do not sell personal information. To make a request, contact us at <strong className="text-primary">support@ictmentor.com</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">9. European Privacy Rights (GDPR)</h2>
              <p>
                If you are located in the European Economic Area (EEA), we process your data based on legitimate interests, contractual necessity, and your consent. You have additional rights under GDPR, including the right to lodge a complaint with your local data protection authority. Our legal basis for processing your data includes performance of our contract with you and our legitimate interest in improving the Service.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">10. Children's Privacy</h2>
              <p>
                The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete that information promptly.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the Service or sending you an email. Your continued use of the Service after changes take effect constitutes your acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">12. Contact Us</h2>
              <p>
                If you have questions or concerns about this Privacy Policy, please contact us at <strong className="text-primary">support@ictmentor.com</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            <span>Last updated: March 2026</span>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
              <Link to="/risk-disclosure" className="hover:text-foreground transition-colors">Risk Disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
