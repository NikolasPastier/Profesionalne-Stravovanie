import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Star, UtensilsCrossed, Beef, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const facts = [
  "Makroživiny sa vždy rátajú v surovom stave.",
  "100 g surového kuracieho mäsa = 40–60 g vareného, preto kalórie často nesedia.",
  "Varená ryža v tabuľkách je nepresná – množstvo vody mení výsledok.",
  "315 g surového kuracieho mäsa = 72,8 g bielkovín + 5 g tuku + 5 ml oleja (1100 kcal).",
  "Chudnutie = kalorický deficit. Žiadny spomalený metabolizmus.",
  "Príjem cukru z kávy, nápojov či drobných snackov ruší tvoj deficit.",
  "Váha kolíše kvôli vode, soli či menštruácii – sleduj telo, nie váhu.",
  "Aktívny športovec potrebuje 1,6–2 g bielkovín/kg hmotnosti.",
  "Denne pi 30–50 ml vody/kg – napr. 80 kg = 2,4–4 litre.",
  "Najčastejšia chyba - malé prehrešky a nedôslednosť rušia tvoje výsledky."
];

const Index = () => {
  const navigate = useNavigate();
  const [currentFact, setCurrentFact] = useState(0);
  
  const whySection = useScrollAnimation();
  const factsSection = useScrollAnimation();
  const recommendationsSection = useScrollAnimation();
  const statsSection = useScrollAnimation({ threshold: 0.2 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-gold-subtle opacity-30"></div>
        <div className="container mx-auto text-center relative z-10 animate-fade-in">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 text-gradient-gold">
            VIP Profesionálne Krabičkové Stravovanie
          </h1>
          <p className="text-2xl md:text-3xl mb-4 text-primary">
            Jedz zdravo. Sleduj progres. Dosiahni svoj cieľ.
          </p>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Prémiové krabičkové jedlá vytvorené podľa tvojich cieľov. Každý týždeň nové menu, presne vyrátané makrá a výnimočná chuť.
          </p>
          <Button
            onClick={() => navigate("/menu")}
            className="bg-primary text-primary-foreground hover:glow-gold-strong text-lg px-8 py-6"
            size="lg"
          >
            Objednaj si jedlo na týždeň →
          </Button>
          
          {/* Stats */}
          <div 
            ref={statsSection.ref}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto"
          >
            <div className={`card-premium p-6 scroll-animate-scale stagger-1 ${statsSection.isVisible ? 'scroll-animate-scale-visible' : ''}`}>
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">500+</p>
              <p className="text-sm text-muted-foreground">Spokojných zákazníkov</p>
            </div>
            <div className={`card-premium p-6 scroll-animate-scale stagger-2 ${statsSection.isVisible ? 'scroll-animate-scale-visible' : ''}`}>
              <UtensilsCrossed className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">50+</p>
              <p className="text-sm text-muted-foreground">Druhov jedál</p>
            </div>
            <div className={`card-premium p-6 scroll-animate-scale stagger-3 ${statsSection.isVisible ? 'scroll-animate-scale-visible' : ''}`}>
              <Beef className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Čerstvé suroviny</p>
            </div>
            <div className={`card-premium p-6 scroll-animate-scale stagger-4 ${statsSection.isVisible ? 'scroll-animate-scale-visible' : ''}`}>
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Podpora</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Meal Prep */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto">
          <div 
            ref={whySection.ref}
            className={`scroll-animate ${whySection.isVisible ? 'scroll-animate-visible' : ''}`}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
              💡 Prečo krabičkovať?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Pohodlie a časová úspora", desc: "Ušetri hodiny varenia, plánovania a nakupovania." },
              { title: "Kontrola porcií a makroživín", desc: "Presne vypočítané živiny pre tvoje ciele." },
              { title: "Výber podľa tvojich cieľov", desc: "Redukcia váhy, naberanie svalov alebo udržanie formy." },
              { title: "Vyvážená strava bez kompromisov", desc: "Všetko, čo tvoje telo potrebuje." },
              { title: "Bez starostí o nákup a skladovanie", desc: "Čerstvé jedlá priamo k tvojim dverám." },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className={`card-premium p-8 hover:glow-gold transition-smooth scroll-animate stagger-${(idx % 5) + 1} ${whySection.isVisible ? 'scroll-animate-visible' : ''}`}
              >
                <h3 className="font-display text-2xl font-bold mb-4 text-primary">{idx + 1}. {item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facts Carousel */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div 
            ref={factsSection.ref}
            className={`scroll-animate ${factsSection.isVisible ? 'scroll-animate-visible' : ''}`}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
              🧠 Fakty o stravovaní
            </h2>
            <div className="card-premium p-12 text-center min-h-[200px] flex items-center justify-center">
              <p className="text-xl md:text-2xl text-foreground animate-fade-in" key={currentFact}>
                {facts[currentFact]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-4xl">
          <div 
            ref={recommendationsSection.ref}
            className={`scroll-animate ${recommendationsSection.isVisible ? 'scroll-animate-visible' : ''}`}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
              Odporúčame pre maximálne výsledky
            </h2>
            <div className="space-y-6">
              <div className={`card-premium p-6 scroll-animate stagger-1 ${recommendationsSection.isVisible ? 'scroll-animate-visible' : ''}`}>
                <p className="text-lg">💪 <strong className="text-primary">Aktívny športovec:</strong> 1,6–2 g bielkovín / kg hmotnosti</p>
              </div>
              <div className={`card-premium p-6 scroll-animate stagger-2 ${recommendationsSection.isVisible ? 'scroll-animate-visible' : ''}`}>
                <p className="text-lg">🧃 <strong className="text-primary">Po tréningu:</strong> doplniť elektrolyty + proteín 20–50 g</p>
              </div>
              <div className={`card-premium p-6 scroll-animate stagger-3 ${recommendationsSection.isVisible ? 'scroll-animate-visible' : ''}`}>
                <p className="text-lg">💧 <strong className="text-primary">Min. voda:</strong> hmotnosť × 30 ml (napr. 80 kg = 2,4 l/deň)</p>
              </div>
              <div className={`card-premium p-6 scroll-animate stagger-4 ${recommendationsSection.isVisible ? 'scroll-animate-visible' : ''}`}>
                <p className="text-lg">💧 <strong className="text-primary">Optimum:</strong> hmotnosť × 50 ml (80 kg = 4 l/deň)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;