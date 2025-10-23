import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Menu as MenuIcon, ShoppingCart, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import logo from "@/assets/logo.svg";
export const Navigation = () => {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
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

  useEffect(() => {
    // Update cart count from localStorage
    const updateCartCount = () => {
      const cart = localStorage.getItem("cart");
      if (cart) {
        const parsed = JSON.parse(cart);
        const count = Array.isArray(parsed) ? parsed.length : 1;
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();

    // Listen for storage changes (updates from other tabs/windows)
    window.addEventListener("storage", updateCartCount);
    
    // Custom event for same-tab updates
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
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
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Profesionálne Stravovanie" className="h-12 w-auto" />
          <span className="text-xl font-display font-bold text-gradient-gold">Profesionálne Stravovanie</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          <NavLinks />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/cart")} 
            className="relative gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
            <Moon className="h-4 w-4" />
          </div>

          {user ? <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
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
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background">
            <div className="flex flex-col gap-6 mt-8">
              <NavLinks />
              
              <Button 
                variant="ghost" 
                onClick={() => navigate("/cart")} 
                className="relative gap-2 justify-start"
              >
                <ShoppingCart className="h-5 w-5" />
                Košík
                {cartCount > 0 && (
                  <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>

              <div className="flex items-center gap-2 py-2">
                <Sun className="h-4 w-4" />
                <Switch 
                  checked={theme === "dark"} 
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
                <Moon className="h-4 w-4" />
              </div>

              {user ? <>
                  <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 justify-start">
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