import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { saveShare, getSharesForUser, deleteShareBlob } from '@/lib/cloudStorage';
import { SharedQuestionSet } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { questionSet, recipientEmail } = body;

    if (!questionSet || !recipientEmail) {
      return NextResponse.json({ error: 'questionSet and recipientEmail are required' }, { status: 400 });
    }

    const email = recipientEmail.toLowerCase().trim();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (email === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    const share: SharedQuestionSet = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionSet,
      sharedByEmail: session.user.email.toLowerCase(),
      sharedByName: session.user.name || session.user.email,
      sharedWithEmail: email,
      sharedAt: new Date().toISOString(),
    };

    await saveShare(share);
    return NextResponse.json({ success: true, shareId: share.id });
  } catch (error: any) {
    console.error('Error creating share:', error);
    return NextResponse.json({ error: error.message || 'Failed to share question set' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shares = await getSharesForUser(session.user.email.toLowerCase());
    return NextResponse.json({ success: true, shares });
  } catch (error: any) {
    console.error('Error fetching shares:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch shares' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    await deleteShareBlob(shareId, session.user.email.toLowerCase());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting share:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete share' }, { status: 500 });
  }
}
