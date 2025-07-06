import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CharacterSearch } from "./components/CharacterSearch";
import { CharacterIdInput } from "./components/CharacterIdInput";
import { Leaderboard } from "./components/Leaderboard";
import { ProcessingStatus } from "./components/ProcessingStatus";
import "./index.css";

interface Character {
  id: number;
  name: string;
}

interface ProcessingResult {
  characterId: number;
  characterName: string;
  totalValue: number;
  killmailCount: number;
}

export function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | undefined>();
  const [processingError, setProcessingError] = useState<string | undefined>();
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [searchMethod, setSearchMethod] = useState<'search' | 'id'>('search');

  const processCharacter = async (character: Character) => {
    setIsProcessing(true);
    setProcessingResult(undefined);
    setProcessingError(undefined);

    try {
      const response = await fetch('/api/process-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: character.id,
          characterName: character.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process character');
      }

      const result = await response.json();
      setProcessingResult(result);
      setLeaderboardRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 relative z-10 min-h-screen flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Abyssal Feeders
        </h1>
        <p className="text-muted-foreground">
          Track EVE Online character killmail values in abyssal space
        </p>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-2" />
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 h-fit">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-primary/3 rounded-lg pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-4">
                <span className="text-foreground">Add Character</span>
                <div className="flex bg-muted/50 rounded-lg p-1 backdrop-blur-sm">
                  <Button
                    variant={searchMethod === 'search' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSearchMethod('search')}
                    disabled={isProcessing}
                    className="relative overflow-hidden"
                  >
                    <span className="relative z-10">Search</span>
                    {searchMethod === 'search' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/70 opacity-80" />
                    )}
                  </Button>
                  <Button
                    variant={searchMethod === 'id' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSearchMethod('id')}
                    disabled={isProcessing}
                    className="relative overflow-hidden"
                  >
                    <span className="relative z-10">ID</span>
                    {searchMethod === 'id' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/70 opacity-80" />
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              {searchMethod === 'search' ? (
                <CharacterSearch 
                  onCharacterSelect={processCharacter}
                  isProcessing={isProcessing}
                />
              ) : (
                <CharacterIdInput 
                  onCharacterLookup={processCharacter}
                  isProcessing={isProcessing}
                />
              )}
              
              <ProcessingStatus 
                isProcessing={isProcessing}
                result={processingResult}
                error={processingError}
              />
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Leaderboard refreshTrigger={leaderboardRefresh} />
        </div>
      </div>
    </div>
  );
}

export default App;
