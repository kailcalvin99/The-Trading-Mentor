import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Logo from "@/components/Logo";

export default function RiskDisclosure() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Risk Disclosure</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Risk Disclosure Statement</h1>
              <p className="text-sm text-muted-foreground">Last updated: January 1, 2025</p>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm font-semibold text-amber-500">
              Trading financial instruments carries a high level of risk. Please read this disclosure carefully before using our platform.
            </p>
          </div>

          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Educational Purpose Only</h2>
              <p>
                ICT Trading Mentor is an educational platform designed to teach trading concepts and methodologies. All content, tools, AI coaching, analysis, and materials provided on this platform are for <strong>educational and informational purposes only</strong>. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other type of professional advice.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">2. No Financial Advice</h2>
              <p>
                ICT Trading Mentor is not a registered investment advisor, broker-dealer, or financial institution. Our AI mentor, coaching tools, and educational content do not constitute personalized financial or investment advice. You should always consult with a qualified financial professional before making any trading or investment decisions.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Trading Risk Warning</h2>
              <p className="mb-2">Trading in financial markets — including stocks, futures, forex, and other instruments — involves substantial risk of loss and is not appropriate for every investor. You should be aware that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You can lose some or all of your invested capital</li>
                <li>Leveraged trading can amplify both gains and losses</li>
                <li>Past performance of any trading strategy or system is not indicative of future results</li>
                <li>Market conditions can change rapidly and unpredictably</li>
                <li>Even professional traders experience significant losses</li>
                <li>There is no trading system or methodology that guarantees profits</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">4. ICT Methodology Disclaimer</h2>
              <p>
                The ICT (Inner Circle Trader) methodology and concepts taught on this platform are educational frameworks for analyzing markets. Learning and practicing these concepts does not guarantee trading success. Results will vary significantly among individual traders based on skill, psychology, market conditions, capital size, and many other factors.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Hypothetical Performance Results</h2>
              <p>
                Any trade examples, simulations, demo accounts, or hypothetical results shown on this platform have inherent limitations. Hypothetical trading does not involve actual financial risk and cannot fully replicate the psychological and emotional factors present in live trading. These results may not reflect what you would actually achieve in a live trading account.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">6. AI Coach Limitations</h2>
              <p>
                Our AI-powered trading coach provides general educational guidance based on ICT methodology. The AI does not have access to real-time market data, cannot predict future price movements, and its feedback is not a substitute for professional financial advice. Always verify AI-generated insights independently before acting on them.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Proprietary Trading Challenge Disclaimer</h2>
              <p>
                Any proprietary trading challenge tracking features on this platform are for educational and self-tracking purposes only. ICT Trading Mentor does not operate as a proprietary trading firm and does not provide or guarantee access to third-party funding programs.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">8. Your Responsibility</h2>
              <p>
                By using this platform, you acknowledge that you are solely responsible for your own trading decisions. You agree to trade only with capital you can afford to lose and to conduct your own due diligence before executing any trade. ICT Trading Mentor shall not be liable for any trading losses incurred as a result of using our educational tools or acting on information from our platform.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">9. Regulatory Notice</h2>
              <p>
                ICT Trading Mentor operates solely as an educational technology company and does not hold any financial licenses or regulatory approvals to provide investment advice. Always ensure that any broker or financial service you use is properly regulated in your jurisdiction.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-2">10. Contact Us</h2>
              <p>
                If you have any questions about this Risk Disclosure, please contact us at{" "}
                <a href="mailto:support@ictmentor.com" className="text-primary hover:underline">
                  support@ictmentor.com
                </a>.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
