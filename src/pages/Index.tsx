import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Star, UtensilsCrossed, Beef, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import client1 from "@/assets/client-1.png";
import client2 from "@/assets/client-2.png";
import client3 from "@/assets/client-3.png";
import client4 from "@/assets/client-4.png";
import client5 from "@/assets/client-5.png";
import client6 from "@/assets/client-6.png";
const facts = ["Makroživiny sa vždy rátajú v surovom stave.", "100 g surového kuracieho mäsa = 40–60 g vareného, preto kalórie často nesedia.", "Varená ryža v tabuľkách je nepresná – množstvo vody mení výsledok.", "315 g surového kuracieho mäsa = 72,8 g bielkovín + 5 g tuku + 5 ml oleja (1100 kcal).", "Chudnutie = kalorický deficit. Žiadny spomalený metabolizmus.", "Príjem cukru z kávy, nápojov či drobných snackov ruší tvoj deficit.", "Váha kolíše kvôli vode, soli či menštruácii – sleduj telo, nie váhu.", "Aktívny športovec potrebuje 1,6–2 g bielkovín/kg hmotnosti.", "Denne pi 30–50 ml vody/kg – napr. 80 kg = 2,4–4 litre.", "Najčastejšia chyba - malé prehrešky a nedôslednosť rušia tvoje výsledky."];

const testimonials = [
  {
    image: client1,
    title: "Zdravé chudnutie s jojoefektom",
    description: "Jedálníček nastavený s optimálnym jedlom + 2x týždenne yoga 🙌\n-11kg\nŽiadne rýchlo chudnutie s jojoefektom, ale pomaly a podstivo\nBravo🙌"
  },
  {
    image: client2,
    title: "Úžasná transformácia",
    description: "Skvelé výsledky vďaka správnemu stravovaciemu plánu a cvičeniu."
  },
  {
    image: client3,
    title: "105 kg VS 75 kg",
    description: "Rok a pol rozdiel medzi fotkami\nKalorický deficit, silový tréning a kardio\nKcal v rozmedzí 2200-3500"
  },
  {
    image: client4,
    title: "99 kg hore vs 85 kg dole",
    description: "Z objemovej fázy do diétnej\nKcal vlny 2200-2600\nCca 3.5 mesiaca"
  },
  {
    image: client5,
    title: "Kompletná premena",
    description: "Od nuly k sebaistote. Výborná cesta k zdraviu."
  },
  {
    image: client6,
    title: "151 kg VS 120 kg",
    description: "7.7.23 VS 8.1.24\nbez výraznej deformácie kože, jojo efekt vďaka postupnému chudnutiu na 2200-3000 kcal nemožný"
  }
];
const Index = () => {
  const navigate = useNavigate();
  const [currentFact, setCurrentFact] = useState(0);
  const autoplayPlugin = Autoplay({ delay: 4000, stopOnInteraction: true });
  const autoplayPluginReverse = Autoplay({ delay: 4000, stopOnInteraction: true });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % facts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  return <div className="min-h-screen bg-background">
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
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">Profesionálne Stravovanie</p>
          <Button onClick={() => navigate("/menu")} className="bg-primary text-primary-foreground hover:glow-gold-strong text-lg px-8 py-6" size="lg">Pozri si aktuálmne týždenné menu →</Button>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            <div className="card-premium p-6">
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">500+</p>
              <p className="text-sm text-muted-foreground">Spokojných zákazníkov</p>
            </div>
            <div className="card-premium p-6">
              <UtensilsCrossed className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">50+</p>
              <p className="text-sm text-muted-foreground">Druhov jedál</p>
            </div>
            <div className="card-premium p-6">
              <Beef className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Čerstvé suroviny</p>
            </div>
            <div className="card-premium p-6">
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
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
            💡 Prečo krabičkovať?
          </h2>
          <Carousel
            opts={{
              align: "start",
              loop: true,
              direction: "rtl",
            }}
            plugins={[autoplayPluginReverse]}
            className="w-full max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {[{
                title: "Pohodlie a časová úspora",
                desc: "Ušetri hodiny varenia, plánovania a nakupovania."
              }, {
                title: "Kontrola porcií a makroživín",
                desc: "Presne vypočítané živiny pre tvoje ciele."
              }, {
                title: "Výber podľa tvojich cieľov",
                desc: "Redukcia váhy, naberanie svalov alebo udržanie formy."
              }, {
                title: "Vyvážená strava bez kompromisov",
                desc: "Všetko, čo tvoje telo potrebuje."
              }, {
                title: "Bez starostí o nákup a skladovanie",
                desc: "Čerstvé jedlá priamo k tvojim dverám."
              }].map((item, idx) => (
                <CarouselItem key={idx} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="card-premium p-8 h-full hover:glow-gold transition-smooth">
                    <h3 className="font-display text-2xl font-bold mb-4 text-primary">
                      {idx + 1}. {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Client Results Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
            💪 Výsledky našich klientov
          </h2>
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin]}
            className="w-full max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="card-premium p-4 h-full">
                    <div className="relative aspect-[3/4] mb-4 overflow-hidden rounded-lg">
                      <img
                        src={testimonial.image}
                        alt={testimonial.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2 text-primary">
                      {testimonial.title}
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {testimonial.description}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Facts Carousel */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
            🧠 Fakty o stravovaní
          </h2>
          <div className="card-premium p-12 text-center min-h-[200px] flex items-center justify-center">
            <p className="text-xl md:text-2xl text-foreground animate-fade-in" key={currentFact}>
              {facts[currentFact]}
            </p>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-16 text-gradient-gold">
            Odporúčame pre maximálne výsledky
          </h2>
          <div className="space-y-6">
            <div className="card-premium p-6">
              <p className="text-lg">💪 <strong className="text-primary">Aktívny športovec:</strong> 1,6–2 g bielkovín / kg hmotnosti</p>
            </div>
            <div className="card-premium p-6">
              <p className="text-lg">🧃 <strong className="text-primary">Po tréningu:</strong> doplniť elektrolyty + proteín 20–50 g</p>
            </div>
            <div className="card-premium p-6">
              <p className="text-lg">💧 <strong className="text-primary">Min. voda:</strong> hmotnosť × 30 ml (napr. 80 kg = 2,4 l/deň)</p>
            </div>
            <div className="card-premium p-6">
              <p className="text-lg">💧 <strong className="text-primary">Optimum:</strong> hmotnosť × 50 ml (80 kg = 4 l/deň)</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;