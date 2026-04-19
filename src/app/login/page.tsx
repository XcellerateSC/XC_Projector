import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand-logo";
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
        <BrandLockup className="auth-brand" priority size="md" />

        <div className="auth-copy">
          <span className="eyebrow">Secure sign-in</span>
          <h1>Access planning, staffing and reporting in one workspace.</h1>
          <p>
            Sign in to access project planning, transparent staffing, weekly
            time capture and portfolio reporting in one connected application.
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
