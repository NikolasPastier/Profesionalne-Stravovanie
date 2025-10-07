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

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        toast.success("Účet vytvorený! Môžete sa prihlásiť.");
        navigate("/onboarding");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
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
        toast.error(error.message);
      } else if (data.user) {
        toast.success("Úspešne prihlásený!");
        
        // Check if user is admin
        if (email === "admin@vipstrava.sk") {
          navigate("/admin");
        } else {
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", data.user.id)
            .single();

          if (!profile) {
            navigate("/onboarding");
          } else {
            navigate("/dashboard");
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message);
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
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:glow-gold-strong"
                      disabled={loading}
                    >
                      {loading ? "Prihlasovanie..." : "Prihlásiť sa"}
                    </Button>
                  </form>
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
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:glow-gold-strong"
                      disabled={loading}
                    >
                      {loading ? "Registrácia..." : "Registrovať sa"}
                    </Button>
                  </form>
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