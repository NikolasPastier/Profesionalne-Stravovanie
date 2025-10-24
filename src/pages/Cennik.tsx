import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { useState } from "react";

const Cennik = () => {
  const navigate = useNavigate();
  const pricingRef = useScrollAnimation();
  const weeklyRef = useScrollAnimation();
  const [deliveryArea, setDeliveryArea] = useState("Nitra");

  const pricingTiers = [
    {
      size: "S",
      calories: "1600 kcal",
      price: deliveryArea === "Nitra" ? "€14.99" : "€20.99",
      description: "Ženy, redukcia tuku",
      features: [
        "Ideálne pre redukciu hmotnosti",
        "Vyvážené makroživiny",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám",
      ],
    },
    {
      size: "M",
      calories: "2000 kcal",
      price: deliveryArea === "Nitra" ? "€14.99" : "€20.99",
      description: "Udržanie hmotnosti",
      features: ["Optimálne pre udržanie formy", "Vyvážená strava", "Čerstvé suroviny", "Doručenie priamo k dverám"],
    },
    {
      size: "L",
      calories: "2500 kcal",
      price: deliveryArea === "Nitra" ? "€14.99" : "€20.99",
      description: "Muži, aktívny životný štýl",
      features: ["Pre aktívnych jedincov", "Vyšší obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"],
    },
    {
      size: "XL",
      calories: "3000 kcal",
      price: deliveryArea === "Nitra" ? "€14.99" : "€20.99",
      description: "Vyššia fyzická aktivita",
      features: ["Pre športovcov", "Vysoký obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"],
    },
    {
      size: "XXL+",
      calories: "3500+ kcal",
      price: deliveryArea === "Nitra" ? "€16.99" : "€22.99",
      description: "Profesionálni športovci",
      features: ["Pre profesionálov", "Maximálny obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <Card
          ref={pricingRef.ref}
          className={`card-premium max-w-5xl mx-auto mb-16 transition-all duration-700 ${
            pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-display text-gradient-gold mb-4">Cenník</CardTitle>
            <div className="flex justify-center gap-4 mb-4">
              <Button
                onClick={() => setDeliveryArea("Nitra")}
                className={`px-6 py-2 text-sm font-medium ${
                  deliveryArea === "Nitra"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-primary/20 text-primary hover:bg-primary/10"
                }`}
              >
                Smer Nitra a okolie
              </Button>
              <Button
                onClick={() => setDeliveryArea("Bratislava")}
                className={`px-6 py-2 text-sm font-medium ${
                  deliveryArea === "Bratislava"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-primary/20 text-primary hover:bg-primary/10"
                }`}
              >
                Smer Bratislava a okolie
              </Button>
            </div>
            <div className="mt-4">
              <span className="text-5xl font-bold text-primary">{deliveryArea === "Nitra" ? "€14.99" : "€20.99"}</span>
              <span className="text-xl text-muted-foreground">/deň</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {pricingTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-6 hover:scale-105 transition-transform duration-300 border-primary/20`}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-2xl font-display text-gradient-gold">{tier.size}</h3>
                    <p className="text-primary text-lg font-bold">{tier.calories}</p>
                  </div>
                  <p className="text-primary text-lg font-bold mb-1">{tier.price}/deň</p>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <ul className="space-y-2">
                    {tier.features.slice(0, 3).map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="border border-accent/40 rounded-lg p-6 hover:scale-105 transition-transform duration-300 bg-accent/5">
                <h3 className="text-2xl font-display text-gradient-gold mb-2">🌱 Vegetariánske</h3>
                <p className="text-primary text-lg font-bold mb-1">
                  {deliveryArea === "Nitra" ? "€16.99" : "€22.99"}/deň
                </p>
                <p className="text-sm text-muted-foreground mb-4">Bez mäsa, plné živín</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">100% vegetariánske jedlá</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Vyvážené rastlinné bielkoviny</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Čerstvé suroviny</span>
                  </li>
                </ul>
              </div>
              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <h3 className="text-2xl font-display text-gradient-gold mb-2">Na mieru</h3>
                <p className="text-primary text-lg font-bold mb-1">Vlastný počet kalórií</p>
                <p className="text-sm text-muted-foreground mb-4">Prispôsobené vašim potrebám</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Vlastný počet kalórií</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Vlastné makroživiny</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Čerstvé suroviny</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <Button onClick={() => navigate("/menu")} size="lg" className="bg-primary hover:glow-gold-strong px-8">
                Vybrať menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Cennik;
