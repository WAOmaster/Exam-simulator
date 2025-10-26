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

### JSON-Based Storage (`lib/db.ts`)
- File-based storage in `data/db/` directory
- Easy to migrate to SQL database later
- CRUD operations for question sets and knowledge areas
- Automatic directory initialization
- Search and filter capabilities

**Files:**
- `question-sets.json` - All saved question sets
- `knowledge-areas.json` - Pre-built knowledge areas (future feature)

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

## Future Enhancements

- [ ] Knowledge Areas browser with pre-built sets
- [ ] Community question sets with ratings
- [ ] Export questions to various formats
- [ ] Question editing after generation
- [ ] Real-time collaboration on question sets
- [ ] Advanced analytics and insights
- [ ] Mobile app version
- [ ] Offline mode support
