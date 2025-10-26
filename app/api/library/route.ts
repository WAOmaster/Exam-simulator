import { NextRequest, NextResponse } from 'next/server';
import {
  getAllQuestionSets,
  getQuestionSet,
  createQuestionSet,
  updateQuestionSet,
  deleteQuestionSet,
  getUserQuestionSets,
  getPublicQuestionSets,
} from '@/lib/db';
import { QuestionSet } from '@/lib/types';

// GET: Fetch question sets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const publicOnly = searchParams.get('public') === 'true';

    if (id) {
      // Get specific question set
      const questionSet = await getQuestionSet(id);
      if (!questionSet) {
        return NextResponse.json(
          { error: 'Question set not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(questionSet);
    } else if (userId) {
      // Get user's question sets
      const questionSets = await getUserQuestionSets(userId);
      return NextResponse.json(questionSets);
    } else if (publicOnly) {
      // Get public question sets
      const questionSets = await getPublicQuestionSets();
      return NextResponse.json(questionSets);
    } else {
      // Get all question sets
      const questionSets = await getAllQuestionSets();
      return NextResponse.json(questionSets);
    }
  } catch (error: any) {
    console.error('Error fetching question sets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch question sets' },
      { status: 500 }
    );
  }
}

// POST: Create new question set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questionSet: QuestionSet = body;

    // Validate required fields
    if (!questionSet.title || !questionSet.questions || questionSet.questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title and questions' },
        { status: 400 }
      );
    }

    const createdSet = await createQuestionSet(questionSet);
    return NextResponse.json(createdSet, { status: 201 });
  } catch (error: any) {
    console.error('Error creating question set:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create question set' },
      { status: 500 }
    );
  }
}

// PUT: Update question set
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Question set ID is required' },
        { status: 400 }
      );
    }

    const updatedSet = await updateQuestionSet(id, updates);
    if (!updatedSet) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSet);
  } catch (error: any) {
    console.error('Error updating question set:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update question set' },
      { status: 500 }
    );
  }
}

// DELETE: Delete question set
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Question set ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteQuestionSet(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting question set:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete question set' },
      { status: 500 }
    );
  }
}
