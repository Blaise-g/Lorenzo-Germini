export function GET(request: Request) {
  return new Response(null, {
    status: 301,
    headers: {
      Location: new URL("/cv", request.url).pathname,
    },
  });
}
