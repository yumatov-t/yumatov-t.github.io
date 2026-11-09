import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Language, ThemeMode, UserAccount } from '../types/discipline';
import { translations, TranslationKeys } from '../i18n/translations';
import { validateAuthForm } from '../utils/disciplineEngine';
import {
  auth,
  googleProvider,
  registerFirebaseAccount,
  resetFirebaseAccountPassword,
  signInFirebaseAccount,
  signInWithPopup,
  syncUserProfileToCloud,
} from '../services/firebaseClient';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'reset';
  language: Language;
  theme?: ThemeMode;
  onClose: () => void;
  onAuthenticated: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  language,
  theme = 'dark',
  onClose,
  onAuthenticated,
}) => {
  const t = translations[language];
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setResetSuccess(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const translateError = (key: string): string => {
    if (key in t) {
      return t[key as TranslationKeys];
    }
    return key;
  };

  const formatFirebaseAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/email-already-in-use')) {
      return t.errorAuthEmailExists;
    }
    if (
      raw.includes('auth/invalid-credential') ||
      raw.includes('auth/wrong-password') ||
      raw.includes('auth/user-not-found') ||
      raw.includes('auth/invalid-email')
    ) {
      return t.errorAuthInvalidCredentials;
    }
    if (raw.includes('auth/weak-password')) {
      return t.errorPasswordTooShort;
    }
    if (raw.includes('auth/unauthorized-domain')) {
      return language === 'ru'
        ? 'Для входа через Google на этом домене добавьте yumatov-t.github.io в Firebase Console → Authentication → Settings → Authorized domains, либо используйте регистрацию по Email и паролю выше.'
        : 'To use Google Sign-In on this domain, add yumatov-t.github.io in Firebase Console → Authentication → Settings → Authorized domains, or register with Email & Password above.';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return language === 'ru'
        ? 'Окно авторизации было закрыто.'
        : 'Sign-in popup was closed.';
    }
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSuccess(false);

    const validationError = validateAuthForm({
      mode,
      email,
      password: mode === 'reset' ? undefined : password,
      displayName,
    });

    if (validationError) {
      setErrorMsg(translateError(validationError));
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const account = await registerFirebaseAccount({
          email,
          password,
          displayName,
          theme,
          language,
        });
        onAuthenticated(account);
        onClose();
        return;
      }

      if (mode === 'login') {
        const account = await signInFirebaseAccount({
          email,
          password,
        });
        await syncUserProfileToCloud({
          uid: account.uid,
          displayName: account.displayName,
          email: account.email,
          theme,
          language,
        });
        onAuthenticated(account);
        onClose();
        return;
      }

      if (mode === 'reset') {
        await resetFirebaseAccountPassword(email);
        setResetSuccess(true);
        setMode('login');
      }
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const account: UserAccount = {
        uid: fbUser.uid,
        email: fbUser.email || 'user@discipline.app',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        authProvider: 'firebase',
        emailVerified: fbUser.emailVerified,
        createdAt: new Date().toISOString(),
      };
      await syncUserProfileToCloud({
        uid: account.uid,
        displayName: account.displayName,
        email: account.email,
        theme,
        language,
      });
      onAuthenticated(account);
      onClose();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    mode === 'login'
      ? t.authModalSignInTitle
      : mode === 'register'
      ? t.authModalRegisterTitle
      : t.authModalResetTitle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)]">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <h2 id="auth-modal-title" className="font-display text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {resetSuccess && (
            <div className="p-3 text-xs border border-[var(--success)] text-[var(--success)] bg-[var(--surface-secondary)]">
              {language === 'ru'
                ? 'Письмо для сброса пароля отправлено на указанный email.'
                : 'Password reset link has been sent to your email.'}
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 text-xs border border-[var(--danger)] text-[var(--danger)] bg-[var(--surface-secondary)] leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                {t.authFieldName}
              </label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.authFieldNamePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
            >
              {t.authFieldEmail}
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.authFieldEmailPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                {t.authFieldPassword}
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {isSubmitting
              ? '...'
              : mode === 'login'
              ? t.authSubmitSignIn
              : mode === 'register'
              ? t.authSubmitRegister
              : t.authSubmitReset}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-xs font-medium border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {t.authGoogleBtn}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('register');
                }}
                className="hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                {t.authSwitchToRegister}
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('reset');
                }}
                className="hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                {t.authForgotPassword}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('login');
              }}
              className="hover:text-[var(--text-primary)] underline cursor-pointer"
            >
              {t.authSwitchToSignIn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
