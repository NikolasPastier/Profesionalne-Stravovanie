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

  const pricingTiers = [
    {
      size: "S",
      calories: "1600 kcal",
      price: "€14.99",
      description: "Ženy, redukcia tuku",
      features: [
        "Ideálne pre redukciu hmotnosti",
        "Vyvážené makroživiny",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám"
      ]
    },
    {
      size: "M",
      calories: "2000 kcal",
      price: "€14.99",
      description: "Udržanie hmotnosti",
      features: [
        "Optimálne pre udržanie formy",
        "Vyvážená strava",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám"
      ]
    },
    {
      size: "L",
      calories: "2500 kcal",
      price: "€14.99",
      description: "Muži, aktívny životný štýl",
      popular: true,
      features: [
        "Pre aktívnych jedincov",
        "Vyšší obsah bielkovín",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám"
      ]
    },
    {
      size: "XL",
      calories: "3000 kcal",
      price: "€14.99",
      description: "Vyššia fyzická aktivita",
      features: [
        "Pre športovcov",
        "Vysoký obsah bielkovín",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám"
      ]
    },
    {
      size: "XXL+",
      calories: "3500+ kcal",
      price: "€14.99",
      description: "Profesionálni športovci",
      features: [
        "Pre profesionálov",
        "Maximálny obsah bielkovín",
        "Čerstvé suroviny",
        "Doručenie priamo k dverám"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-gradient-gold">
            Cenník
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Jednotná cena €14.99 za deň pre všetky veľkosti menu. Vyberte si balík podľa vašich kalórií a cieľov.
          </p>
        </div>

        <div ref={pricingRef.ref} className={`grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16 transition-all duration-700 ${pricingRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {pricingTiers.map((tier, idx) => (
            <Card 
              key={idx} 
              className={`card-premium relative hover:scale-110 transition-transform duration-300 cursor-pointer ${tier.popular ? 'border-2 border-primary glow-gold' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                    Najpopulárnejšie
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-3xl font-display text-gradient-gold">
                  {tier.size}
                </CardTitle>
                <CardDescription className="text-primary text-lg font-bold">
                  {tier.calories}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{tier.price}</span>
                  <span className="text-muted-foreground">/deň</span>
                </div>
                <p className="text-muted-foreground mt-2">{tier.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/menu")}
                  className={`w-full ${tier.popular ? 'bg-primary hover:glow-gold-strong' : ''}`}
                  variant={tier.popular ? "default" : "outline"}
                >
                  Objednať
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card ref={weeklyRef.ref} className={`card-premium max-w-4xl mx-auto transition-all duration-700 ${weeklyRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <CardHeader>
            <CardTitle className="text-3xl font-display text-gradient-gold text-center">
              Týždenné balíky
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Objednajte si celý týždeň a ušetrite!
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="border border-primary/20 rounded-lg p-6 hover:scale-110 transition-transform duration-300 cursor-pointer">
                <h3 className="font-bold text-xl mb-2 text-primary">Týždenný balík</h3>
                <p className="text-3xl font-bold mb-2">5 dní</p>
                <p className="text-muted-foreground mb-4">Pondelok - Piatok</p>
                <p className="text-sm text-muted-foreground">
                  Ušetrite čas a peniaze s týždennou objednávkou
                </p>
              </div>
              <div className="border border-primary/20 rounded-lg p-6 hover:scale-110 transition-transform duration-300 cursor-pointer">
                <h3 className="font-bold text-xl mb-2 text-primary">Platba</h3>
                <p className="text-lg mb-2">Hotovosť</p>
                <p className="text-muted-foreground mb-4">Pri doručení prvej objednávky</p>
                <p className="text-sm text-muted-foreground">
                  Zaplatíte celú sumu pri prvom doručení
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Cennik;