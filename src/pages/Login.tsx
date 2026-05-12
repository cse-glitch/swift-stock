import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, User, AlertCircle, Package, ShieldCheck, BarChart3, RefreshCcw } from 'lucide-react';
import { db } from '@/lib/db';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const features = [
  { icon: Package,     text: 'Multi-business inventory' },
  { icon: ShieldCheck, text: 'Role-based access control' },
  { icon: BarChart3,   text: 'Real-time analytics & reports' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setAuthError('');
    try {
      const result = await login(data.username, data.password);
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setAuthError(result.error ?? 'Login failed');
      }
    } catch (err) {
      setAuthError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-background">

      {/* ── Left panel — dark branding (hidden on sm, shown from md up) ── */}
      <div
        className="hidden md:flex md:w-[420px] lg:w-1/2 flex-col justify-between p-10 lg:p-14 relative overflow-hidden shrink-0"
        style={{ background: 'hsl(225, 25%, 10%)' }}
      >
        {/* Blueprint grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(147,174,255,0.06) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(147,174,255,0.06) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* Glow */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,120,255,0.18) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,120,255,0.10) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur border border-white/10">
            <img src="/logo.svg" alt="SAMAN" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <p className="text-base font-bold text-white tracking-tight leading-none">SAMAN</p>
            <p className="text-[11px] text-white/40 mt-0.5">Inventory Hub</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-white/50 font-medium tracking-wide">Offline-First · Secure · Multi-Tenant</span>
          </div>

          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-snug">
              Your inventory.<br />
              <span style={{ color: 'hsl(230, 65%, 65%)' }}>Under control.</span>
            </h1>
            <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-xs">
              Manage products, orders, and stock across multiple businesses — all stored locally, no internet needed.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,120,255,0.15)', border: '1px solid rgba(99,120,255,0.25)' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: 'hsl(230,65%,65%)' }} />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: 'Businesses', value: '7+' },
            { label: 'Audit Trail', value: '100%' },
            { label: 'Offline', value: 'Always' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-3"
              style={{ background: 'rgba(99,120,255,0.10)', border: '1px solid rgba(99,120,255,0.20)' }}
            >
              <p className="text-lg font-bold" style={{ color: 'hsl(230,65%,65%)' }}>{stat.value}</p>
              <p className="text-[11px] text-white/45 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo (shown when left panel is hidden) */}
          <div className="flex md:hidden items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <img src="/logo.svg" alt="SAMAN" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">SAMAN</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Inventory Hub</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your inventory dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  className="pl-9 h-11"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pl-9 pr-11 h-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.password.message}
                </p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full h-11 font-semibold text-sm mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
              <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                First time? Use default credentials:<br />
                <code className="font-mono font-semibold text-foreground">admin</code>
                {' / '}
                <code className="font-mono font-semibold text-foreground">admin123</code>
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (confirm('⚠️ WARNING: This will DELETE ALL DATA and reset the system. Continue?')) {
                  await db.delete();
                  window.location.reload();
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              <RefreshCcw className="h-3 w-3" />
              Emergency System Reset (Delete all data)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
