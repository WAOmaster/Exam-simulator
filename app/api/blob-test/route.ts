import { NextResponse } from 'next/server';
import { put, list, del, get } from '@vercel/blob';

// Lightweight, unauthenticated health check for the Vercel Blob store.
// Verifies the token works and that put (incl. overwrite), get, and del
// all succeed. Writes only to a throwaway test/ path.
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const diagnostics: Record<string, unknown> = {
    tokenExists: !!token,
    tokenLength: token?.length,
    tokenPrefix: token?.substring(0, 20),
  };

  // Test list
  try {
    const result = await list({ prefix: 'test/', token });
    diagnostics.listWorks = true;
    diagnostics.listBlobCount = result.blobs.length;
  } catch (e: any) {
    diagnostics.listWorks = false;
    diagnostics.listError = e.message;
  }

  // Test put with private access, twice, to exercise the same overwrite path
  // the sync route uses (v2 throws on overwrite unless allowOverwrite is set).
  try {
    const opts = {
      access: 'private' as const,
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    };
    const blob = await put('test/ping.txt', 'hello', opts);
    diagnostics.putWorks = true;
    diagnostics.putUrl = blob.url;

    try {
      await put('test/ping.txt', 'hello-again', opts);
      diagnostics.overwriteWorks = true;
    } catch (e: any) {
      diagnostics.overwriteWorks = false;
      diagnostics.overwriteError = e.message;
    }

    // Test get (read private blob)
    try {
      const result = await get(blob.url, { access: 'private', token });
      if (result) {
        const text = await new Response(result.stream).text();
        diagnostics.getWorks = true;
        diagnostics.getContent = text;
      } else {
        diagnostics.getWorks = false;
        diagnostics.getError = 'get returned null';
      }
    } catch (e: any) {
      diagnostics.getWorks = false;
      diagnostics.getError = e.message;
    }

    // Clean up test blob
    await del(blob.url, { token });
    diagnostics.deleteWorks = true;
  } catch (e: any) {
    diagnostics.putWorks = false;
    diagnostics.putError = e.message;
  }

  return NextResponse.json(diagnostics);
}
