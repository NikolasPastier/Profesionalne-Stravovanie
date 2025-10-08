import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Menu as MenuIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.svg";
export const Navigation = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const NavLinks = () => <>
      <Link to="/" className="text-foreground hover:text-primary transition-smooth">
        Domov
      </Link>
      <Link to="/menu" className="text-foreground hover:text-primary transition-smooth">
        Menu
      </Link>
      <Link to="/cennik" className="text-foreground hover:text-primary transition-smooth">
        Cenník
      </Link>
      <Link to="/doprava" className="text-foreground hover:text-primary transition-smooth">
        Doprava
      </Link>
      <Link to="/onas" className="text-foreground hover:text-primary transition-smooth">
        O nás
      </Link>
    </>;
  return <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-md border-b border-primary/20 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Profesionálne Stravovanie" className="h-12 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavLinks />
          
          {user ? <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <User className="h-4 w-4" />
                Profil
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Odhlásiť sa
              </Button>
            </div> : <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:glow-gold-strong">
              Prihlásiť sa
            </Button>}
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background">
            <div className="flex flex-col gap-6 mt-8">
              <NavLinks />
              {user ? <>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 justify-start">
                    <User className="h-4 w-4" />
                    Profil
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut} className="gap-2 justify-start">
                    <LogOut className="h-4 w-4" />
                    Odhlásiť sa
                  </Button>
                </> : <Button onClick={() => navigate("/auth")} className="bg-primary">
                  Prihlásiť sa
                </Button>}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>;
};