# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A universal AI-powered exam generator that creates custom practice questions from any subject matter. Users can upload files (PDF, DOCX, Excel), scrape web content, or use AI search to generate exam questions with detailed explanations powered by Google Gemini.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with CSS variables
- **State Management**: Zustand (with persist middleware)
- **AI Integration**: Google Gemini API (gemini-2.5-flash)
- **Theming**: React Context with localStorage persistence
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **File Parsing**: mammoth.js (DOCX), pdf-parse (PDF), xlsx (Excel)
- **Web Scraping**: cheerio

## Development Commands

### Setup
```bash
npm install
```

### Environment Configuration
Create `.env.local` file:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```
Get your free Gemini API key from https://makersuite.google.com/app/apikey

### Development
```bash
npm run dev
```
Runs on http://localhost:3000

### Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Architecture

### File Structure
```
├── app/
│   ├── api/
│   │   ├── ai/explain/       # AI explanation endpoint
│   │   ├── generate/         # Question generation endpoint
│   │   ├── upload/           # File upload & parsing
│   │   ├── scrape/           # URL content extraction
│   │   └── library/          # Question set CRUD
│   ├── exam/                 # Exam mode page
│   ├── practice/             # Practice mode page
│   ├── generate/             # Question generation page
│   ├── library/              # Saved question sets library
│   ├── results/              # Results & analytics page
│   └── page.tsx              # Home page
├── components/
│   ├── FileUploader.tsx      # Drag-drop file upload
│   ├── URLInput.tsx          # Multi-URL input
│   ├── GenerationControls.tsx # Question gen settings
│   ├── QuestionPreview.tsx   # Preview generated questions
│   ├── SaveDialog.tsx        # Save with consent modal
│   ├── QuestionSetCard.tsx   # Library card display
│   ├── QuestionCard.tsx      # Question display
│   ├── Timer.tsx             # Countdown timer
│   ├── ProgressBar.tsx       # Progress indicator
│   ├── EvaluationPane.tsx    # AI explanation panel
│   └── ThemeSwitcher.tsx     # Theme controls
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── types.ts              # TypeScript interfaces
│   ├── db.ts                 # JSON file-based storage
│   ├── questionGenerator.ts  # AI generation logic
│   ├── scraper.ts            # Web scraping utility
│   ├── theme-context.tsx     # Theme provider
│   └── parsers/
│       └── index.ts          # File parsing (PDF, DOCX, Excel)
└── data/
    ├── db/                   # JSON storage directory
    │   ├── question-sets.json
    │   └── knowledge-areas.json
    └── questions.json        # Legacy questions (optional)
```

### State Management (`lib/store.ts`)
- Zustand store with localStorage persistence
- Manages exam state: questions, answers, timer, progress
- Tracks user answers with timestamps and correctness
- Calculates scores and percentages
- **NEW**: Supports multiple question sets and library management

### API Routes

#### `/api/generate` - Question Generation
- Accepts: content source, generation config
- Returns: Generated questions with metadata
- Supports: file content, URL scraping, search, manual text
- Features: Batch generation for large sets (>25 questions)

#### `/api/upload` - File Upload & Parsing
- Accepts: PDF, DOCX, XLSX, TXT files (max 10MB)
- Returns: Extracted text content
- Parsers: pdf-parse, mammoth, xlsx

#### `/api/scrape` - URL Content Extraction
- Accepts: Single URL or array of URLs
- Returns: Cleaned, extracted text content
- Features: Removes navigation, ads, scripts

#### `/api/library` - Question Set Management
- GET: Fetch question sets (all, by ID, by user, public only)
- POST: Create new question set
- PUT: Update existing question set
- DELETE: Remove question set

#### `/api/ai/explain` - AI Explanations
- Accepts: question, options, correct/user answer
- Returns: Gemini-generated explanation
- Different prompts for correct vs incorrect answers

### Key Pages

1. **Home (`/`)**
   - Quick actions: Generate Questions, My Library
   - Exam setup with mode selection and timer options
   - Duration selection (30/60/90/120 min)

2. **Generate (`/generate`)**
   - 4 input methods: Upload File, Fetch URL, Search Knowledge, Paste Text
   - Generation controls: quantity, difficulty, types, topic focus
   - Live question preview
   - Save to library or start immediately

3. **Library (`/library`)**
   - Browse saved question sets
   - Search and filter by subject
   - View metadata and statistics
   - Start exam or delete sets

4. **Exam (`/exam`)** - Traditional exam mode with submission

5. **Practice (`/practice`)** - Instant feedback mode

6. **Results (`/results`)** - Score breakdown and analytics

### Components

**Input Components:**
- `FileUploader` - Drag-drop file upload with progress
- `URLInput` - Multi-URL input with validation
- `GenerationControls` - Comprehensive generation settings

**Display Components:**
- `QuestionCard` - Question display with selectable options
- `QuestionPreview` - Preview generated questions
- `QuestionSetCard` - Library card with metadata

**Modals & Dialogs:**
- `SaveDialog` - Save with sharing consent
- `EvaluationPane` - Side panel for AI explanations

**Utility Components:**
- `Timer` - Countdown timer with color-coded warnings
- `ProgressBar` - Visual progress indicator
- `ThemeSwitcher` - Dark/light mode and color theme picker

### Theming System (`lib/theme-context.tsx`)
- Theme modes: Light and Dark
- Color themes: Blue (default), Purple, Green, Orange, Pink
- Automatic system preference detection
- Persistent preferences in localStorage
- Smooth transitions between themes
- CSS custom properties for dynamic theming

## Data Types

### Question
```typescript
interface Question {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type?: 'multiple-choice' | 'true-false' | 'scenario';
}
```

### QuestionSet
```typescript
interface QuestionSet {
  id: string;
  title: string;
  description: string;
  subject: string;
  questions: Question[];
  metadata: QuestionSetMetadata;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  userId?: string;
  sourceType: 'upload' | 'url' | 'search' | 'manual' | 'pre-built';
}
```

### GenerationConfig
```typescript
interface GenerationConfig {
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple-choice' | 'true-false' | 'scenario')[];
  topicFocus?: string;
  subject: string;
}
```

## Question Generation

### Gemini Integration (`lib/questionGenerator.ts`)

**Features:**
- Generate questions from any text content
- Google Search grounding for knowledge-based generation
- Batch generation for large question sets
- Automatic difficulty distribution
- Structured JSON output parsing

**Generation Flow:**
1. User provides content source (file, URL, search, text)
2. Configure generation settings
3. AI analyzes content and generates structured questions
4. Parse and validate JSON response
5. Calculate metadata (difficulty distribution, topics)
6. Return questions with explanations

**Prompts:**
- Custom prompts based on difficulty level
- Different strategies for correct vs incorrect explanations
- Topic focusing capabilities
- Mixed difficulty distribution logic

## Storage System

### Current: Client-Side Storage (localStorage)
**Status:** ✅ Active - Works perfectly on Vercel

**Implementation:**
- Zustand store with persist middleware
- Saves to browser's localStorage
- No server-side database needed
- Works on Vercel's read-only filesystem

**Pros:**
- Zero cost and zero setup
- Instant save/load
- Perfect for personal use
- No network latency

**Cons:**
- Browser/device-specific (no cross-device sync)
- Limited storage (~10MB per domain)
- Data lost if browser cache cleared

**Code Location:**
- `lib/store.ts` - Zustand store with persist
- `app/generate/page.tsx` - `handleSaveQuestionSet()` uses `addQuestionSet()`
- `app/library/page.tsx` - Loads from `availableQuestionSets`

### Future Migration Plans

#### Option 1: Vercel Blob Storage (Simple Sync)
**When to implement:** Need cross-device sync but not complex queries

**Setup:**
```bash
npm install @vercel/blob
```

**Migration steps:**
1. Replace `addQuestionSet()` to save JSON to Vercel Blob
2. Replace library load from Blob storage
3. Use `put()`, `get()`, `list()`, `del()` APIs
4. Keep localStorage as cache for offline support

**Pros:**
- Native Vercel integration
- 1GB free storage/month
- CDN-backed (fast)
- Simple key-value API

**Cons:**
- Still file-based (no queries)
- Limited to 1GB transfer/month

**Code changes needed:**
```typescript
// lib/storage.ts (new file)
import { put, list, del } from '@vercel/blob';

export async function saveQuestionSet(set: QuestionSet) {
  const blob = await put(`question-sets/${set.id}.json`, JSON.stringify(set), {
    access: 'public',
  });
  return blob;
}

export async function getQuestionSets() {
  const { blobs } = await list({ prefix: 'question-sets/' });
  // Fetch and parse each blob
}
```

#### Option 2: Supabase (Full Database)
**When to implement:** Need user accounts, sharing, search, or community features

**Setup:**
1. Create Supabase project: https://vercel.com/marketplace/supabase
2. Install client: `npm install @supabase/supabase-js`
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Migration steps:**
1. Create `question_sets` table in Supabase
2. Create `users` table (if adding auth)
3. Implement row-level security policies
4. Update `lib/db.ts` to use Supabase client
5. Migrate localStorage data to Supabase (one-time script)

**Schema:**
```sql
CREATE TABLE question_sets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  subject text,
  questions jsonb NOT NULL,
  metadata jsonb,
  user_id uuid REFERENCES auth.users,
  is_public boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_question_sets_user_id ON question_sets(user_id);
CREATE INDEX idx_question_sets_subject ON question_sets(subject);
CREATE INDEX idx_question_sets_public ON question_sets(is_public);
```

**Code changes needed:**
```typescript
// lib/supabase.ts (new file)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function saveQuestionSet(set: QuestionSet) {
  const { data, error } = await supabase
    .from('question_sets')
    .insert([set])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getQuestionSets() {
  const { data, error } = await supabase
    .from('question_sets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

**Pros:**
- Full PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Row-level security
- 500MB free storage
- Unlimited API requests

**Cons:**
- More complex setup
- Separate service to manage
- Overkill if just need sync

#### Option 3: Vercel KV (Redis)
**When to implement:** Need fast caching and simple key-value storage

**Best for:** Session data, rate limiting, temporary storage (not primary database)

### Migration Decision Tree

```
Need cross-device sync?
├─ No → Keep localStorage ✅ (current)
└─ Yes → Need complex queries/search?
    ├─ No → Use Vercel Blob (10 min setup)
    └─ Yes → Need user accounts/auth?
        ├─ No → Use Vercel Blob (simpler)
        └─ Yes → Use Supabase (full featured)
```

### Deprecated: JSON File Storage (`lib/db.ts`)
**Status:** ❌ Doesn't work on Vercel (read-only filesystem)

The original implementation used local JSON files:
- `data/db/question-sets.json`
- `data/db/knowledge-areas.json`

**Error:** `EROFS: read-only file system, open '/var/task/data/db/question-sets.json'`

**Solution:** Migrated to localStorage (see above)

## Sharing & Privacy

Users can choose to:
- Keep question sets private (default)
- Share publicly with community (requires consent)
- Consent checkbox in SaveDialog
- Public sets browsable in knowledge areas (future)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |

## Key Features

### Multi-Source Input
1. **Upload Files** - PDF, DOCX, XLSX, TXT (max 10MB)
2. **Fetch URLs** - Web scraping with content cleaning
3. **Search Knowledge** - Gemini Google Search grounding
4. **Paste Text** - Direct text input

### Advanced Generation Controls
- Number of questions: 10, 25, 50, 100
- Difficulty levels: Easy, Medium, Hard, Mixed
- Question types: Multiple choice, True/False, Scenario
- Topic focusing for targeted questions
- Any subject area support

### Exam Modes
- **Exam Mode**: Traditional timed exam with final results
- **Practice Mode**: Instant AI feedback for each answer
- Timer optional in both modes
- Progress tracking and analytics

### AI Capabilities
- Question generation from content
- Detailed explanations for all answers
- Context-aware prompts
- Different feedback for correct/incorrect answers
- Search-based question generation

## Development Guidelines

### Adding New File Types
1. Add parser to `lib/parsers/index.ts`
2. Update `parseFile` function with new extension
3. Update `acceptedTypes` in FileUploader component
4. Test with sample files

### Adding New Question Types
1. Update `GenerationConfig` type in `lib/types.ts`
2. Add to `QUESTION_TYPES` in GenerationControls
3. Update generation prompts in `questionGenerator.ts`
4. Update UI rendering logic

### Extending Storage
To migrate from JSON to SQL:
1. Keep `lib/db.ts` interface unchanged
2. Replace implementation with SQL queries
3. Update environment variables
4. No changes needed in app code

## Troubleshooting

### AI Generation Not Working
- Check `GEMINI_API_KEY` is set in `.env.local`
- Verify API key is valid at https://makersuite.google.com/app/apikey
- Check console for error messages
- Ensure content is not too large (>15000 chars gets truncated)

### File Upload Failures
- Verify file size is under 10MB
- Check file type is supported (.pdf, .docx, .xlsx, .txt)
- Ensure file contains extractable text content
- Check console for parsing errors

### URL Scraping Issues
- Verify URLs start with http:// or https://
- Some sites block scraping (try different sources)
- Check if site has dynamic content (may not scrape well)
- Use multiple URLs if single URL fails

## Intelligent Question Extraction & Enhancement

### Overview
The system can detect if uploaded content contains existing questions and intelligently extract them, filling in missing fields (options, explanations, answers) rather than generating brand new questions.

### How It Works

**Detection (Frontend - `app/generate/page.tsx`):**
- Uses 7 regex patterns to detect existing questions
- Counts questions and estimates total
- Shows green "Extraction Mode" UI vs blue "Generation Mode"
- Passes `estimatedQuestionCount` to backend

**Extraction (Backend - `lib/questionGenerator.ts`):**
- `intelligentQuestionProcessing()` - Auto-routes to extraction or generation
- `extractAndCompleteQuestions()` - Uses frontend count to override backend detection
- `batchExtractAndCompleteQuestions()` - Handles large sets (>25 questions)

### Batch Processing for Large Question Sets

**Why Batching:**
- Token limits: Gemini API has 8,192 token output limit
- 15 questions per batch = ~6,000 tokens (safe margin)
- Prevents JSON truncation errors

**How Batching Works:**
1. Frontend detects 90 questions
2. Backend receives `estimatedQuestionCount: 90`
3. Triggers batch extraction: 90 ÷ 15 = 6 batches
4. `splitContentIntoQuestionBatches()` splits by question boundaries
5. Process 3 batches in parallel (controlled concurrency)
6. Each batch extracts 15 questions with retry logic
7. Combine all results into single array

**Code Flow:**
```
Frontend Analysis → Backend Routing → Batch Splitting → Parallel Processing → Combine Results
     (90 q)              (>25?)          (6 batches)      (3 concurrent)        (90 q)
```

### Key Functions

**`estimateQuestionCount(content: string): number`**
- Patterns: "1. ", "Question 1", "Q1:", "1) "
- Returns highest match count
- Fallback: 10 if no patterns match

**`extractBatch(content, expectedQuestions, config): Promise<Result>`**
- Processes single batch of questions
- Temperature: 0.3 (accurate extraction)
- Max tokens: 8,192
- Explanation limit: 50 words
- Retry with gemini-1.5-pro if overloaded

**`batchExtractAndCompleteQuestions(content, count, config): Promise<Result>`**
- QUESTIONS_PER_BATCH = 15
- CONCURRENT_BATCHES = 3
- Splits content by question boundaries
- Processes in parallel groups
- 1-second delay between groups
- Graceful error handling (continues if batch fails)

### Configuration

**GenerationConfig (lib/types.ts):**
```typescript
interface GenerationConfig {
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple-choice' | 'true-false' | 'scenario')[];
  topicFocus?: string;
  subject: string;
  estimatedQuestionCount?: number; // Frontend override
}
```

### UI/UX Features

**Extraction Mode (Green):**
- Hides: Number of questions, Difficulty, Question types, Topic focus
- Shows: Auto-detected subject (optional override)
- Summary: "~90 questions detected • AI will extract and enhance"
- Button: "Extract & Enhance Questions"

**Generation Mode (Blue):**
- Shows: All configuration controls
- Summary: "25 questions • Difficulty: mixed • Types: multiple-choice"
- Button: "Generate Questions"

**Progress Messages:**
- "Processing 90 questions in 6 batches..." (>25 questions)
- "Extracting 10 questions..." (≤25 questions)
- "Generating 25 questions..." (generation mode)

### Token Optimization

**Strategies:**
1. Reduced batch size: 25 → 15 questions
2. Strict explanation limit: 100 → 50 words
3. Lower max tokens: 16,384 → 8,192
4. Concise prompts: Removed verbose instructions
5. Content truncation: 25,000 chars per batch

**Prompt Enforcement:**
```
STRICT RULES - MUST FOLLOW:
1. Extract ONLY {N} questions - NO MORE, NO LESS
2. Keep explanations BRIEF (max 50 words each)
3. DO NOT add extra details, examples, or context
4. Return ONLY valid JSON, nothing else
```

### Error Handling

**Auto-Recovery:**
- JSON truncation detection
- Closes unclosed brackets
- Removes incomplete last question
- Retries parse

**Fallback Strategy:**
1. Try extraction with gemini-2.5-flash
2. If 503 overload → Retry with gemini-1.5-pro
3. If extraction fails → Fall back to generation mode
4. If batch fails → Continue with successful batches

### Recent Fixes (Commit History)

**`6dd9127` - Use frontend count override:**
- Problem: Backend regex didn't match document format (estimated 10 vs actual 90)
- Solution: Frontend passes `estimatedQuestionCount` to backend
- Backend trusts frontend count over its own detection

**`b1d55cf` - Enforce strict token limits:**
- Problem: AI generated 49,515 chars for 10 questions (should be ~4,000)
- Solution: Reduced tokens, stricter prompts, 50-word explanation limit

**`31ae961` - Reduce batch size and fix splitting:**
- Problem: Batch boundary calculation bug, 25 questions still too large
- Solution: 25 → 15 per batch, fixed endIdx calculation

**`2987cf9` - Intelligent batch processing:**
- Problem: Large sets (90 questions) timed out and failed
- Solution: Auto-detect count, split into batches, parallel processing

### Testing & Debugging

**Vercel Logs:**
```bash
vercel logs [deployment-url]
```

Look for:
- "Estimated X questions" (backend detection)
- "Using frontend-provided count: X" (override working)
- "Splitting into X batches"
- "Processing batch X/Y"
- "Total questions extracted: X"

**Common Issues:**
1. **Only 10 extracted from 90** → Frontend count not passed
2. **JSON parse error** → Token limit exceeded, reduce batch size
3. **503 overload** → Retry logic will switch models
4. **Save failed** → Check question set structure and db.ts

## Future Enhancements

- [x] Intelligent question extraction and completion
- [x] Batch processing for large question sets
- [ ] Real-time progress tracking with visual feedback
- [ ] Incremental temp JSON storage for batch results
- [ ] Question editing after generation
- [ ] Knowledge Areas browser with pre-built sets
- [ ] Community question sets with ratings
- [ ] Export questions to various formats
- [ ] Real-time collaboration on question sets
- [ ] Advanced analytics and insights
- [ ] Mobile app version
- [ ] Offline mode support
