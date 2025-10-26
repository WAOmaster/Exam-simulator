# OCI Exam Simulator 🎓

An interactive Oracle Cloud Infrastructure (OCI) certification exam simulator with AI-powered explanations. Practice for your 1Z0-1151-25 certification with 135 real questions and get instant feedback powered by Google Gemini AI.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-4285f4)

## ✨ Features

- **135 Practice Questions** - Real OCI certification exam questions
- **AI-Powered Explanations** - Get detailed explanations using Google Gemini AI
- **Timed Exam Mode** - Practice under real exam conditions (30/60/90/120 minutes)
- **Progress Tracking** - Monitor your performance with detailed analytics
- **Beautiful UI** - Modern, responsive design with smooth animations
- **Dark Mode** - Toggle between light and dark themes for comfortable studying
- **Customizable Themes** - Choose from 5 color themes (Blue, Purple, Green, Orange, Pink)
- **Local Storage** - Your progress is saved automatically
- **Instant Feedback** - Know immediately if your answer is correct

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Get your free Gemini API key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a free API key
   - Add it to `.env.local`:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

1. **Start Exam** - Select your preferred duration (30, 60, 90, or 120 minutes)
2. **Answer Questions** - Read each question carefully and select your answer
3. **Get AI Feedback** - After submitting, receive detailed AI explanations
4. **Navigate** - Use Previous/Next buttons to move through questions
5. **Finish Exam** - Click "Finish Exam" when ready to see your results
6. **Review Results** - See your score, performance breakdown, and statistics

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **AI**: Google Gemini API
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Document Parsing**: mammoth.js

## 📁 Project Structure

```
oci-exam-simulator/
├── app/
│   ├── api/ai/explain/    # AI explanation endpoint
│   ├── exam/              # Exam page
│   ├── results/           # Results page
│   └── page.tsx           # Home page
├── components/
│   ├── QuestionCard.tsx   # Question display component
│   ├── Timer.tsx          # Countdown timer
│   ├── ProgressBar.tsx    # Progress indicator
│   └── ExplanationModal.tsx # AI explanation modal
├── lib/
│   └── store.ts           # Zustand state management
├── data/
│   └── questions.json     # Parsed questions
├── scripts/
│   ├── parse-questions.js # DOCX parser script
│   └── inspect-docx.js    # DOCX inspection tool
└── public/
    └── questions.docx     # Source question document
```

## 🔧 Development

### Parse New Questions

If you have a new DOCX file with questions:

1. Place the DOCX file in the `public/` directory
2. Update the path in `scripts/parse-questions.js`
3. Run the parser:
   ```bash
   node scripts/parse-questions.js
   ```

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## 🎨 Features in Detail

### AI Explanations

When you answer a question:
- **Correct Answer**: AI explains why the answer is correct and the underlying OCI concepts
- **Incorrect Answer**: AI explains the correct answer, why yours was wrong, and why other options are incorrect

### Timer

- Visual countdown timer
- Color coding (blue → yellow → red as time decreases)
- Automatic exam submission when time runs out
- Warning alerts for low time

### Progress Tracking

- Visual progress bar showing current question
- Separate tracking for answered vs current question
- Local storage persistence - resume where you left off

### Results Analytics

- Overall score percentage
- Pass/Fail status (70% threshold)
- Correct vs incorrect breakdown
- Detailed performance metrics
- Motivational messages

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI explanations | Yes |

## 📝 Question Format

Questions are structured as:

```typescript
{
  id: number,
  question: string,
  options: [
    { id: "A", text: "Option text" },
    { id: "B", text: "Option text" },
    ...
  ],
  correctAnswer: "A",
  explanation: "",
  category: "OCI 1Z0-1151-25",
  difficulty: "medium"
}
```

## 🚧 Troubleshooting

### AI Explanations Not Working

- Check that `GEMINI_API_KEY` is set in `.env.local`
- Verify API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check console for error messages

### Questions Not Loading

- Ensure `data/questions.json` exists
- Run `node scripts/parse-questions.js` to regenerate
- Check that DOCX file is in `public/` directory

### Build Errors

- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Clear Next.js cache: `npm run build` with `--no-cache`

## 🤝 Contributing

This is a personal project for OCI certification preparation. Feel free to fork and customize for your own use!

## 📄 License

This project is for educational purposes. Question content belongs to Oracle Corporation.

## 🙏 Acknowledgments

- Oracle Cloud Infrastructure for the certification program
- Google Gemini for AI-powered explanations
- Next.js team for the amazing framework

---

**Good luck with your OCI certification! 🎉**
