
import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    // Demo only: real authentication is not connected yet.
    onLogin();
  }

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand">
          <div className="login-logo">V</div>
          <span>VoiceReady AI</span>
        </div>

        <div className="login-brand-content">
          <span className="login-tag">YOUR CAREER STARTS HERE</span>

          <h1>
            Speak with confidence.
            <br />
            <span>Get interview ready.</span>
          </h1>

          <p>
            Practice interviews, improve your answers, and build
            the confidence to take your next career step.
          </p>

          <div className="login-benefits">
            <div>✓ AI-powered mock interviews</div>
            <div>✓ Personalized feedback</div>
            <div>✓ Practice at your own pace</div>
          </div>
        </div>

        <p className="login-brand-footer">
          Practice today. Perform with confidence tomorrow.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <div className="login-logo">V</div>
            <span>VoiceReady AI</span>
          </div>

          <span className="login-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="login-welcome">
            Continue your journey towards interview success.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="login-submit" type="submit">
              Sign in <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span>YOUR PERSONAL INTERVIEW COACH</span>
          </div>

          <p className="login-demo-note">
            Demo mode: any non-empty email and password will continue.
            Account verification is not connected yet.
          </p>
        </div>

        <p className="login-terms">
          © 2026 VoiceReady AI
        </p>
      </section>
    </main>
  );
}

export default Login;
