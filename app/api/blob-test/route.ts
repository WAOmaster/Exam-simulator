import { NextRequest, NextResponse } from 'next/server';
import { put, list, del, get } from '@vercel/blob';

export async function GET(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const scan = request.nextUrl.searchParams.get('scan');

  // ── Store scan: inspect how many distinct user namespaces exist and how many
  // question sets each one holds. Used to diagnose cross-device sync (if one
  // human account is split across several userId folders, token.sub is unstable).
  if (scan === 'users') {
    const diagnostics: Record<string, unknown> = { tokenExists: !!token };
    try {
      // Top-level user folders: users/{userId}/
      const folded = await list({ prefix: 'users/', mode: 'folded', token });
      const userFolders = folded.folders || [];
      const users: Array<Record<string, unknown>> = [];

      for (const folder of userFolders) {
        // folder looks like "users/{userId}/"
        const userId = folder.replace(/^users\//, '').replace(/\/$/, '');
        const setsPrefix = `users/${userId}/question-sets/`;
        const setIds: string[] = [];
        let cursor: string | undefined;
        do {
          const r = await list({ prefix: setsPrefix, cursor, token });
          for (const b of r.blobs) {
            const m = b.pathname.match(/question-sets\/(.+)\.json$/);
            if (m) setIds.push(m[1]);
          }
          cursor = r.hasMore ? r.cursor : undefined;
        } while (cursor);

        // Detect presence of session-history / active-session for this user
        const meta = await list({ prefix: `users/${userId}/`, mode: 'folded', token });
        const rootFiles = (meta.blobs || []).map((b) => b.pathname.split('/').pop());

        users.push({
          userId,
          questionSetCount: setIds.length,
          setIds,
          rootFiles,
        });
      }

      diagnostics.userNamespaceCount = userFolders.length;
      diagnostics.users = users;
      return NextResponse.json(diagnostics);
    } catch (e: any) {
      diagnostics.scanError = e.message;
      return NextResponse.json(diagnostics, { status: 500 });
    }
  }

  // ── Default: round-trip put/get/del health check ──────────────────────────
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

  // Test put with private access (overwrite-safe), twice, to exercise the
  // same overwrite path the sync route uses.
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

    // Second put to same path verifies allowOverwrite resolves the v2 throw.
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
