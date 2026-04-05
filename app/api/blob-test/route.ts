import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

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

  // Test put with private access
  try {
    const blob = await put('test/ping.txt', 'hello', {
      access: 'private',
      addRandomSuffix: false,
      token,
    });
    diagnostics.putWorks = true;
    diagnostics.putUrl = blob.url;

    // Clean up test blob
    await del(blob.url, { token });
    diagnostics.deleteWorks = true;
  } catch (e: any) {
    diagnostics.putWorks = false;
    diagnostics.putError = e.message;
  }

  return NextResponse.json(diagnostics);
}
