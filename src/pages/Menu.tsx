import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [customCalories, setCustomCalories] = useState("");
  const [customProteins, setCustomProteins] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");
  const [customDayCalories, setCustomDayCalories] = useState("");
  const [customDayProteins, setCustomDayProteins] = useState("");
  const [customDayCarbs, setCustomDayCarbs] = useState("");
  const [customDayFats, setCustomDayFats] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isDayVegetarian, setIsDayVegetarian] = useState(false);
  const navigate = useNavigate();

  // Helpers to support legacy weekly_menus that store meal names as strings with emojis
  const cleanMealString = (label: string) => {
    if (!label) return "";
    return label
      .replace(/^🍳\s*/, "")
      .replace(/^🍽️\s*/, "")
      .replace(/^🥤\s*/, "")
      .trim();
  };
  const categoryFromString = (label: string) => {
    if (label?.startsWith("🍳"))
      return {
        emoji: "🍳",
        label: "Raňajky",
      };
    if (label?.startsWith("🍽️"))
      return {
        emoji: "🍽️",
        label: "Obed",
      };
    if (label?.startsWith("🥤"))
      return {
        emoji: "🥤",
        label: "Večera",
      };
    return {
      emoji: "🍽️",
      label: "Jedlo",
    };
  };
  // Helper to check if a day is in the past or today
  const isDayBeforeOrToday = (dayName: string, menuStartDate: string) => {
    const dayMap: Record<string, number> = {
      Pondelok: 1,
      Utorok: 2,
      Streda: 3,
      Štvrtok: 4,
      Piatok: 5,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const menuStart = new Date(menuStartDate);
    menuStart.setHours(0, 0, 0, 0);

    // Calculate which day of the week this day falls on
    const dayIndex = dayMap[dayName];
    if (!dayIndex) return true; // If unknown day, disable it

    // Calculate the actual date for this day (Monday = 1, Friday = 5)
    const dayDate = new Date(menuStart);
    dayDate.setDate(menuStart.getDate() + (dayIndex - 1));

    // Return true if this day is today or before today
    return dayDate <= today;
  };

  const menuSizes = [
    {
      value: "S",
      label: "S (1600 kcal)",
      description: "Ženy, redukcia tuku",
    },
    {
      value: "M",
      label: "M (2000 kcal)",
      description: "Udržanie hmotnosti",
    },
    {
      value: "L",
      label: "L (2500 kcal)",
      description: "Muži, aktívny životný štýl",
    },
    {
      value: "XL",
      label: "XL (3000 kcal)",
      description: "Vyššia fyzická aktivita",
    },
    {
      value: "XXL",
      label: "XXL+ (3500+ kcal)",
      description: "Profesionálni športovci",
    },
  ];
  useEffect(() => {
    fetchMenus();
  }, []);
  useEffect(() => {
    // Set only future weekdays as selected by default when menu loads
    if (currentMenu?.items && Array.isArray(currentMenu.items)) {
      const availableDays = currentMenu.items
        .filter((day: any) => ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(day.day))
        .filter((day: any) => !isDayBeforeOrToday(day.day, currentMenu.start_date))
        .map((day: any) => day.day);
      setSelectedDays(availableDays);
    }
  }, [currentMenu]);
  const fetchMenus = async () => {
    const { data, error } = await supabase.from("weekly_menus").select("*").order("created_at", {
      ascending: false,
    });
    if (error) {
      toast.error("Chyba pri načítaní menu");
      return;
    }
    if (data && data.length > 0) {
      setCurrentMenu(data[0]);
      setMenuHistory(data.slice(1));

      // Fetch meal details for both new (object with id) and legacy (string with emoji) menus
      const { data: mealsData, error: mealsError } = await supabase.from("menu_items").select("*");
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
    if (selectedDays.length === 0) {
      toast.error("Prosím vyberte aspoň jeden deň");
      return;
    }

    // Check if any selected day is in the past or today
    if (currentMenu && selectedDays.some((day) => isDayBeforeOrToday(day, currentMenu.start_date))) {
      toast.error("Nemôžete objednať dni v minulosti alebo dnešný deň");
      return;
    }

    if (!selectedSize) {
      toast.error("Prosím vyberte veľkosť menu");
      return;
    }
    if (!currentMenu) {
      toast.error("Žiadne menu nie je k dispozícii");
      return;
    }

    // Store in localStorage for now - selected weekdays only
    const filteredItems = (currentMenu.items || []).filter((day: any) => selectedDays.includes(day.day));
    const cartItem = {
      type: "week",
      menuId: currentMenu.id,
      size: selectedSize,
      isVegetarian: isVegetarian,
      menu: { ...currentMenu, items: filteredItems },
      selectedDays: selectedDays,
    };
    localStorage.setItem("cart", JSON.stringify([cartItem]));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Menu pridané do košíka!");
    setIsDialogOpen(false);
    setSelectedSize("");
    setIsVegetarian(false);
    setCustomCalories("");
    setCustomProteins("");
    setCustomCarbs("");
    setCustomFats("");
    navigate("/cart");
  };
  const toggleDay = (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };
  const toggleAllDays = () => {
    if (currentMenu?.items && Array.isArray(currentMenu.items)) {
      const availableDays = currentMenu.items
        .filter((day: any) => ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(day.day))
        .filter((day: any) => !isDayBeforeOrToday(day.day, currentMenu.start_date))
        .map((day: any) => day.day);
      if (selectedDays.length === availableDays.length) {
        setSelectedDays([]);
      } else {
        setSelectedDays(availableDays);
      }
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Current Menu */}
        <section className="mb-20">
          {currentMenu ? (
            <Card className="card-premium mx-4 md:mx-[150px]">
              <CardHeader>
                <CardTitle className="text-2xl text-gradient-gold text-center">
                  Menu na týždeň {new Date(currentMenu.start_date).toLocaleDateString("sk-SK")} -{" "}
                  {new Date(currentMenu.end_date).toLocaleDateString("sk-SK")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                  {currentMenu.items &&
                    Array.isArray(currentMenu.items) &&
                    currentMenu.items
                      .filter((d: any) => ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(d.day))
                      .map((day: any, idx: number) => {
                        const isPastDay = isDayBeforeOrToday(day.day, currentMenu.start_date);
                        return (
                          <div
                            key={idx}
                            className={`border border-border rounded-lg p-4 bg-card/50 transition-smooth ${
                              isPastDay
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-card/70 hover:border-accent/50 hover:glow-gold"
                            }`}
                            onClick={() => {
                              if (!isPastDay) {
                                setSelectedDay(day);
                                setSelectedMenuContext(currentMenu);
                                setIsDayDetailOpen(true);
                              }
                            }}
                          >
                            <h3 className="font-display text-xl font-bold mb-3 text-accent border-b border-accent pb-2">
                              {day.day}
                            </h3>
                            <div className="space-y-3">
                              {day.meals &&
                                day.meals.map((meal: any, mealIdx: number) => {
                                  const mealName = typeof meal === "string" ? cleanMealString(meal) : meal.name;
                                  const categoryLabel =
                                    meal.category === "breakfast"
                                      ? "Raňajky"
                                      : meal.category === "lunch"
                                        ? "Obed"
                                        : meal.category === "dinner"
                                          ? "Večera"
                                          : "Jedlo";
                                  return (
                                    <div key={mealIdx} className="bg-card/30 rounded-md p-3 border border-border/50">
                                      <div className="text-xs font-semibold text-accent/80 mb-1">{categoryLabel}</div>
                                      <p className="text-foreground text-sm font-medium leading-relaxed">{mealName}</p>
                                    </div>
                                  );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 italic">
                              {isPastDay ? "Tento deň už nie je dostupný ⏱️" : "Kliknite pre detaily →"}
                            </p>
                          </div>
                        );
                      })}
                </div>
                <div className="flex justify-center">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-8 w-full md:w-auto bg-accent text-accent-foreground hover:glow-gold-strong text-lg py-6 transition-smooth">
                        Objednať toto menu 🍱
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-gradient-gold">Vyberte dni a veľkosť menu</DialogTitle>
                        <DialogDescription>Vyberte dni ktoré chcete objednať a veľkosť menu</DialogDescription>
                      </DialogHeader>

                      {/* Days Selection */}
                      <div className="space-y-4 p-4 border border-accent/30 rounded-lg bg-accent/5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">Dni v týždni</h4>
                          <Button type="button" variant="outline" size="sm" onClick={toggleAllDays} className="text-xs">
                            {selectedDays.length ===
                            (currentMenu?.items?.filter(
                              (d: any) =>
                                ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(d.day) &&
                                !isDayBeforeOrToday(d.day, currentMenu.start_date),
                            ).length || 0)
                              ? "Zrušiť všetky"
                              : "Vybrať všetky"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {currentMenu?.items &&
                            Array.isArray(currentMenu.items) &&
                            currentMenu.items
                              .filter((day: any) =>
                                ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(day.day),
                              )
                              .map((day: any) => {
                                const isPastDay = isDayBeforeOrToday(day.day, currentMenu.start_date);
                                return (
                                  <div key={day.day} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`day-${day.day}`}
                                      checked={selectedDays.includes(day.day)}
                                      onCheckedChange={() => toggleDay(day.day)}
                                      disabled={isPastDay}
                                    />
                                    <Label
                                      htmlFor={`day-${day.day}`}
                                      className={`text-sm font-medium leading-none ${isPastDay ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                      {day.day} {isPastDay ? "(nedostupný)" : ""}
                                    </Label>
                                  </div>
                                );
                              })}
                        </div>
                      </div>

                      {/* Vegetarian Option */}
                      {selectedSize && (
                        <div className="flex items-center space-x-3 p-4 border border-accent/30 rounded-lg bg-accent/5">
                          <Checkbox
                            id="vegetarian"
                            checked={isVegetarian}
                            onCheckedChange={(checked) => setIsVegetarian(checked as boolean)}
                          />
                          <Label htmlFor="vegetarian" className="flex-1 cursor-pointer">
                            <div className="font-bold text-primary">Vegetariánske menu</div>
                            <div className="text-sm text-muted-foreground">
                              €16.99/deň (Klasické: €14.99/deň) - Bez mäsa, čerstvé ingrediencie
                            </div>
                          </Label>
                        </div>
                      )}

                      <div className="pt-2 space-y-4">
                        <h4 className="font-semibold text-foreground mb-3">Veľkosť menu</h4>
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
                      </div>

                      <Button
                        onClick={handleAddToCart}
                        className="w-full bg-accent text-accent-foreground hover:glow-gold-strong transition-smooth"
                        disabled={!selectedSize || selectedDays.length === 0}
                      >
                        Pokračovať do košíka
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Day Detail Modal */}
                <Dialog open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
                  <DialogContent className="bg-background max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-gradient-gold text-2xl">{selectedDay?.day}</DialogTitle>
                      <DialogDescription>Kompletný prehľad jedál a nutričných hodnôt</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {selectedDay?.meals &&
                        selectedDay.meals.map((meal: any, idx: number) => {
                          const cleanName = typeof meal === "string" ? cleanMealString(meal) : meal.name || "";
                          const mealData =
                            typeof meal === "object" && meal.id
                              ? mealDetails[meal.id]
                              : mealDetailsByName[cleanName] || null;
                          const mealName =
                            typeof meal === "string" ? cleanName : mealData?.name || meal.name || `Jedlo ${idx + 1}`;
                          const { emoji: categoryEmoji, label: categoryLabel } =
                            typeof meal === "string"
                              ? categoryFromString(meal)
                              : meal.category === "breakfast"
                                ? {
                                    emoji: "🍳",
                                    label: "Raňajky",
                                  }
                                : meal.category === "lunch"
                                  ? {
                                      emoji: "🍽️",
                                      label: "Obed",
                                    }
                                  : {
                                      emoji: "🥤",
                                      label: "Večera",
                                    };
                          return (
                            <div key={idx} className="card-premium p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <span className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded-full font-semibold">
                                      {categoryLabel}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-lg text-primary leading-relaxed">{mealName}</h4>
                                </div>
                              </div>

                              {mealData && (
                                <>
                                  {mealData.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {mealData.description}
                                    </p>
                                  )}

                                  {mealData.allergens && mealData.allergens.length > 0 && (
                                    <div className="pt-3 border-t border-border">
                                      <div className="text-xs font-semibold text-foreground mb-2">⚠️ Alergény:</div>
                                      <div className="flex flex-wrap gap-2">
                                        {mealData.allergens.map((allergen: string, aIdx: number) => (
                                          <span
                                            key={aIdx}
                                            className="text-xs bg-destructive/20 text-destructive px-3 py-1.5 rounded-full font-medium"
                                          >
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
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-muted-foreground text-lg">Žiadne aktuálne menu zatiaľ nebolo pridané.</p>
          )}
        </section>

        {/* Menu History */}
        {menuHistory.length > 0 && (
          <section>
            <h2 className="font-display text-3xl font-bold mb-8 text-primary">História menu</h2>
            <div className="grid gap-6 grid-cols-1 max-w-2xl mx-auto">
              {menuHistory.map((menu) => (
                <Card key={menu.id} className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-lg text-accent">
                      {new Date(menu.start_date).toLocaleDateString("sk-SK")} -{" "}
                      {new Date(menu.end_date).toLocaleDateString("sk-SK")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {menu.items &&
                        Array.isArray(menu.items) &&
                        menu.items
                          .filter((day: any) => ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"].includes(day.day))
                          .map((day: any, idx: number) => (
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
                                {day.meals &&
                                  day.meals.slice(0, 3).map((meal: any, mealIdx: number) => {
                                    const mealName = typeof meal === "string" ? cleanMealString(meal) : meal.name;
                                    const categoryLabel =
                                      meal.category === "breakfast"
                                        ? "Raňajky"
                                        : meal.category === "lunch"
                                          ? "Obed"
                                          : meal.category === "dinner"
                                            ? "Večera"
                                            : "Jedlo";
                                    return (
                                      <div key={mealIdx} className="bg-card/30 rounded-md p-2 border border-border/50">
                                        <div className="text-xs font-semibold text-accent/80 mb-0.5">
                                          {categoryLabel}
                                        </div>
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
                              <p className="text-xs text-muted-foreground mt-2 italic">Kliknite pre detaily →</p>
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
