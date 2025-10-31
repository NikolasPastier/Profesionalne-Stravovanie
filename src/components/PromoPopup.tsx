import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PromoPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      
      if (!session) {
        // Only show for non-authenticated users
        const hasSeenPopup = localStorage.getItem("promo_popup_seen");
        const popupDismissed = localStorage.getItem("promo_popup_dismissed");
        
        if (!hasSeenPopup) {
          // Show popup after 2 seconds for new visitors
          setTimeout(() => {
            setShowPopup(true);
            localStorage.setItem("promo_popup_seen", "true");
          }, 2000);
        } else if (popupDismissed === "true") {
          // Show reminder if they dismissed it before
          setShowReminder(true);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        setShowPopup(false);
        setShowReminder(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleClose = () => {
    setShowPopup(false);
    localStorage.setItem("promo_popup_dismissed", "true");
    setShowReminder(true);
  };

  const handleRegister = () => {
    setShowPopup(false);
    navigate("/auth");
  };

  const handleReminderClick = () => {
    setShowReminder(false);
    setShowPopup(true);
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold text-2xl flex items-center gap-2">
              <Percent className="h-6 w-6" />
              Špeciálna ponuka pre nových zákazníkov!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Registruj sa s promo kódom <span className="font-bold text-primary">VITAJ5</span> a získaj{" "}
              <span className="font-bold text-primary">5% zľavu</span> na tvoju prvú objednávku!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-card-hover rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Promo kód:</p>
              <p className="text-2xl font-bold text-center text-gradient-gold tracking-wider">VITAJ5</p>
            </div>
            <Button onClick={handleRegister} className="w-full bg-primary hover:glow-gold-strong" size="lg">
              Registrovať sa teraz
            </Button>
            <button
              onClick={handleClose}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Možno neskôr
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showReminder && (
        <button
          onClick={handleReminderClick}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground rounded-l-lg shadow-glow-gold p-3 hover:pr-4 transition-all duration-300 group"
          aria-label="Promo kód pripomienka"
        >
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden">
              5% zľava
            </span>
          </div>
        </button>
      )}
    </>
  );
};
