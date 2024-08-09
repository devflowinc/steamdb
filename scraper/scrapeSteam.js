import { ArgumentParser } from "argparse";
import { createClient } from "redis";
import { doRequest, log, parseSteamGame } from "./utils.js";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  ERROR,
  EXCEPTION,
} from "./consts.js";

let redisClient = null;

async function steamRequest(
  appID,
  retryTime,
  successRequestCount,
  errorRequestCount,
  retries,
  currency = DEFAULT_CURRENCY,
  language = DEFAULT_LANGUAGE
) {
  const url = "http://store.steampowered.com/api/appdetails/";
  const response = await doRequest(
    url,
    { appids: appID, cc: currency, l: language },
    retryTime,
    successRequestCount,
    errorRequestCount,
    retries
  );

  if (response) {
    try {
      const data = response.data;
      const app = data[appID];
      if (
        !app.success ||
        app.data.type !== "game" ||
        (app.data.is_free === false &&
          app.data.price_overview &&
          app.data.price_overview.final_formatted === "") ||
        (app.data.developers && app.data.developers.length === 0)
      ) {
        return null;
      } else {
        return app.data;
      }
    } catch (error) {
      log(
        EXCEPTION,
        `An exception of type ${error.name} occurred. Traceback: ${error.stack}`
      );
      return null;
    }
  } else {
    log(ERROR, "Bad response");
    return null;
  }
}

async function steamSpyRequest(
  appID,
  retryTime,
  successRequestCount,
  errorRequestCount,
  retries
) {
  const url = `https://steamspy.com/api.php?request=appdetails&appid=${appID}`;
  const response = await doRequest(
    url,
    null,
    retryTime,
    successRequestCount,
    errorRequestCount,
    retries
  );

  if (response) {
    try {
      const data = response.data;
      if (data.developer !== "") {
        return data;
      } else {
        return null;
      }
    } catch (error) {
      log(
        EXCEPTION,
        `An exception of type ${error.name} occurred. Traceback: ${error.stack}`
      );
      return null;
    }
  } else {
    log(ERROR, "Bad response");
    return null;
  }
}

(async () => {
  const parser = new ArgumentParser({
    description: "Steam games scraper",
  });

  parser.add_argument("-R", "--redis-uri", {
    type: "str",
    required: true,
    help: "Full redis uri ex: redis://127.0.0.1",
  });

  const args = parser.parse_args();

  redisClient = await createClient({
    url: args.redis_uri,
  }).connect();

  let successRequestCount = 0;
  let errorRequestCount = 0;
  while (true) {
    await new Promise((res) => setTimeout(res, args.sleep * 1500));
    const { element } = await redisClient.brPop("appsToVisit", 0, 0);
    const appID = element;
    if (
      !(await redisClient.hExists("dataset", appID)) &&
      !(await redisClient.sIsMember("discarted", appID))
    ) {
      if (args.released && (await redisClient.sIsMember("notreleased", appID)))
        continue;
      const app = await steamRequest(
        appID.toString(),
        Math.min(10, args.sleep ?? 120),
        successRequestCount,
        errorRequestCount,
        args.retries || 10
      );
      if (app && app.ratings?.steam_germany?.banned !== "1") {
        const game = parseSteamGame(app);
        if (game.release_date !== "") {
          const extra = await steamSpyRequest(
            appID.toString(),
            Math.min(4, args.sleep),
            successRequestCount,
            errorRequestCount,
            args.retries
          );

          if (extra) {
            Object.assign(game, {
              user_score: extra.userscore,
              score_rank: extra.score_rank,
              positive: extra.positive,
              negative: extra.negative,
              estimated_owners: extra.owners
                .replace(/,/g, "")
                .replace("..", "-"),
              average_playtime_forever: extra.average_forever,
              average_playtime_2weeks: extra.average_2weeks,
              median_playtime_forever: extra.median_forever,
              median_playtime_2weeks: extra.median_2weeks,
              peak_ccu: extra.ccu,
              tags: extra.tags,
            });
          } else {
            Object.assign(game, {
              user_score: 0,
              score_rank: "",
              positive: 0,
              negative: 0,
              estimated_owners: "0 - 0",
              average_playtime_forever: 0,
              average_playtime_2weeks: 0,
              median_playtime_forever: 0,
              median_playtime_2weeks: 0,
              peak_ccu: 0,
              tags: [],
            });
          }

          console.log("setting ", appID);
          await redisClient.hSet("dataset", appID, JSON.stringify(game));
          await redisClient.hSet("dataset", appID, JSON.stringify(game));
          await redisClient.lPush("newGames", appID);

          if (await redisClient.sIsMember("notreleased", appID)) {
            await redisClient.sRem("notreleased", appID);
          }
        } else {
          if (!(await redisClient.sIsMember("notreleased", appID))) {
            await redisClient.sIsMember("notreleased", appID);
            await redisClient.sAdd("notreleased", appID);
          }
        }
      } else {
        await redisClient.sAdd("discarted", appID);
      }
    }
  }
})();
