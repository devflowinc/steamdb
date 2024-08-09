import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chunk } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { AsyncImage } from "loadable-image";
import { useGameState } from "@/lib/gameState";
import { GameModal } from "./GameModal";
import { GameScore } from "./Score";
import { format } from "date-fns";

export function GameCard({
  game,
  recommended,
}: {
  game: Chunk;
  recommended?: boolean;
}) {
  const { addGame, selectedGames } = useGameState((state) => ({
    addGame: state.addGame,
    selectedGames: state.selectedGames,
  }));
  {
    console.log(game);
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <AsyncImage
          src={game.metadata?.header_image}
          className="w-full h-[300px] object-cover rounded-t-lg"
          alt="Game Cover Art"
        />
        <Card className="w-full max-w-sm bg-card text-card-foreground shadow-lg cursor-pointer">
          <div className="relative">
            <div className="absolute top-4 left-4 bg-primary px-3 py-1 rounded-full text-primary-foreground text-sm font-medium">
              {[
                game.metadata?.windows && "Windows",
                game.metadata?.linux && "Linux",
                game.metadata?.mac && "Mac",
                game.metadata?.platforms?.mac && "Mac",
                game.metadata?.platforms?.windows && "Windows",
                game.metadata?.platforms?.linux && "Linux",
              ]
                .filter((a) => a)
                .join(", ")}
            </div>
            <GameScore game={game} />
          </div>
          <CardContent className="p-6 space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-2xl font-bold">{game.metadata?.name}</span>
              <p className="text-muted-foreground text-sm line-clamp-3">
                {game.metadata?.about_the_game ||
                  game.metadata?.detailed_description}
              </p>
              <div className="flex items-center gap-2 mt-2 justify-between">
                <span className="text-2xl font-bold">
                  ${game.metadata?.price}
                </span>
                <span className="text-muted-foreground text-sm">
                  {game.metadata?.genres?.join(", ")}
                </span>
              </div>
              <div className="text-muted-foreground text-sm mt-2">
                Release Date: {format(game.metadata.release_date, "dd/MM/yyyy")}
              </div>
            </div>
            {!recommended ? (
              <div className="flex gap-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    addGame(game);
                  }}
                  disabled={
                    !!selectedGames.find(
                      (g) => g.tracking_id === game.tracking_id
                    ) || selectedGames.length > 9
                  }
                >
                  Add Game
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </DialogTrigger>
      <GameModal game={game} recommended={recommended} />
    </Dialog>
  );
}
