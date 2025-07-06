import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_value: number;
  last_updated: string;
}

interface LeaderboardProps {
  refreshTrigger: number;
}

export function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    try {
      setError("");
      const response = await fetch("/api/leaderboard");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setError("Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger]);

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl shadow-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-primary/3 rounded-lg pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-foreground">Abyssal Feederboard</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center py-8">
            <div className="animate-pulse">Loading leaderboard...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl shadow-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-primary/3 rounded-lg pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-foreground">Abyssal Feederboard</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center py-8">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={fetchLeaderboard} variant="outline" className="border-border/50 hover:bg-primary/10">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between relative">
        <CardTitle className="text-foreground">Abyssal Feederboard</CardTitle>
        <Button
          onClick={fetchLeaderboard}
          variant="outline"
          size="sm"
          className="border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="relative">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No characters processed yet. Add a character to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.character_id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 relative overflow-hidden ${
                  index === 0 ? 'bg-accent/10 border-accent/30 hover:bg-accent/15 hover:border-accent/40' :
                  index === 1 ? 'bg-primary/10 border-primary/30 hover:bg-primary/15 hover:border-primary/40' :
                  index === 2 ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15 hover:border-purple-500/40' :
                  'bg-muted/20 border-border/30 hover:bg-muted/30 hover:border-primary/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/8 to-primary/4 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm ${index === 0 ? 'bg-gradient-to-r from-accent to-accent/60 rank-champion' :
                    index === 1 ? 'bg-gradient-to-r from-primary to-primary/60 rank-elite' :
                      index === 2 ? 'bg-gradient-to-r from-purple-400 to-purple-600 rank-veteran' :
                        'bg-primary/70'
                    }`}>
                    {index + 1}
                  </div>
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 bg-muted flex items-center justify-center shadow-lg ${
                    index === 0 ? 'border-accent/50' :
                    index === 1 ? 'border-primary/50' :
                    index === 2 ? 'border-purple-500/50' :
                    'border-primary/30'
                  }`}>
                    <img
                      src={`/api/character-image/${entry.character_id}`}
                      alt={`${entry.character_name} portrait`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Replace failed image with placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-xs text-muted-foreground text-center">
                      No Image
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{entry.character_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {entry.character_id}
                    </div>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <div className="font-bold text-lg text-primary">
                    {formatValue(entry.total_value)} ISK
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updated: {formatDate(entry.last_updated)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
