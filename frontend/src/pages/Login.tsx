import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useApp();
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & Loading
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  // Calculate Password Strength (8+ chars, letters & numbers)
  const calculatePasswordStrength = (pwd: string): { label: 'Weak' | 'Fair' | 'Strong'; score: number; color: string } => {
    if (!pwd) return { label: 'Weak', score: 0, color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd) && pwd.length >= 10) score += 1;

    if (score <= 1) return { label: 'Weak', score: 33, color: 'bg-rose-500' };
    if (score === 2) return { label: 'Fair', score: 66, color: 'bg-amber-500' };
    return { label: 'Strong', score: 100, color: 'bg-emerald-500' };
  };

  const strength = calculatePasswordStrength(password);

  const validateForm = (): boolean => {
    const errors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};
    setError(null);

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (isRegister) {
      if (!name.trim()) {
        errors.name = 'Please enter your full name.';
      }
    }

    if (!cleanEmail) {
      errors.email = 'Enter your email address.';
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Enter your password.';
    } else if (isRegister && password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (isRegister) {
      if (!confirmPassword) {
        errors.confirmPassword = 'Confirm your password.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
        setError('Passwords do not match.');
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    if (isRegister) {
      const result = await register(name, email, password);
      if (result.success) {
        navigate('/profiles');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        navigate('/profiles');
      } else {
        setError(result.error || 'Email or password is incorrect.');
      }
    }
    setLoading(false);
  };

  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    const result = await login('pavan@mindmitra.com', 'mindmitra123');
    if (result.success) {
      navigate('/profiles');
    } else {
      // Fallback demo account registration if needed
      const regResult = await register('Pavan Kumar', 'pavan@mindmitra.com', 'mindmitra123');
      if (regResult.success) {
        navigate('/profiles');
      } else {
        setError('Could not connect to backend server. Check your connection and try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-md mb-3 text-white hover:bg-blue-700 transition-all transform hover:scale-105">
            <Brain size={34} />
          </Link>
          <h1 className="text-3xl font-black text-black dark:text-white tracking-tight">MindMitra</h1>
          <p className="text-slate-900 dark:text-slate-300 mt-1 text-sm font-bold">
            Caregiver Portal & Cognitive Companion
          </p>
        </div>

        {/* Auth Container Card */}
        <div className="card p-6 sm:p-8 shadow-sm border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
          {/* Form Tabs */}
          <div className="flex border-b border-slate-300 dark:border-slate-800 pb-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setFieldErrors({});
              }}
              className={`flex-1 pb-2 text-center text-sm font-black transition-all ${
                !isRegister
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setFieldErrors({});
              }}
              className={`flex-1 pb-2 text-center text-sm font-black transition-all ${
                isRegister
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Register Caregiver
            </button>
          </div>

          {/* Global Alert Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Caregiver Name (Registration Only) */}
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-black text-black dark:text-slate-200 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3 text-slate-700 dark:text-slate-500" />
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. Sunita Sharma"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border ${
                      fieldErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                    } text-black dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-700 dark:text-slate-400 text-sm font-bold focus:outline-none focus:ring-2`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-black text-black dark:text-slate-200 mb-1">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3 text-slate-700 dark:text-slate-500" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="caregiver@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border ${
                    fieldErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } text-black dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-700 dark:text-slate-400 text-sm font-bold focus:outline-none focus:ring-2`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-bold mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-black text-black dark:text-slate-200 mb-1">
                Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3 text-slate-700 dark:text-slate-500" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border ${
                    fieldErrors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } text-black dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-700 dark:text-slate-400 text-sm font-bold focus:outline-none focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-700 hover:text-black dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-600 font-bold mt-1">{fieldErrors.password}</p>
              )}

              {/* Password Strength Indicator (Registration Only) */}
              {isRegister && password.length > 0 && (
                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
                    <span className={
                      strength.label === 'Strong' ? 'text-emerald-600 dark:text-emerald-400' :
                      strength.label === 'Fair' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    }>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Minimum 8 characters with letters and numbers recommended.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password (Registration Only) */}
            {isRegister && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border ${
                      fieldErrors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                    } text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-700 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="elderly-btn-primary w-full text-base py-3 rounded-xl mt-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{loading ? (isRegister ? 'Creating Account...' : 'Signing in...') : (isRegister ? 'Create Caregiver Account' : 'Sign In')}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Controlled Demo Access */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all"
            >
              <Sparkles size={15} className="text-amber-500" />
              <span>Try Demo</span>
            </button>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
