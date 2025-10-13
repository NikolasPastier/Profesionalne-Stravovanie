import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
const quotes = [{
  text: "Tvoje telo dokáže takmer všetko. Je to tvoja myseľ, ktorú musíš presvedčiť.",
  author: "Neznámy"
}, {
  text: "Úspech je súčet malých úsilí opakovaných každý deň.",
  author: "Robert Collier"
}, {
  text: "Jediný zlý tréning je ten, ktorý si neurobil.",
  author: "Neznámy"
}, {
  text: "Staraj sa o svoje telo. Je jediné místo, kde musíš žiť.",
  author: "Jim Rohn"
}, {
  text: "Motivácia ťa naštartuje. Návyk ťa udrží v pohybe.",
  author: "Jim Ryun"
}, {
  text: "Neporovnávaj sa s ostatnými. Porovnávaj sa so sebou včerajším.",
  author: "Neznámy"
}, {
  text: "Zmena sa deje vtedy, keď stojíš na mieste, kde nie je cesty späť.",
  author: "Neznámy"
}, {
  text: "Každý deň je nová šanca stať sa lepšou verziou seba.",
  author: "Neznámy"
}];
export function MotivationalQuote() {
  const [quote, setQuote] = useState(quotes[0]);
  useEffect(() => {
    // Get daily quote based on day of year
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % quotes.length;
    setQuote(quotes[quoteIndex]);
  }, []);
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <p className="text-lg font-medium text-foreground mb-2 italic">
              "{quote.text}"
            </p>
            <p className="text-sm text-muted-foreground">— {quote.author}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}