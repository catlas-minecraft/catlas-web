import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Config, Layer } from "effect";
import * as Option from "effect/Option";

const otelConfig = Config.all({
  enabled: Config.withDefault(Config.boolean("OTEL_ENABLED"), false),
  tracesEndpoint: Config.option(Config.string("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")),
  endpoint: Config.option(Config.string("OTEL_EXPORTER_OTLP_ENDPOINT")),
  tracesHeaders: Config.option(Config.string("OTEL_EXPORTER_OTLP_TRACES_HEADERS")),
  headers: Config.option(Config.string("OTEL_EXPORTER_OTLP_HEADERS")),
});

const parseHeaders = (value: string): Record<string, string> =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .reduce<Record<string, string>>((headers, entry) => {
      if (entry.length === 0) {
        return headers;
      }

      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return headers;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const headerValue = entry.slice(separatorIndex + 1).trim();

      if (key.length === 0 || headerValue.length === 0) {
        return headers;
      }

      headers[key] = headerValue;
      return headers;
    }, {});

const appendTracePath = (baseUrl: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return new URL("v1/traces", normalizedBase).toString();
};

const resolveOption = <A>(primary: Option.Option<A>, fallback: Option.Option<A>) =>
  Option.getOrUndefined(primary.pipe(Option.orElse(() => fallback)));

export const OtelLive = Layer.unwrapEffect(
  Config.map(otelConfig, ({ enabled, tracesEndpoint, endpoint, tracesHeaders, headers }) =>
    enabled
      ? NodeSdk.layer(() => ({
          spanProcessor: new BatchSpanProcessor(
            new OTLPTraceExporter(
              (() => {
                const url = resolveOption(
                  tracesEndpoint,
                  endpoint.pipe(Option.map(appendTracePath)),
                );
                const rawHeaders = resolveOption(tracesHeaders, headers);
                const config: {
                  url?: string;
                  headers?: Record<string, string>;
                } = {};

                if (url !== undefined) {
                  config.url = url;
                }

                if (rawHeaders !== undefined) {
                  config.headers = parseHeaders(rawHeaders);
                }

                return config;
              })(),
            ),
          ),
        }))
      : Layer.empty,
  ),
);
