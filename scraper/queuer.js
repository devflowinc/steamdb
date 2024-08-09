import { createClient } from "redis";
import { ArgumentParser } from "argparse";
import {
  DEFAULT_SLEEP,
  DEFAULT_RETRIES,
  INFO,
  ERROR,
  EXCEPTION,
} from "./consts.js";
import { log, doRequest, shuffle } from "./utils.js";

let redisClient = null;

async function scraper(args) {
  let apps = [];
  const exists = await redisClient.exists("appsToVisit");
  if (!exists) {
    log(INFO, "Requesting list of games from Steam");
    const response = await doRequest(
      "http://api.steampowered.com/ISteamApps/GetAppList/v2/"
    );
    if (response) {
      await new Promise((res) => setTimeout(res, args.sleep * 1000));
      const data = response.data;
      apps = data.applist.apps.map((app) => app.appid.toString());
    }
  } else {
    const appsFromRedis = await redisClient.lRange("appsToVisit", 0, -1);
    log(INFO, `Found ${appsFromRedis.length} apps on redis`);
    apps = appsFromRedis;
  }
  if (apps.length > 0) {
    shuffle(apps);

    await redisClient.lPush("appsToVisit", apps);
  } else {
    log(ERROR, "Error requesting list of games");
    process.exit();
  }
}

(async () => {
  const parser = new ArgumentParser({
    description: "Steam games scraper",
  });

  parser.add_argument("-s", "--sleep", {
    type: "float",
    default: DEFAULT_SLEEP,
    help: "Waiting time between requests",
  });
  parser.add_argument("-r", "--retries", {
    type: "int",
    default: DEFAULT_RETRIES,
    help: "Number of retries (0 to always retry)",
  });
  parser.add_argument("-d", "--released", {
    default: true,
    help: "If it is on the list of not yet released, no information is requested",
  });
  parser.add_argument("-p", "--steamspy", {
    type: "str",
    default: true,
    help: "Add SteamSpy info",
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

  if (args.h || args.help) {
    parser.print_help();
    process.exit();
  }

  try {
    await scraper(args);
  } catch (error) {
    log(
      EXCEPTION,
      `An exception of type ${error.name} occurred. Traceback: ${error.stack} ${error}`
    );
  }
  process.exit(0) // if you don't close yourself this will run forever
})();
