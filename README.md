# Before AI

### Think before the machine does.

**Before AI** transforms the waiting time between submitting a prompt and receiving an AI response into an interactive prediction experience.

Instead of staring at a loading spinner while an AI agent works, users are challenged to **predict what the AI will say, recommend, or do**. When the response arrives, Before AI compares the human prediction with the AI's actual result and provides a score.

> **AI is getting faster. But while it thinks, we wait. Before AI makes that waiting time useful.**

---

## Overview

AI systems increasingly perform complex tasks that require users to wait for a response. Whether an agent is writing code, researching a topic, analyzing information, or generating recommendations, the waiting state is usually treated as dead time.

**Before AI turns that waiting state into an interaction.**

The experience follows a simple loop:

**Prompt → Predict → AI Thinks → Reveal → Learn**

A user submits a prompt and immediately receives a contextual prediction challenge. While the AI processes the original request, the user makes a prediction about the eventual response.

Once the AI finishes, the prediction is revealed alongside the actual answer and the user receives a calibration score.

---

## The Problem

Modern AI interfaces are optimized around the response itself, but not around the time spent waiting for that response.

Typical AI interfaces provide:

* Loading spinners
* Progress indicators
* Streaming text
* "Thinking..." messages

These communicate that something is happening, but they rarely give the user a reason to remain engaged.

For increasingly capable AI agents, this becomes more important. Agentic tasks can involve multiple steps, tools, searches, reasoning, and external operations.

**The waiting state is becoming a new interaction surface.**

Before AI explores what happens when that surface is designed intentionally.

---

## The Solution

Before AI introduces a contextual prediction game directly into the AI waiting experience.

### 1. Submit a Prompt

The user asks the AI to perform a task.

Examples:

* "Find the likely cause of this React bug."
* "Which technology should I use for this application?"
* "What will be the most important finding in this dataset?"
* "Which option would you recommend?"

### 2. Make a Prediction

Before the AI answer is revealed, Before AI generates a prediction challenge based on the user's prompt.

The user selects the answer they believe the AI will produce and optionally provides their confidence.

### 3. AI Processes the Request

The original AI request continues normally in the background.

The user is no longer passively waiting.

They are actively thinking about the problem.

### 4. Reveal the Answer

When the AI response becomes available, Before AI reveals:

* The user's prediction
* The AI's actual answer
* Whether the prediction was correct
* Supporting evidence
* A prediction score

### 5. Build Calibration

Repeated predictions contribute to a user's Human × AI calibration profile.

Over time, users can understand:

* How accurately they predict AI behavior
* Where their predictions are strongest
* Where they consistently disagree with AI
* How confident they should be in their own predictions

---

## Why It Is Different

Before AI is not another AI chatbot.

The AI response is not the product.

**The waiting state is the product.**

Traditional interface:

> User → Prompt → Loading → AI Response

Before AI:

> User → Prompt → **Prediction Challenge → AI Response → Comparison → Calibration**

This creates an additional interaction without requiring the user to interrupt or modify the underlying AI task.

---

## Context-Aware Challenges

Prediction challenges adapt to the type of task being performed.

### Coding

**Prompt:**
"Why is this React component rendering twice?"

The user predicts the most likely explanation before the AI responds.

### Recommendations

**Prompt:**
"Which database would you recommend for this application?"

The user predicts which technology the AI will recommend.

### Research

**Prompt:**
"What is the most likely conclusion from this study?"

The user predicts the conclusion before seeing the AI's analysis.

### Data Analysis

**Prompt:**
"What trend is most likely present in this dataset?"

The user predicts the expected trend.

### Technical Questions

**Prompt:**
"What is the main difference between these two approaches?"

The user predicts the answer before the AI explains it.

The goal is to make the challenge **meaningful to the task**, rather than displaying a generic game while the AI waits.

---

## Human × AI Calibration

The prediction system creates an additional layer of interaction between humans and AI.

A user is not simply asking:

> "What does the AI think?"

They are also asking:

> "Can I predict what the AI will think?"

This creates a measurable relationship between human expectations and AI outputs.

A user's calibration profile can eventually represent dimensions such as:

* Prediction accuracy
* Confidence accuracy
* Category performance
* Recent performance
* Prediction streaks
* Human–AI agreement

The long-term goal is not simply to reward correct guesses.

It is to help users understand **when their intuition aligns with AI and when it does not.**

---

## Core Features

* Contextual prediction challenges
* AI-generated challenge questions
* Multiple-choice prediction
* Confidence scoring
* Real-time AI response streaming
* Human vs. AI comparison
* Prediction grading
* Evidence-based result verification
* Calibration scoring
* Prediction history
* Demo/offline mode
* Live AI provider support
* Responsive interface
* Reduced-motion accessibility support

---

## Technology

Before AI is built around a lightweight modern web architecture.

**Frontend**

* Next.js
* React
* TypeScript
* Tailwind CSS

**Backend**

* Next.js API Routes
* Server-Sent Events (SSE)
* AI provider abstraction

**AI**

* Anthropic-compatible AI interface
* Structured AI outputs
* Contextual challenge generation
* Prediction grading

**Storage**

The current MVP uses browser-local storage for calibration and history.

The storage layer is intentionally abstracted so that persistent storage can be introduced later without redesigning the application.

---

## AI Architecture

The application separates AI functionality from the user interface through an AI provider abstraction.

This allows the experience to operate using either:

### Live Mode

Uses a configured AI provider to generate:

* The actual AI response
* Contextual prediction challenges
* Prediction grades

### Demo Mode

Provides a deterministic offline experience for demonstrations and environments where an AI API is unavailable.

This is particularly useful for:

* Presentations
* Judging
* Development
* Testing
* API quota limitations
* Offline demonstrations

The demo experience does not pretend to be live AI. It is explicitly presented as a demonstration mode.

---

## Reliability

Before AI is designed so that a failure in one part of the experience does not unnecessarily destroy the entire interaction.

For example:

* A challenge-generation failure should not prevent the AI response from being displayed.
* A grading failure should not remove the original answer.
* Streaming requests support cancellation.
* Demo mode provides a fallback when live AI is unavailable.
* Local storage failures are handled defensively.

The objective is to keep the core experience usable even when individual AI operations fail.

---

## Privacy

The current MVP does not require user accounts.

There is:

* No authentication system
* No password collection
* No account management
* No required database
* No unnecessary personal information

Prediction history and calibration data are stored locally in the browser for the MVP.

A future production version can introduce authenticated accounts and server-side persistence where required.

---

## Getting Started

### Prerequisites

Make sure you have:

* Node.js 18+
* npm

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file.

For live AI mode:

```env
ANTHROPIC_AUTH_TOKEN=your_api_key
ANTHROPIC_BASE_URL=https://co.agentrouter.org
```

The application can also run without these credentials in Demo Mode.

> **Important:** Never commit API keys or other secrets to Git.

### Run Development Server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Demo Mode

Before AI includes a deterministic demo experience so the core interaction can be demonstrated without depending on a live AI provider.

Demo Mode is useful when:

* API access is unavailable
* API quota has been exhausted
* Internet connectivity is limited
* A predictable presentation is required

The demo preserves the essential product experience:

**Prompt → Prediction → Waiting → Reveal → Score**

---

## Production Validation

Before deployment, the project can be validated using:

```bash
npx tsc --noEmit
```

```bash
npx eslint .
```

```bash
npm test
```

```bash
npm run build
```

A successful production build confirms that the application compiles correctly for deployment.

---

## Product Vision

Before AI is the first experience in a broader concept called **WaitOS**.

### WaitOS

**WaitOS is a contextual waiting layer for AI agents.**

Every AI agent eventually enters a waiting state.

Instead of treating that state as an implementation detail, WaitOS can turn it into an opportunity for interaction.

A future WaitOS layer could detect:

* What the agent is doing
* Why the user is waiting
* Expected response time
* User context
* Task category
* Previous interactions

It could then select an appropriate waiting experience.

For example:

| AI Task             | Possible Waiting Experience  |
| ------------------- | ---------------------------- |
| Coding              | Predict the bug or solution  |
| Research            | Predict the conclusion       |
| Recommendation      | Predict the recommendation   |
| Data analysis       | Predict the trend            |
| Creative generation | Predict the output direction |
| Long-running agent  | Interactive mini-challenge   |
| Multi-step task     | Progress-based interaction   |

**Before AI is the first experience. WaitOS is the infrastructure behind the idea.**

---

## Future Possibilities

The current project intentionally focuses on the core experience rather than attempting to build the entire platform.

Potential future development includes:

* WaitOS SDK
* AI-agent integrations
* Browser integrations
* Persistent user profiles
* Advanced calibration analytics
* More prediction formats
* Adaptive difficulty
* Team calibration
* Shareable prediction results
* Additional waiting experiences
* Agent-specific experiences
* Enterprise integrations

The long-term goal is to make waiting a reusable interaction layer across AI products.

---

## Design Philosophy

Before AI follows a few principles:

### Waiting should be interactive

Users should have something meaningful to do while AI works.

### The interaction should be contextual

The waiting experience should understand the task rather than showing a generic loading animation.

### The AI should remain the focus

The experience enhances the AI workflow rather than replacing it.

### Fast interactions should stay fast

The waiting experience should never introduce unnecessary friction.

### The result should teach something

The prediction should create a moment of comparison between human intuition and AI output.

---

## Hackathon Concept

**Before AI** was created for the **Commons $60k Hackathon: "Make Waiting for AI Fun."**

The central idea is simple:

> **Don't make people wait for AI. Give them something worth doing while it thinks.**

The project focuses specifically on the waiting experience rather than building another general-purpose AI application.

---

## Conclusion

AI systems are becoming faster and more capable, but some tasks will always involve waiting.

Instead of hiding that waiting behind a spinner, Before AI turns it into a moment of participation.

The user predicts.

The AI thinks.

The answer is revealed.

The user learns how well they understand the machine.

### Before AI

**Think before the machine does.**

---

## License

This project is currently intended as a hackathon and experimental product project.

License and distribution terms may be added as the project moves toward production.
