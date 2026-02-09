# ExamSimulator 🎓
### AI-Powered Adaptive Learning & Cognitive Diagnostics

**ExamSimulator** is a next-generation learning platform that transforms any content into an interactive exam experience. Powered by **Google Gemini 3**, it goes beyond simple quizzing by acting as a **Cognitive Companion**—diagnosing *why* you get questions wrong and dynamically generating visual explanations to fix your knowledge gaps.

![Gemini 3](https://img.shields.io/badge/AI-Gemini_3_Pro-4285f4?style=for-the-badge&logo=google)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwindcss)
![Status](https://img.shields.io/badge/Status-Hackathon_Live-green?style=for-the-badge)

## 🧠 What Makes This Different?

Most exam tools are binary: you are either "Right" or "Wrong." **ExamSimulator** understands the *student*, not just the *subject*.

* **Universal Subject Support:** Whether you are studying for AWS certifications, high school biology, or LeetCode interviews, ExamSimulator adapts to your material.
* **Deep Think Diagnostics:** Uses **Gemini 3 Pro** (`thinking_level="HIGH"`) to analyze your incorrect answers. It distinguishes between a "silly mistake," a "conceptual misunderstanding," or a "knowledge gap."
* **Visible Reasoning:** You don't just get the answer; you see the AI's "thought process" as it breaks down your logic in real-time.
* **Dynamic Visualizations:** If you struggle with a concept, the system writes and executes Python code to generate custom graphs, charts, and data visualizations on the fly.

---

## ✨ Key Features

### 🤖 The Cognitive Companion
* **Real-time Diagnostic Reasoning:** The AI acts as a private tutor, analyzing your specific misconceptions.
* **Socratic Method:** Instead of spoon-feeding answers, it asks guiding questions to help you derive the solution yourself.
* **Thought Signatures:** Maintains context across your session to track your learning progress.

### 📝 Content-to-Exam Engine
* **Generate from Anything:** Paste a documentation URL, upload a PDF textbook, or simply type a topic (e.g., "Thermodynamics").
* **Structured Output:** Automatically generates rigorous, multiple-choice questions with distractors designed to test specific cognitive levels.

### 👁️ Visual Solver (Multimodal)
* **Image Analysis:** Upload a photo of a handwritten math problem, a circuit diagram, or a chemical equation.
* **Visual Debugging:** The AI uses computer vision to identify errors in your work and Code Execution to plot the correct solution visually.

### 📚 Grounded Learning
* **Search Grounding:** All AI explanations are cross-referenced with **Google Search** to ensure facts are accurate and current.
* **Citations:** Every concept comes with trusted source links.

---

## 🚀 Quick Start

### Prerequisites
* Node.js 18+ installed
* A **Google Gemini API Key** (Must have access to `gemini-3-pro` or `gemini-3-flash`)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/exam-simulator.git](https://github.com/yourusername/exam-simulator.git)
    cd exam-simulator
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment**
    Create a `.env.local` file in the root directory:
    ```bash
    cp .env.local.example .env.local
    ```
    Add your API key and model configuration:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    NEXT_PUBLIC_GEMINI_MODEL=gemini-3-pro
    ```

4.  **Run the application**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use

### 1. Generate an Exam
* Click **"Generate New Exam"**.
* Paste a link to a Wikipedia page, technical documentation, or upload your study notes (PDF/DOCX).
* Select your difficulty level and click **Generate**.
* The AI will parse the content and create a structured question set.

### 2. Practice Mode (Cognitive Diagnostics)
* Start the exam.
* When you answer incorrectly, the **Cognitive Companion** panel will slide out.
* Watch the **"Thinking..."** block to see the diagnostic diagnosis.
* Follow the interactive **Learning Plan** to master the concept before moving on.

### 3. Visual Solver
* Navigate to the **Visual Solver** tab.
* Upload an image of a complex diagram or problem.
* The AI will analyze the visual data and provide a step-by-step breakdown using Python-generated graphs where applicable.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
* **AI Orchestration:**
    * **Models:** `gemini-3-pro` (Reasoning/Diagnostics), `gemini-3-flash` (Content Generation)
    * **Tools:** Code Execution (Python), Google Search Grounding
    * **Capabilities:** Thinking Config (High), JSON Mode, Function Calling
* **State Management:** Zustand with LocalStorage persistence
* **Document Processing:** `mammoth.js` (DOCX), `pdf-parse` (PDF)

## 📁 Project Structure

```bash
exam-simulator/
├── app/
│   ├── api/ai/diagnose/       # Gemini 3 Deep Think endpoint
│   ├── api/ai/generate/       # Question generation endpoint
│   ├── visual-solver/         # Multimodal vision page
│   └── exam/                  # Adaptive exam interface
├── components/
│   ├── CognitiveCompanion.tsx # The diagnostic UI panel
│   ├── CodeVisualizer.tsx     # Renders Python-generated graphs
│   └── ThinkingBubble.tsx     # Visualizes AI reasoning tokens
├── lib/
│   └── gemini-client.ts       # Google AI SDK configuration
└── public/
    └── demo-questions.json    # Sample question set