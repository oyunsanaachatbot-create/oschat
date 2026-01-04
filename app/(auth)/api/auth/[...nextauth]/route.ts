// app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs';

export async function GET() {
  return new Response('Not found', { status: 404 });
}

export async function POST() {
  return new Response('Not found', { status: 404 });
}
