import fs from 'fs/promises';
import path from 'path';
import { QuestionSet, KnowledgeArea } from './types';

// Database paths
const DB_DIR = path.join(process.cwd(), 'data', 'db');
const QUESTION_SETS_FILE = path.join(DB_DIR, 'question-sets.json');
const KNOWLEDGE_AREAS_FILE = path.join(DB_DIR, 'knowledge-areas.json');

// Initialize database directory and files
async function initDB() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });

    // Initialize question sets file if it doesn't exist
    try {
      await fs.access(QUESTION_SETS_FILE);
    } catch {
      await fs.writeFile(QUESTION_SETS_FILE, JSON.stringify([]));
    }

    // Initialize knowledge areas file if it doesn't exist
    try {
      await fs.access(KNOWLEDGE_AREAS_FILE);
    } catch {
      await fs.writeFile(KNOWLEDGE_AREAS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Question Sets CRUD operations
export async function createQuestionSet(questionSet: QuestionSet): Promise<QuestionSet> {
  await initDB();
  const sets = await getAllQuestionSets();
  sets.push(questionSet);
  await fs.writeFile(QUESTION_SETS_FILE, JSON.stringify(sets, null, 2));
  return questionSet;
}

export async function getQuestionSet(id: string): Promise<QuestionSet | null> {
  await initDB();
  const sets = await getAllQuestionSets();
  return sets.find(set => set.id === id) || null;
}

export async function getAllQuestionSets(): Promise<QuestionSet[]> {
  await initDB();
  try {
    const data = await fs.readFile(QUESTION_SETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getPublicQuestionSets(): Promise<QuestionSet[]> {
  const sets = await getAllQuestionSets();
  return sets.filter(set => set.isPublic);
}

export async function getUserQuestionSets(userId: string): Promise<QuestionSet[]> {
  const sets = await getAllQuestionSets();
  return sets.filter(set => set.userId === userId || !set.userId);
}

export async function updateQuestionSet(id: string, updates: Partial<QuestionSet>): Promise<QuestionSet | null> {
  await initDB();
  const sets = await getAllQuestionSets();
  const index = sets.findIndex(set => set.id === id);

  if (index === -1) return null;

  sets[index] = { ...sets[index], ...updates, updatedAt: new Date().toISOString() };
  await fs.writeFile(QUESTION_SETS_FILE, JSON.stringify(sets, null, 2));
  return sets[index];
}

export async function deleteQuestionSet(id: string): Promise<boolean> {
  await initDB();
  const sets = await getAllQuestionSets();
  const filteredSets = sets.filter(set => set.id !== id);

  if (filteredSets.length === sets.length) return false;

  await fs.writeFile(QUESTION_SETS_FILE, JSON.stringify(filteredSets, null, 2));
  return true;
}

// Knowledge Areas CRUD operations
export async function createKnowledgeArea(area: KnowledgeArea): Promise<KnowledgeArea> {
  await initDB();
  const areas = await getAllKnowledgeAreas();
  areas.push(area);
  await fs.writeFile(KNOWLEDGE_AREAS_FILE, JSON.stringify(areas, null, 2));
  return area;
}

export async function getKnowledgeArea(id: string): Promise<KnowledgeArea | null> {
  await initDB();
  const areas = await getAllKnowledgeAreas();
  return areas.find(area => area.id === id) || null;
}

export async function getAllKnowledgeAreas(): Promise<KnowledgeArea[]> {
  await initDB();
  try {
    const data = await fs.readFile(KNOWLEDGE_AREAS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getPublicKnowledgeAreas(): Promise<KnowledgeArea[]> {
  const areas = await getAllKnowledgeAreas();
  return areas.filter(area => area.isPublic);
}

export async function searchKnowledgeAreas(query: string, subject?: string): Promise<KnowledgeArea[]> {
  const areas = await getAllKnowledgeAreas();
  return areas.filter(area => {
    const matchesQuery = area.name.toLowerCase().includes(query.toLowerCase()) ||
                        area.description.toLowerCase().includes(query.toLowerCase()) ||
                        area.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    const matchesSubject = !subject || area.subject === subject;
    return matchesQuery && matchesSubject && area.isPublic;
  });
}

export async function updateKnowledgeArea(id: string, updates: Partial<KnowledgeArea>): Promise<KnowledgeArea | null> {
  await initDB();
  const areas = await getAllKnowledgeAreas();
  const index = areas.findIndex(area => area.id === id);

  if (index === -1) return null;

  areas[index] = { ...areas[index], ...updates };
  await fs.writeFile(KNOWLEDGE_AREAS_FILE, JSON.stringify(areas, null, 2));
  return areas[index];
}

export async function deleteKnowledgeArea(id: string): Promise<boolean> {
  await initDB();
  const areas = await getAllKnowledgeAreas();
  const filteredAreas = areas.filter(area => area.id !== id);

  if (filteredAreas.length === areas.length) return false;

  await fs.writeFile(KNOWLEDGE_AREAS_FILE, JSON.stringify(filteredAreas, null, 2));
  return true;
}

// Utility function to generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
