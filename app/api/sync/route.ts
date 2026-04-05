import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  saveQuestionSetToCloud,
  getAllQuestionSetsFromCloud,
  deleteQuestionSetFromCloud,
  saveSessionHistoryToCloud,
  getSessionHistoryFromCloud,
  saveActiveSessionToCloud,
  getActiveSessionFromCloud,
  deleteActiveSessionFromCloud,
} from '@/lib/cloudStorage';

// GET: Pull all data from cloud
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const type = request.nextUrl.searchParams.get('type') || 'question-sets';

  try {
    if (type === 'question-sets') {
      const sets = await getAllQuestionSetsFromCloud(userId);
      return NextResponse.json({ questionSets: sets });
    } else if (type === 'session-history') {
      const history = await getSessionHistoryFromCloud(userId);
      return NextResponse.json({ sessionHistory: history });
    } else if (type === 'active-session') {
      const session = await getActiveSessionFromCloud(userId);
      return NextResponse.json({ activeSession: session });
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Push data to cloud
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { type, data } = body;

  try {
    if (type === 'question-set') {
      await saveQuestionSetToCloud(userId, data);
      return NextResponse.json({ success: true });
    } else if (type === 'session-history') {
      await saveSessionHistoryToCloud(userId, data);
      return NextResponse.json({ success: true });
    } else if (type === 'active-session') {
      await saveActiveSessionToCloud(userId, data);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove data from cloud
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const setId = request.nextUrl.searchParams.get('setId');
  const deleteType = request.nextUrl.searchParams.get('type');

  try {
    if (deleteType === 'active-session') {
      await deleteActiveSessionFromCloud(userId);
      return NextResponse.json({ success: true });
    }

    if (!setId) {
      return NextResponse.json({ error: 'setId required' }, { status: 400 });
    }

    await deleteQuestionSetFromCloud(userId, setId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sync DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
