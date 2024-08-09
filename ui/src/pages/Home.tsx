import { Loading } from "../components/Loading";
import { GameCard } from "../components/GameCard";
import { Chunk } from "../lib/types";
import { SelectedGames } from "../components/SelectedGames";
import { useGameState } from "@/lib/gameState";
import { Layout } from "@/components/Layout";
import { SearchAndFilters } from "@/components/SearchAndFilters";
import { Recs } from "@/components/Recs";

export function Home() {
  const { shownGames, isLoading } = useGameState((state) => ({
    shownGames: state.shownGames,
    isLoading: state.isLoading,
  }));

  return (
    <Layout>
      <SearchAndFilters />
      <div className="flex gap-4">
        <div className="flex flex-col gap-4 mt-8 mb-[12rem]">
          {isLoading ? (
            <div className="flex justify-center items-center mt-12 col-span-4">
              <Loading />
            </div>
          ) : (
              shownGames?.map(({ chunk }: { chunk: Chunk }) => (
                <GameCard key={chunk.tracking_id} game={chunk} />
              ))
            )}
        </div>
        <div className="flex flex-col gap-4 mt-8 mb-[12rem]">
          <div className="bold text-2xl">
            Reccomended Games:
          </div>
          <Recs />
        </div>
      </div>
      <SelectedGames />
    </Layout>
  );
}
