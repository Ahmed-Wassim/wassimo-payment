import 'dotenv/config';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { loadConfig } from './config/configuration.ts';

const endpoint = loadConfig().observability.otlpEndpoint;

if (endpoint) {
  const sdk = new NodeSDK({
    serviceName: 'wassimo-payment',
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: endpoint }),
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-grpc': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          headersToSpanAttributes: {
            client: { requestHeaders: [], responseHeaders: [] },
            server: { requestHeaders: [], responseHeaders: [] },
          },
          redactedQueryParams: [
            'token',
            'secret',
            'key',
            'signature',
            'hmac',
            'access_token',
            'api_key',
            'apikey',
            'authorization',
            'auth',
            'password',
            'client_secret',
            'secret_key',
            'server_key',
          ],
          redactedQueryParamsServer: [
            'token',
            'secret',
            'key',
            'signature',
            'hmac',
            'access_token',
            'api_key',
            'apikey',
            'authorization',
            'auth',
            'password',
            'client_secret',
            'secret_key',
            'server_key',
          ],
        },
      }),
    ],
  });

  sdk.start();
  process.once('SIGINT', () => void sdk.shutdown());
  process.once('SIGTERM', () => void sdk.shutdown());
}
