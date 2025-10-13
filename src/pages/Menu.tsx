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
  carbs: number;
  fats: number;
  allergens: string[];
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
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedDaySize, setSelectedDaySize] = useState("");
  const [selectedMenuContext, setSelectedMenuContext] = useState<WeeklyMenu | null>(null);
  const [mealDetails, setMealDetails] = useState<Record<string, MenuItem>>({});
  const [mealDetailsByName, setMealDetailsByName] = useState<Record<string, MenuItem>>({});
  const navigate = useNavigate();

  // Helpers to support legacy weekly_menus that store meal names as strings with emojis
  const cleanMealString = (label: string) => {
    if (!label) return "";
    return label
      .replace(/^🍳\s*/, '')
      .replace(/^🍽️\s*/, '')
      .replace(/^🥤\s*/, '')
      .trim();
  };
  const categoryFromString = (label: string) => {
    if (label?.startsWith('🍳')) return { emoji: '🍳', label: 'Raňajky' };
    if (label?.startsWith('🍽️')) return { emoji: '🍽️', label: 'Obed' };
    if (label?.startsWith('🥤')) return { emoji: '🥤', label: 'Večera' };
    return { emoji: '🍽️', label: 'Jedlo' };
  };

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
      
      // Fetch meal details for both new (object with id) and legacy (string with emoji) menus
      const { data: mealsData, error: mealsError } = await supabase
        .from("menu_items")
        .select("*");

      if (!mealsError && mealsData) {
        const byId: Record<string, MenuItem> = {};
        const byName: Record<string, MenuItem> = {};
        mealsData.forEach((m: any) => {
          byId[m.id] = m as MenuItem;
          byName[m.name] = m as MenuItem;
        });
        setMealDetails(byId);
        setMealDetailsByName(byName);
      }
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

    // Store in localStorage for now - whole week
    const cartItem = {
      type: 'week',
      menuId: currentMenu.id,
      size: selectedSize,
      menu: currentMenu
    };

    localStorage.setItem("cart", JSON.stringify([cartItem]));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Menu pridané do košíka!");
    setIsDialogOpen(false);
    navigate("/cart");
  };

  const handleAddDayToCart = () => {
    if (!selectedDaySize) {
      toast.error("Prosím vyberte veľkosť menu");
      return;
    }

    if (!selectedDay || !selectedMenuContext) {
      toast.error("Chyba pri pridávaní do košíka");
      return;
    }

    // Get existing cart or create new
    const existingCart = localStorage.getItem("cart");
    const cart = existingCart ? JSON.parse(existingCart) : [];

    // Add day to cart
    const dayItem = {
      type: 'day',
      menuId: selectedMenuContext.id,
      size: selectedDaySize,
      day: selectedDay.day,
      meals: selectedDay.meals,
      weekRange: `${new Date(selectedMenuContext.start_date).toLocaleDateString("sk-SK")} - ${new Date(selectedMenuContext.end_date).toLocaleDateString("sk-SK")}`
    };

    cart.push(dayItem);
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`${selectedDay.day} pridaný do košíka!`);
    setIsDayDetailOpen(false);
    setSelectedDaySize("");
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
                  <div 
                    key={idx} 
                    className="border border-border rounded-lg p-4 bg-card/50 cursor-pointer hover:bg-card/70 hover:border-accent/50 transition-smooth hover:glow-gold"
                    onClick={() => {
                      setSelectedDay(day);
                      setSelectedMenuContext(currentMenu);
                      setIsDayDetailOpen(true);
                    }}
                  >
                    <h3 className="font-display text-xl font-bold mb-3 text-accent border-b border-accent pb-2">
                      {day.day}
                    </h3>
                    <div className="space-y-3">
                      {day.meals && day.meals.map((meal: any, mealIdx: number) => {
                        const mealName = typeof meal === 'string' ? cleanMealString(meal) : meal.name;
                        const categoryLabel = meal.category === 'breakfast' ? 'Raňajky' : meal.category === 'lunch' ? 'Obed' : meal.category === 'dinner' ? 'Večera' : 'Jedlo';
                        return (
                          <div key={mealIdx} className="bg-card/30 rounded-md p-3 border border-border/50">
                            <div className="text-xs font-semibold text-accent/80 mb-1">{categoryLabel}</div>
                            <p className="text-foreground text-sm font-medium leading-relaxed">
                              {mealName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Kliknite pre detaily →
                    </p>
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

                {/* Day Detail Modal */}
                <Dialog open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
                  <DialogContent className="bg-background max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-gradient-gold text-2xl">
                        {selectedDay?.day}
                      </DialogTitle>
                      <DialogDescription>
                        Kompletný prehľad jedál a nutričných hodnôt
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {selectedDay?.meals && selectedDay.meals.map((meal: any, idx: number) => {
                        const cleanName = typeof meal === 'string' ? cleanMealString(meal) : (meal.name || '');
                        const mealData = typeof meal === 'object' && meal.id ? mealDetails[meal.id] : (mealDetailsByName[cleanName] || null);
                        const mealName = typeof meal === 'string' ? cleanName : (mealData?.name || meal.name || `Jedlo ${idx + 1}`);
                        const { emoji: categoryEmoji, label: categoryLabel } = typeof meal === 'string' ? categoryFromString(meal) : (meal.category === 'breakfast' ? { emoji: '🍳', label: 'Raňajky' } : meal.category === 'lunch' ? { emoji: '🍽️', label: 'Obed' } : { emoji: '🥤', label: 'Večera' });

                        return (
                          <div key={idx} className="card-premium p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-2">
                                  <span className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-full font-semibold">
                                    {categoryLabel}
                                  </span>
                                </div>
                                <h4 className="font-bold text-lg text-primary leading-relaxed">
                                  {mealName}
                                </h4>
                              </div>
                            </div>
                            
                            {mealData && (
                              <>
                                {mealData.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {mealData.description}
                                  </p>
                                )}
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
                                  <div className="text-center bg-card/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">Kalórie</div>
                                    <div className="font-bold text-primary text-lg">{mealData.calories || 0}</div>
                                    <div className="text-xs text-muted-foreground">kcal</div>
                                  </div>
                                  <div className="text-center bg-card/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">Bielkoviny</div>
                                    <div className="font-bold text-primary text-lg">{mealData.proteins || 0}</div>
                                    <div className="text-xs text-muted-foreground">g</div>
                                  </div>
                                  <div className="text-center bg-card/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">Sacharidy</div>
                                    <div className="font-bold text-primary text-lg">{mealData.carbs || 0}</div>
                                    <div className="text-xs text-muted-foreground">g</div>
                                  </div>
                                  <div className="text-center bg-card/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground mb-1">Tuky</div>
                                    <div className="font-bold text-primary text-lg">{mealData.fats || 0}</div>
                                    <div className="text-xs text-muted-foreground">g</div>
                                  </div>
                                </div>
                                
                                {mealData.allergens && mealData.allergens.length > 0 && (
                                  <div className="pt-3 border-t border-border">
                                    <div className="text-xs font-semibold text-foreground mb-2">⚠️ Alergény:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {mealData.allergens.map((allergen: string, aIdx: number) => (
                                        <span key={aIdx} className="text-xs bg-destructive/20 text-destructive px-3 py-1.5 rounded-full font-medium">
                                          {allergen}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Size selection and add to cart - only for current menu */}
                    {selectedMenuContext?.id === currentMenu?.id && (
                      <div className="mt-6 pt-6 border-t border-border space-y-4">
                        <h4 className="font-bold text-lg text-foreground">Vyberte veľkosť</h4>
                        <RadioGroup value={selectedDaySize} onValueChange={setSelectedDaySize}>
                          {menuSizes.map((size) => (
                            <div key={size.value} className="flex items-center space-x-3 card-premium p-3">
                              <RadioGroupItem value={size.value} id={`day-${size.value}`} />
                              <Label htmlFor={`day-${size.value}`} className="flex-1 cursor-pointer">
                                <div className="font-bold text-primary text-sm">{size.label}</div>
                                <div className="text-xs text-muted-foreground">{size.description}</div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleAddDayToCart}
                            className="flex-1 bg-accent text-accent-foreground hover:glow-gold-strong transition-smooth"
                            disabled={!selectedDaySize}
                          >
                            Pridať do košíka
                          </Button>
                          <Button
                            onClick={() => navigate("/cart")}
                            variant="outline"
                            className="border-accent text-accent hover:bg-accent/10"
                          >
                            Zobraziť košík
                          </Button>
                        </div>
                      </div>
                    )}
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
                    <div className="grid grid-cols-1 gap-3">
                      {menu.items && Array.isArray(menu.items) && menu.items.map((day: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="border border-border rounded-lg p-3 bg-card/30 cursor-pointer hover:bg-card/60 hover:border-accent/50 transition-smooth"
                          onClick={() => {
                            setSelectedDay(day);
                            setSelectedMenuContext(menu);
                            setIsDayDetailOpen(true);
                          }}
                        >
                          <h4 className="font-semibold text-sm text-primary mb-2">{day.day}</h4>
                          <div className="space-y-2">
                            {day.meals && day.meals.slice(0, 3).map((meal: any, mealIdx: number) => {
                              const mealName = typeof meal === 'string' ? cleanMealString(meal) : meal.name;
                              const categoryLabel = meal.category === 'breakfast' ? 'Raňajky' : meal.category === 'lunch' ? 'Obed' : meal.category === 'dinner' ? 'Večera' : 'Jedlo';
                              return (
                                <div key={mealIdx} className="bg-card/30 rounded-md p-2 border border-border/50">
                                  <div className="text-xs font-semibold text-accent/80 mb-0.5">{categoryLabel}</div>
                                  <p className="text-xs text-foreground">{mealName}</p>
                                </div>
                              );
                            })}
                            {day.meals && day.meals.length > 3 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{day.meals.length - 3} ďalších jedál
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Kliknite pre detaily →
                          </p>
                        </div>
                      ))}
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