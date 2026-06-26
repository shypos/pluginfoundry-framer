import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/SupabaseAuthContext';
import { 
  Workflow, 
  ArrowRight, 
  Loader2, 
  Settings, 
  ShieldCheck, 
  ShieldAlert,
  Fingerprint
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Login() {
  const { login, signup, isRealSupabase } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = isSignUp 
        ? await signup(email)
        : await login(email);

      if (response.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(response.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Autofill developer credentials path
  const handleQuickBypass = async () => {
    setLoading(true);
    setErrorMessage(null);
    const demoEmail = 'studiolazin@gmail.com';
    setEmail(demoEmail);
    setPassword('developer_bypass');

    setTimeout(async () => {
      try {
        const response = await login(demoEmail);
        if (response.success) {
          navigate('/dashboard');
        } else {
          setErrorMessage(response.error);
        }
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden" id="auth-login-view">
      {/* Background Graphic elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-400">
        {/* Core Product Logo */}
        <div className="flex flex-col items-center text-center space-y-2 select-none">
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl flex items-center justify-center shadow-lg">
            <Workflow className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            PluginFoundry Platform
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            Configure multi-product SaaS components via centralized consoles.
          </p>
        </div>

        {/* Credentials Form Card */}
        <Card className="shadow-xl bg-background border-border/80">
          <CardHeader className="space-y-1 pb-5">
            <CardTitle className="text-md font-bold tracking-tight">
              {isSignUp ? 'Construct Platform Profile' : 'Authenticate Session'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isSignUp 
                ? 'Register unique developer credentials to start managing SaaS tables'
                : 'Input your contact addresses details to access active consoles'
              }
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 animate-shake">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Authorized Email</label>
                <Input
                  id="login-input-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted/15 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Developer Secret Code</label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={() => setErrorMessage('Local bypass code is automatically applied during developer preview.')}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Retrieve?
                    </button>
                  )}
                </div>
                <Input
                  id="login-input-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted/15 h-10 text-xs"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" disabled={loading} className="w-full h-10 text-xs font-semibold gap-1.5 shadow-md">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Construct Developer Account' : 'Authenticate Console'}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between w-full text-xs text-muted-foreground border-t border-muted/30 pt-4 mt-1">
                <span>
                  {isSignUp ? 'Exiting profile already?' : 'New console user?'}
                </span>
                <button
                  id="toggle-auth-mode-btn"
                  type="button"
                  disabled={loading}
                  onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(null); }}
                  className="text-primary font-bold hover:underline"
                >
                  {isSignUp ? 'Sign In' : 'Construct Account'}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Zero-friction Developer Bypass Panel */}
        <div className="bg-muted p-4 border border-border/80 rounded-2xl flex flex-col space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Fingerprint className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">Developer Playground</span>
            </div>
            <Badge variant="secondary" className="bg-primary/10 border-none text-primary hover:bg-primary/20 text-[9px] tracking-wide py-0.2">
              Autofill Live
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            By default, the profile is isolated to a LocalStorage-backed development sandbox. Bypass registration to load the preview dashboard immediately:
          </p>
          <Button 
            id="login-btn-quick-bypass" 
            variant="outline" 
            size="sm" 
            onClick={handleQuickBypass} 
            disabled={loading}
            className="w-full text-xs h-9 font-bold bg-background text-foreground hover:bg-muted border border-border/80 shadow-sm"
          >
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />}
            Bypass & Load Developer Console
          </Button>
        </div>
      </div>
    </div>
  );
}
