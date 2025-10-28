import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        toast.success("Úspešne prihlásený!");

        // Defer any Supabase calls to avoid deadlocks
        setTimeout(() => {
          supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data: profile }) => {
              if (!profile) {
                navigate("/onboarding");
              } else {
                navigate("/dashboard");
              }
            });
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Cleanup
    return () => subscription.unsubscribe();
  }, [navigate]);

  const validatePassword = (pwd: string): string => {
    if (pwd.length < 8) {
      return "Heslo musí mať minimálne 8 znakov";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Heslo musí obsahovať aspoň jedno veľké písmeno";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Heslo musí obsahovať aspoň jedno malé písmeno";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Heslo musí obsahovať aspoň jedno číslo";
    }
    return "";
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setPasswordError("");
    setConfirmPasswordError("");

    // Validate password
    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Heslá sa nezhodujú");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        // Handle specific weak password errors from Supabase
        if (
          error.message.toLowerCase().includes("password") &&
          (error.message.toLowerCase().includes("weak") ||
            error.message.toLowerCase().includes("common") ||
            error.message.toLowerCase().includes("easy to guess"))
        ) {
          setPasswordError(
            "Heslo je príliš slabé. Použite kombináciu veľkých a malých písmen, čísiel a špeciálnych znakov.",
          );
          return;
        }
        if (import.meta.env.DEV) {
          console.error("Sign up error:", error);
        }
        toast.error("Nepodarilo sa vytvoriť účet. Skúste to prosím znova.");
      } else if (data.user) {
        toast.success("Účet vytvorený! Môžete sa prihlásiť.");
        navigate("/onboarding");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Sign up error:", error);
      }
      toast.error("Nepodarilo sa vytvoriť účet. Skúste to prosím znova.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Google sign in error:", error);
        }
        toast.error("Nepodarilo sa prihlásiť cez Google. Skúste to prosím znova.");
      }
      // onAuthStateChange listener will handle the redirect after successful sign in
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Google sign in error:", error);
      }
      toast.error("Nepodarilo sa prihlásiť cez Google. Skúste to prosím znova.");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Sign in error:", error);
        }
        toast.error("Nepodarilo sa prihlásiť. Skontrolujte svoje prihlasovacie údaje.");
      } else if (data.user) {
        toast.success("Úspešne prihlásený!");

        // Check if user has completed onboarding
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", data.user.id).single();

        if (!profile) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Sign in error:", error);
      }
      toast.error("Nepodarilo sa prihlásiť. Skúste to prosím znova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Prihlásenie</TabsTrigger>
              <TabsTrigger value="signup">Registrácia</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-gradient-gold text-2xl">Prihlásenie</CardTitle>
                  <CardDescription>Prihlás sa do svojho účtu</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="vas@email.sk"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Heslo</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:glow-gold-strong" disabled={loading}>
                      {loading ? "Prihlasovanie..." : "Prihlásiť sa"}
                    </Button>
                  </form>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Alebo</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Prihlásiť sa cez Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-gradient-gold text-2xl">Registrácia</CardTitle>
                  <CardDescription>Vytvor si nový účet</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="vas@email.sk"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Heslo</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError("");
                          }}
                          required
                          placeholder="••••••••"
                          className={`pr-10 ${passwordError ? "border-destructive" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordError && <p className="text-sm text-destructive mt-1">{passwordError}</p>}
                      {!passwordError && (
                        <p className="text-xs text-muted-foreground mt-1">Min. 8 znakov, veľké a malé písmená, čísla</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Potvrdenie hesla</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setConfirmPasswordError("");
                          }}
                          required
                          placeholder="••••••••"
                          className={`pr-10 ${confirmPasswordError ? "border-destructive" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {confirmPasswordError && <p className="text-sm text-destructive mt-1">{confirmPasswordError}</p>}
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:glow-gold-strong" disabled={loading}>
                      {loading ? "Registrácia..." : "Registrovať sa"}
                    </Button>
                  </form>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Alebo</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Registrovať sa cez Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
