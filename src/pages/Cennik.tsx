import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
const Cennik = () => {
  const navigate = useNavigate();
  const pricingRef = useScrollAnimation();
  const weeklyRef = useScrollAnimation();
  const pricingTiers = [{
    size: "S",
    calories: "1600 kcal",
    price: "€14.99",
    description: "Ženy, redukcia tuku",
    features: ["Ideálne pre redukciu hmotnosti", "Vyvážené makroživiny", "Čerstvé suroviny", "Doručenie priamo k dverám"]
  }, {
    size: "M",
    calories: "2000 kcal",
    price: "€14.99",
    description: "Udržanie hmotnosti",
    features: ["Optimálne pre udržanie formy", "Vyvážená strava", "Čerstvé suroviny", "Doručenie priamo k dverám"]
  }, {
    size: "L",
    calories: "2500 kcal",
    price: "€14.99",
    description: "Muži, aktívny životný štýl",
    popular: true,
    features: ["Pre aktívnych jedincov", "Vyšší obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"]
  }, {
    size: "XL",
    calories: "3000 kcal",
    price: "€14.99",
    description: "Vyššia fyzická aktivita",
    features: ["Pre športovcov", "Vysoký obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"]
  }, {
    size: "XXL+",
    calories: "3500+ kcal",
    price: "€14.99",
    description: "Profesionálni športovci",
    features: ["Pre profesionálov", "Maximálny obsah bielkovín", "Čerstvé suroviny", "Doručenie priamo k dverám"]
  }];
  return <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        

        <Card ref={pricingRef.ref} className={`card-premium max-w-5xl mx-auto mb-16 transition-all duration-700 ${pricingRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-display text-gradient-gold mb-4">Cenník</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold text-primary">€14.99</span>
              <span className="text-xl text-muted-foreground">/deň</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {pricingTiers.map((tier, idx) => <div key={idx} className={`border rounded-lg p-6 hover:scale-105 transition-transform duration-300 ${tier.popular ? 'border-primary border-2 bg-primary/5' : 'border-primary/20'}`}>
                  {tier.popular && <div className="mb-3">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                        Najpopulárnejšie
                      </span>
                    </div>}
                  <h3 className="text-2xl font-display text-gradient-gold mb-2">
                    {tier.size}
                  </h3>
                  <p className="text-primary text-lg font-bold mb-1">{tier.calories}</p>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <ul className="space-y-2">
                    {tier.features.slice(0, 3).map((feature, featureIdx) => <li key={featureIdx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{feature}</span>
                      </li>)}
                  </ul>
                </div>)}
              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <h3 className="text-2xl font-display text-gradient-gold mb-2">
                  Na mieru
                </h3>
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
    </div>;
};
export default Cennik;