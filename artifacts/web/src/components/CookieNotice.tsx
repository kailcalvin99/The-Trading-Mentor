import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const COOKIE_KEY = "ict-cookie-notice-dismissed";

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(COOKIE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  function dismiss() {
    localStorage.setItem(COOKIE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex gap-3 items-start">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium">We use cookies</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This site uses essential cookies to keep you logged in and remember your preferences.{" "}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">
              Learn more
            </Link>
          </p>
          <button
            onClick={dismiss}
            className="mt-2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:brightness-110 transition-all font-medium"
          >
            Got it
          </button>
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss cookie notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
