import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogOut, Sparkles, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Analysis {
  id: string;
  text: string;
  sentiment: string;
  confidence: number;
  analyzed_at: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ sentiment: string; confidence: number } | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadHistory();
      }
    });
  }, [navigate]);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("sentiment_analyses")
      .select("*")
      .order("analyzed_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data);
    }
  };

  const analyzeSentiment = async () => {
    if (!text.trim() || !user) return;

    setAnalyzing(true);
    try {
      // Simple sentiment analysis logic (can be replaced with AI API)
      const lowerText = text.toLowerCase();
      const positiveWords = ["good", "great", "excellent", "happy", "love", "wonderful", "fantastic", "amazing"];
      const negativeWords = ["bad", "terrible", "awful", "hate", "horrible", "poor", "worst", "disappointing"];

      let positiveCount = 0;
      let negativeCount = 0;

      positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
      });

      negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
      });

      let sentiment = "neutral";
      let confidence = 0.5;

      if (positiveCount > negativeCount) {
        sentiment = "positive";
        confidence = Math.min(0.95, 0.6 + (positiveCount * 0.1));
      } else if (negativeCount > positiveCount) {
        sentiment = "negative";
        confidence = Math.min(0.95, 0.6 + (negativeCount * 0.1));
      } else if (positiveCount === 0 && negativeCount === 0) {
        confidence = 0.7;
      }

      setResult({ sentiment, confidence });

      // Save to database
      const { error } = await supabase.from("sentiment_analyses").insert({
        user_id: user.id,
        text,
        sentiment,
        confidence: confidence * 100,
      });

      if (error) throw error;

      toast({
        title: "Analysis complete!",
        description: `Sentiment: ${sentiment} (${(confidence * 100).toFixed(0)}% confidence)`,
      });

      loadHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    const { error } = await supabase.from("sentiment_analyses").delete().eq("id", id);

    if (!error) {
      toast({ title: "Analysis deleted" });
      loadHistory();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />;
      case "negative":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-success/10 text-success border-success/20";
      case "negative":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sentiment Analysis</h1>
              <p className="text-xs text-muted-foreground">AI-powered emotion detection</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Analyze Text
              </CardTitle>
              <CardDescription>Enter text to detect its emotional tone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type or paste your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[150px] resize-none"
              />
              <Button onClick={analyzeSentiment} disabled={analyzing || !text.trim()} className="w-full">
                {analyzing ? "Analyzing..." : "Analyze Sentiment"}
              </Button>

              {result && (
                <Card className={`border-2 ${getSentimentColor(result.sentiment)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(result.sentiment)}
                        <span className="font-semibold capitalize">{result.sentiment}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {(result.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Your recent sentiment analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No analyses yet</p>
                ) : (
                  history.map((item) => (
                    <Card key={item.id} className="group hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <p className="text-sm line-clamp-2">{item.text}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${getSentimentColor(item.sentiment)}`}>
                                {getSentimentIcon(item.sentiment)}
                                <span className="ml-1 capitalize">{item.sentiment}</span>
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {item.confidence.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnalysis(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(item.analyzed_at).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
