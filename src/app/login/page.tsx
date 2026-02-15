"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { setAuthCookie } from "@/lib/auth";
import { clearAuthState, loadAuthState, saveAuthState } from "@/lib/storage";
import ThemeToggle from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const initialAuth = loadAuthState();
  const [email, setEmail] = useState(initialAuth?.email ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(initialAuth?.rememberMe ?? false);
  const [error, setError] = useState("");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      setError("Invalid email or password.");
      return;
    }

    if (rememberMe) {
      saveAuthState({ email: DEMO_CREDENTIALS.email, rememberMe: true });
    } else {
      clearAuthState();
    }

    setAuthCookie(rememberMe);
    router.replace("/board");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 md:px-6">
      <section className="surface rise-in grid w-full overflow-hidden md:grid-cols-[1.15fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(165deg,#239ea2,#5f74ff)] p-10 text-white md:flex">
          <div className="absolute -right-14 top-8 h-52 w-52 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/15 blur-xl" />

          <div className="relative z-10">
            <p className="mb-3 inline-flex rounded-full border border-white/60 px-3 py-1 text-xs tracking-wide">TASK OS</p>
            <h1 className="text-4xl font-semibold leading-tight">Coordinate work without losing context.</h1>
            <p className="mt-4 max-w-sm text-white/90">
              Manage priorities, due dates, and transitions from one board built for clarity.
            </p>
          </div>

          <div className="relative z-10 text-sm text-white/90">Frontend Internship Assignment</div>
        </div>

        <div className="bg-[var(--panel)] p-6 md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Continue to your workspace.</p>
            </div>
            <ThemeToggle />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 outline-none transition focus:border-[var(--brand)]"
                placeholder="you@company.com"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 outline-none transition focus:border-[var(--brand)]"
                placeholder="Enter password"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember me
            </label>

            {error && <p className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Continue
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
