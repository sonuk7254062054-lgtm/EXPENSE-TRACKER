import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FormField } from "../components/FormField.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>Expense<span className="brand-light">Tracker</span></span>
        </Link>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to see your financial overview." footer={<>New here? <Link to="/register">Create an account</Link></>}>
      <form className="auth-form" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <FormField id="login-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField id="login-password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ email: email.trim(), password });
      setSuccess(true);
    } catch (registerError) {
      setError(registerError.message || "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <AuthCard title="Account created" subtitle="Your account is ready. Sign in to continue." footer={<Link to="/login">Go to sign in</Link>}>
        <button className="button button-primary button-wide" onClick={() => navigate("/login")}>Continue to sign in</button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="A clearer view of your money starts here." footer={<>Already have an account? <Link to="/login">Sign in</Link></>}>
      <form className="auth-form" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <FormField id="register-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField id="register-password" label="Password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <p className="field-hint">Use at least 12 characters.</p>
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
    </AuthCard>
  );
}
