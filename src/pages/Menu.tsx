import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  calories: number;
  proteins: number;
  image_url: string;
}

interface WeeklyMenu {
  id: string;
  start_date: string;
  end_date: string;
  items: any;
}

const Menu = () => {
  const [currentMenu, setCurrentMenu] = useState<WeeklyMenu | null>(null);
  const [menuHistory, setMenuHistory] = useState<WeeklyMenu[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const menuSizes = [
    { value: "S", label: "S (1600 kcal)", description: "Ženy, redukcia tuku" },
    { value: "M", label: "M (2000 kcal)", description: "Udržanie hmotnosti" },
    { value: "L", label: "L (2500 kcal)", description: "Muži, aktívny životný štýl" },
    { value: "XL", label: "XL (3000 kcal)", description: "Vyššia fyzická aktivita" },
    { value: "XXL", label: "XXL+ (3500+ kcal)", description: "Profesionálni športovci" },
  ];

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const { data, error } = await supabase
      .from("weekly_menus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Chyba pri načítaní menu");
      return;
    }

    if (data && data.length > 0) {
      setCurrentMenu(data[0]);
      setMenuHistory(data.slice(1));
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Prosím vyberte veľkosť menu");
      return;
    }

    if (!currentMenu) {
      toast.error("Žiadne menu nie je k dispozícii");
      return;
    }

    // Store in localStorage for now
    const cartItem = {
      menuId: currentMenu.id,
      size: selectedSize,
      menu: currentMenu
    };

    localStorage.setItem("cart", JSON.stringify(cartItem));
    toast.success("Menu pridané do košíka!");
    setIsDialogOpen(false);
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-center mb-12 text-gradient-gold">
          Týždenné Menu
        </h1>

        {/* Current Menu */}
        <section className="mb-20">
          <h2 className="font-display text-3xl font-bold mb-8 text-primary">
            Aktuálne týždenné menu
          </h2>

        {currentMenu ? (
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="text-2xl text-gradient-gold">
                Menu na týždeň {new Date(currentMenu.start_date).toLocaleDateString("sk-SK")} - {new Date(currentMenu.end_date).toLocaleDateString("sk-SK")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentMenu.items && Array.isArray(currentMenu.items) && currentMenu.items.map((day: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-card/50">
                    <h3 className="font-display text-xl font-bold mb-3 text-accent border-b border-accent pb-2">
                      {day.day}
                    </h3>
                    <div className="space-y-2">
                      {day.meals && day.meals.map((meal: string, mealIdx: number) => (
                        <p key={mealIdx} className="text-foreground text-sm">
                          {meal}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="mt-8 w-full md:w-auto bg-accent text-accent-foreground hover:glow-gold-strong text-lg py-6 px-8 transition-smooth">
                      Objednať toto menu 🍱
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background">
                    <DialogHeader>
                      <DialogTitle className="text-gradient-gold">Vyberte veľkosť svojho denného menu</DialogTitle>
                      <DialogDescription>
                        Vyberte veľkosť menu podľa vašich potrieb a cieľov
                      </DialogDescription>
                    </DialogHeader>
                    <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                      {menuSizes.map((size) => (
                        <div key={size.value} className="flex items-center space-x-3 card-premium p-4">
                          <RadioGroupItem value={size.value} id={size.value} />
                          <Label htmlFor={size.value} className="flex-1 cursor-pointer">
                            <div className="font-bold text-primary">{size.label}</div>
                            <div className="text-sm text-muted-foreground">{size.description}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Button
                      onClick={handleAddToCart}
                      className="w-full bg-accent text-accent-foreground hover:glow-gold-strong transition-smooth"
                      disabled={!selectedSize}
                    >
                      Pokračovať do košíka
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground text-lg">
              Žiadne aktuálne menu zatiaľ nebolo pridané.
            </p>
          )}
        </section>

        {/* Menu History */}
        {menuHistory.length > 0 && (
          <section>
            <h2 className="font-display text-3xl font-bold mb-8 text-primary">
              História menu
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {menuHistory.map((menu) => (
                <Card key={menu.id} className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-lg text-accent">
                      {new Date(menu.start_date).toLocaleDateString("sk-SK")} - {new Date(menu.end_date).toLocaleDateString("sk-SK")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {menu.items && Array.isArray(menu.items) && menu.items.slice(0, 3).map((day: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-accent/40 pl-3">
                          <h4 className="font-semibold text-sm text-foreground mb-1">{day.day}</h4>
                          <div className="space-y-1">
                            {day.meals && day.meals.slice(0, 2).map((meal: string, mealIdx: number) => (
                              <p key={mealIdx} className="text-xs text-muted-foreground">{meal}</p>
                            ))}
                            {day.meals && day.meals.length > 2 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{day.meals.length - 2} ďalších jedál
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {menu.items && menu.items.length > 3 && (
                        <p className="text-sm text-muted-foreground italic text-center pt-2">
                          ... a {menu.items.length - 3} ďalších dní
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Menu;