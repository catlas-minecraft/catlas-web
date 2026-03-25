import { NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { makeHttpLive } from "../server.js";

const makeHttpLiveDev = Effect.gen(function* () {
  const host = yield* Config.string("HOST");
  const port = yield* Config.integer("PORT");

  return makeHttpLive({
    server: {
      host,
      port,
    },
  });
}).pipe(Layer.unwrapEffect);

NodeRuntime.runMain(Layer.launch(makeHttpLiveDev));
