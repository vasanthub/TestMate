# TestMate - MCQ and Practice Test Application

## Project Structure

```
testmate-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── header/
│   │   ├── models/
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   ├── repository/
│   │   │   ├── test/
│   │   │   ├── results/
│   │   │   └── test-review/
│   │   ├── services/
│   │   ├── app.component.ts
│   │   └── app.routes.ts
│   ├── assets/
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── public/
│   └── data/
│       ├── structure.json
│       └── [Domain]/[Topic]/[Repository].json
├── angular.json
├── package.json
└── tsconfig.json
```

## Required Web API Endpoints

Your backend API should implement the following endpoints:

### 1. Get Domain Structure
**GET** `/api/structure`

Returns the folder structure of all domains, topics, and repositories.

Response:
```json
{
  "Science": {
    "Biology": ["Pollution", "Population"],
    "Chemistry": ["Acids"]
  }
}
```

### 2. Get Repository Questions
**GET** `/api/repository/:domain/:topic/:repository`

Returns all questions for a specific repository.

Response:
```json
[
  {
    "question": "Question text with optional $LaTeX$",
    "question_image": "optional_url",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "options_image": [null, null, null, null],
    "answer": [2],
    "answerText": "Optional text answer",
    "answerRegex": "Optional regex"
  }
]
```

### 3. Save Test Result
**POST** `/api/test-results`

Saves a completed test result.

Request Body:
```json
{
  "test_id": "test_1699012345_abc123",
  "test_name": "Pollution - Nov 3, 2025",
  "domain": "Science",
  "topic": "Biology",
  "repository": "Pollution",
  "parent_test": null,
  "retest_type": null,
  "created_on": "2025-11-03T10:30:00Z",
  "profileName": "default",
  "question_range": {
    "start": 1,
    "end": 50
  },
  "questions_attempted": [
    {
      "question_index": 0,
      "answered": [2],
      "correct": true,
      "skipped": false
    }
  ],
  "score": 85,
  "total_questions": 50,
  "completed": true
}
```

### 4. Get Test Results
**GET** `/api/test-results?profileName=default`

Returns all test results for a profile.

Response: Array of TestInstance objects

### 5. Get Test by ID
**GET** `/api/test-results/:testId`

Returns a specific test result by ID.

Response: Single TestInstance object

## Data File Format

### Repository JSON Format
Place question files in: `public/data/[Domain]/[Topic]/[Repository].json`

Example: `public/data/Science/Biology/Pollution.json`

```json
[
  {
    "question": "What is the primary cause of air pollution?",
    "options": ["A", "B", "C", "D"],
    "answer": [2]
  },
  {
    "question": "Multiple answer question?",
    "options": ["A", "B", "C", "D"],
    "answer": [1, 3]
  },
  {
    "question": "Text answer question?",
    "answerText": "Expected answer",
    "answerRegex": "pattern.*match"
  }
]
```

### Question Types Supported

1. **Single Choice MCQ**: `answer` array with one element
2. **Multiple Choice MCQ**: `answer` array with multiple elements
3. **Text Answer**: `answerText` field (exact match)
4. **Regex Answer**: `answerRegex` field (pattern matching)

### Optional Fields

- `question_image`: URL to question image
- `options_image`: Array of URLs for option images (use `null` for options without images)

## LaTeX Support

Questions and options support LaTeX formatting:
- Inline: `$x^2 + y^2 = z^2$`
- Display: `$$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$`

## Profile System

Add `?profileName=YourName` to URL to filter results by profile.
Default profile is "default" if no parameter provided.

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Navigate to `http://localhost:4200/`

## Build

```bash
npm run build
```

Build artifacts will be in the `dist/` directory.

## Features

- ✅ File-based repository system
- ✅ Multiple question types (MCQ, multi-answer, text, regex)
- ✅ LaTeX rendering support
- ✅ Practice mode (results not saved)
- ✅ Test mode (results saved to profile)
- ✅ Question range selection
- ✅ IXL-style question interface
- ✅ Progress tracking with color-coded question boxes
- ✅ Test review with answer comparison
- ✅ Profile-based result filtering
- ✅ Retest options (full set, incorrect only, skipped only)
- ✅ Responsive design (Desktop/Tablet/Mobile)
