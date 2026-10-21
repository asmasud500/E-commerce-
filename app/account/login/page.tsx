"use client";

import { useState } from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customer/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Unable to " + (mode === "login" ? "log in" : "create your account") + ". Please check your details and try again."
        );
        return;
      }
      window.location.assign("/account");
    } catch {
      setError("Could not connect to the store. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode() {
    setMode((current) => current === "login" ? "register" : "login");
    setError("");
    setShowPassword(false);
  }

  return (
    <>
      <StoreHeader />
      <main className="pg mart-auth-page">
        <div className="mart-auth-shell">
          <aside className="mart-auth-story" aria-label="MART shopping benefits">
            <Link href="/" className="mart-auth-brand" aria-label="MART home">
              <span className="mart-auth-brand-mark" aria-hidden="true">M</span>
              <span>MART<span className="mart-auth-brand-dot">.</span></span>
            </Link>
            <div className="mart-auth-story-copy">
              <span className="mart-auth-eyebrow">YOUR EVERYDAY MARKETPLACE</span>
              <h1>Good finds.<br /><span>Great prices.</span></h1>
              <p>Everything you love, in one place. Sign in and make your next shopping experience effortless.</p>
            </div>
            <div className="mart-auth-benefits">
              <div className="mart-auth-benefit"><span aria-hidden="true">✓</span><div><strong>Shopping made simple</strong><small>Discover products picked for you</small></div></div>
              <div className="mart-auth-benefit"><span aria-hidden="true">↗</span><div><strong>Orders, all in one place</strong><small>Track purchases and delivery updates</small></div></div>
              <div className="mart-auth-benefit"><span aria-hidden="true">♡</span><div><strong>Your account, your way</strong><small>Keep your shopping details together</small></div></div>
            </div>
            <div className="mart-auth-decoration mart-auth-decoration-one" aria-hidden="true" />
            <div className="mart-auth-decoration mart-auth-decoration-two" aria-hidden="true" />
            <p className="mart-auth-story-foot">SHOP SMARTER, LIVE BETTER.</p>
          </aside>

          <section className="mart-auth-panel" aria-labelledby="auth-title">
            <div className="mart-auth-mobile-brand">
              <span className="mart-auth-brand-mark" aria-hidden="true">M</span>
              <strong>MART<span className="mart-auth-brand-dot">.</span></strong>
            </div>
            <div className="mart-auth-heading">
              <span className="mart-auth-heading-icon" aria-hidden="true">{mode === "login" ? "↗" : "＋"}</span>
              <p className="mart-auth-kicker">{mode === "login" ? "WELCOME BACK" : "JOIN THE MART COMMUNITY"}</p>
              <h2 id="auth-title">{mode === "login" ? "Sign in to MART" : "Create your account"}</h2>
              <p>{mode === "login" ? "Your next great find is just around the corner." : "A few details and you’re ready to start shopping."}</p>
            </div>

            <form className="mart-auth-form" onSubmit={submit}>
              {mode === "register" && (
                <label className="mart-auth-field">
                  <span>Full name</span>
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
              )}
              <label className="mart-auth-field">
                <span>Email address</span>
                <input
                  autoComplete="email"
                  required
                  type="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="mart-auth-field">
                <span>Password</span>
                <span className="mart-auth-password-wrap">
                  <input
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    maxLength={128}
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    className="mart-auth-show-password"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
                {mode === "register" && <small className="mart-auth-field-hint">Use at least 8 characters for your password.</small>}
              </label>

              {error && <p className="mart-auth-error" role="alert" aria-live="polite">{error}</p>}

              <button className="mart-auth-submit" type="submit" disabled={busy}>
                <span>{busy ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}</span>
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="mart-auth-switch">
              <span>{mode === "login" ? "New to MART?" : "Already have an account?"}</span>
              <button type="button" disabled={busy} onClick={changeMode}>
                {mode === "login" ? "Create an account" : "Sign in instead"}
              </button>
            </div>

            <div className="mart-auth-secure"><span aria-hidden="true">▣</span><span>Your account details are handled securely.</span></div>
            <Link className="mart-auth-back" href="/products"><span aria-hidden="true">←</span> Continue shopping</Link>
          </section>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
