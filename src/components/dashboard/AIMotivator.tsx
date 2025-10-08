import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIMotivatorProps {
  userProfile: any;
  progressData: any[];
}

export function AIMotivator({ userProfile, progressData }: AIMotivatorProps) {
  const [motivation, setMotivation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getMotivation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("health-assistant", {
        body: {
          userProfile,
          progressData,
          type: "motivation",
        },
      });

      if (error) throw error;
      setMotivation(data.advice);
    } catch (error: any) {
      console.error("Error getting motivation:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa získať motiváciu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Motivačný Tréner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!motivation ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Získajte personalizovanú motivačnú správu od AI trénera
            </p>
            <Button onClick={getMotivation} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generujem...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Získať motiváciu
                </>
              )}
            </Button>
          </div>
        ) : (
          <div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{motivation}</p>
            </div>
            <Button
              onClick={getMotivation}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Obnoviť
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
