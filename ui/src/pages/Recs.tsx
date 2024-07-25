import { GameCard } from "@/components/GameCard";
import { useGameState } from "@/lib/gameState";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
export const Recs = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { getRecommendedGames, recommendedGames } = useGameState((state) => ({
    getRecommendedGames: state.getRecommendedGames,
    recommendedGames: state.recommendedGames,
  }));

  useEffect(() => {
    if (!params) {
      navigate("/");
    } else {
      const gamesRecommendedInUrl = new URLSearchParams(params)
        .get("games")
        ?.split(",") as string[];
      getRecommendedGames(gamesRecommendedInUrl);
    }
  }, []);

  return (
    <div className="container my-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {recommendedGames?.map((r) => (
          <GameCard recommended key={r.tracking_id} game={r}></GameCard>
        ))}
      </div>
    </div>
  );
};
