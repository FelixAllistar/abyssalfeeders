import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProcessingResult {
  characterId: number;
  characterName: string;
  totalValue: number;
  killmailCount: number;
}

interface ProcessingStatusProps {
  isProcessing: boolean;
  result?: ProcessingResult;
  error?: string;
}

export function ProcessingStatus({ isProcessing, result, error }: ProcessingStatusProps) {
  if (!isProcessing && !result && !error) {
    return null;
  }

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

  return (
    <Card className={cn(
      "mt-4",
      isProcessing && "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10",
      result && "border-green-500/50 bg-green-50/50 dark:bg-green-900/10",
      error && "border-red-500/50 bg-red-50/50 dark:bg-red-900/10"
    )}>
      <CardContent className="pt-6">
        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <div className="font-medium">Processing character...</div>
              <div className="text-sm text-muted-foreground">
                Fetching killmail data from Zkillboard
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="font-medium text-green-700 dark:text-green-300">
                Successfully processed!
              </div>
            </div>
            
            <div className="bg-card/50 rounded-lg p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  <img
                    src={`/api/character-image/${result.characterId}`}
                    alt={`${result.characterName} portrait`}
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
                  <div className="font-medium text-base">{result.characterName}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {result.characterId}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Value:</span>
                  <span className="font-bold">{formatValue(result.totalValue)} ISK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Killmails:</span>
                  <span>{result.killmailCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-red-700 dark:text-red-300">
                Processing failed
              </div>
              <div className="text-sm text-muted-foreground">
                {error}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}