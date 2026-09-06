import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, requestPasswordReset, resetPassword, fetchPublicConfig } from '../api/authService';

// Live checklist rows for the new-password field — each rule reports exactly
// which criterion is unmet.
const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'letter', label: 'Contains at least one letter', test: (value) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'Contains at least one number', test: (value) => /[0-9]/.test(value) },
];

function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [issuedResetToken, setIssuedResetToken] = useState('');
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    fetchPublicConfig()
      .then((config) => {
        if (!isCancelled) setNotificationsOn(Boolean(config.notificationsEnabled));
      })
      .catch(() => {
        // If the config call fails, fall back to on-screen codes (local demo default).
        if (!isCancelled) setNotificationsOn(false);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const switchView = (nextView) => {
    setView(nextView);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(email, password);
      navigate(data.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await requestPasswordReset(email.trim());
      setNotice(
        data.message ||
          (notificationsOn
            ? 'If an account exists for this email, a reset code has been emailed.'
            : 'If an account exists for this email, a reset code has been generated.')
      );
      if (data.resetToken) {
        // Notifications disabled locally: no delivery channel, so the code is
        // returned and shown on screen instead.
        setIssuedResetToken(data.resetToken);
        setResetToken(data.resetToken);
      } else {
        setIssuedResetToken('');
        setResetToken('');
      }
      setView('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to process the request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unmetPasswordRules = PASSWORD_RULES.filter((rule) => !rule.test(newPassword));
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (unmetPasswordRules.length > 0) {
      setError(`Password does not meet: ${unmetPasswordRules.map((rule) => rule.label).join('; ')}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await resetPassword({ email: email.trim(), token: resetToken.trim(), newPassword });
      setNotice(data.message || 'Password reset successfully. You can now log in.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setIssuedResetToken('');
      setView('login');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset the password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-6 sm:p-8 md:p-10">
        <Link to="/" className="brand-mark text-xl font-bold mb-10 no-underline">
          DoctorDayPlan
        </Link>

        {view === 'login' && (
          <>
            <p className="eyebrow mb-2">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sign in to your care space</h1>
            <p className="text-sm text-gray-500 mb-7">Your appointments, records, and care team in one calm place.</p>
            {notice && <p className="text-sm text-green-700 mb-3">{notice}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="primary-action w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Logging in...' : 'Log In'}
              </button>
            </form>
            <p className="text-sm text-gray-600 mt-4 text-center">
              <button type="button" onClick={() => switchView('forgot')} className="text-blue-600 font-medium hover:underline">
                Forgot password?
              </button>
            </p>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-blue-600 font-medium hover:underline">
                Register
              </Link>
            </p>
          </>
        )}

        {view === 'forgot' && (
          <>
            <p className="eyebrow mb-2">Account recovery</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Forgot your password?</h1>
            <p className="text-sm text-gray-500 mb-7">Enter your account email and we will issue a reset code.</p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  required
                  placeholder="e.g. you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="primary-action w-full disabled:opacity-50">
                {isSubmitting ? 'Sending...' : 'Send reset code'}
              </button>
            </form>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Remembered it?{' '}
              <button type="button" onClick={() => switchView('login')} className="text-blue-600 font-medium hover:underline">
                Back to login
              </button>
            </p>
          </>
        )}

        {view === 'reset' && (
          <>
            <p className="eyebrow mb-2">Account recovery</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose a new password</h1>
            {notice && <p className="text-sm text-green-700 mb-3">{notice}</p>}
            {notificationsOn ? (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                Your reset code was sent by email — check your inbox.
              </p>
            ) : (
              issuedResetToken && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4 break-all">
                  Demo mode (notifications disabled): your reset code is{' '}
                  <span className="font-mono font-semibold">{issuedResetToken}</span>
                </p>
              )
            )}
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label htmlFor="resetToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Reset code
                </label>
                <input
                  id="resetToken"
                  type="text"
                  required
                  placeholder="Paste the reset code you received"
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 chars, with a letter and a number"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1" aria-live="polite">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(newPassword);
                      return (
                        <li key={rule.id} className={`text-xs ${met ? 'text-green-700' : 'text-red-600'}`}>
                          {met ? '✓' : '✗'} {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {confirmPassword.length > 0 && (
                  <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-700' : 'text-red-600'}`} aria-live="polite">
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="primary-action w-full disabled:opacity-50">
                {isSubmitting ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
            <p className="text-sm text-gray-600 mt-4 text-center">
              <button type="button" onClick={() => switchView('login')} className="text-blue-600 font-medium hover:underline">
                Back to login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
