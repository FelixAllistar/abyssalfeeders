import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Character {
  id: number;
  name: string;
}

interface CharacterIdInputProps {
  onCharacterLookup: (character: Character) => void;
  isProcessing: boolean;
}

export function CharacterIdInput({ onCharacterLookup, isProcessing }: CharacterIdInputProps) {
  const [characterId, setCharacterId] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    const id = parseInt(characterId);
    
    if (!id || isNaN(id)) {
      setError("Please enter a valid character ID");
      return;
    }

    setError("");
    setIsLookingUp(true);

    try {
      const response = await fetch("/api/lookup-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ characterId: id }),
      });

      const data = await response.json();
      
      if (data.length > 0 && data[0].category === "character") {
        onCharacterLookup({
          id: data[0].id,
          name: data[0].name,
        });
        setCharacterId("");
      } else {
        setError("Character not found");
      }
    } catch (error) {
      console.error("Lookup failed:", error);
      setError("Failed to lookup character");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup();
    }
  };

  return (
    <div className="w-full max-w-md space-y-2">
      <Label htmlFor="character-id">Character ID</Label>
      <div className="flex gap-2">
        <Input
          id="character-id"
          type="number"
          placeholder="Enter character ID..."
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isProcessing || isLookingUp}
          className="flex-1"
        />
        <Button
          onClick={handleLookup}
          disabled={isProcessing || isLookingUp || !characterId}
          variant="secondary"
        >
          {isLookingUp ? "Looking up..." : "Lookup"}
        </Button>
      </div>
      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}