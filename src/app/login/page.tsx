import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ error }, supabase] = await Promise.all([
    searchParams,
    createSupabaseServerClient()
  ]);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card panel">
        <div className="auth-copy">
          <span className="eyebrow">Secure sign-in</span>
          <h1>Step into the planning cockpit.</h1>
          <p>
            Sign in with your Supabase account to access staffing, time
            tracking and portfolio reporting.
          </p>
        </div>

        <form action={login} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="name@company.com"
              required
              type="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              placeholder="Your password"
              required
              type="password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="cta cta-primary auth-submit" type="submit">
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          <span>Need the product context first?</span>
          <Link href="/">Back to overview</Link>
        </div>
      </section>
    </main>
  );
}
