export function reportError(error: Error, context?: Record<string, any>) {
  console.error('[EvidLY Error]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });
}
