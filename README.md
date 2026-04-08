# 🧪 AI Playground

A premium, dark-themed web interface for testing and comparing AI models from multiple providers — all from one place.

![AI Playground](https://img.shields.io/badge/AI-Playground-818cf8?style=for-the-badge&logo=openai&logoColor=white)

## ✨ Features

- **8 AI Providers** — OpenAI, Anthropic, Google Gemini, Groq, Mistral AI, DeepSeek, OpenRouter, Custom Endpoints
- **Real-time Streaming** — Token-by-token response rendering with live cursor
- **Full Parameter Control** — Temperature, Max Tokens, Top P, System Prompt
- **Response Metrics** — Latency, TTFB, Tokens In/Out, Speed (tok/s), Cost estimate
- **Session Tracking** — Total messages, tokens, cost, and average latency
- **Chat Export** — Download conversations as Markdown
- **Persistent Settings** — API key & preferences saved in localStorage
- **Stop Generation** — Abort mid-stream with the stop button
- **Quick Prompts** — Pre-built example prompts to get started fast

## 🚀 Getting Started

### Option 1: Open directly
Just open `index.html` in your browser — no build step required!

### Option 2: Local server
```bash
npx serve -l 3000
```

Then visit `http://localhost:3000`

## 🔧 How to Use

1. **Select a Provider** (e.g., OpenAI, Anthropic, Google Gemini)
2. **Paste your API Key**
3. **Choose a Model**
4. **Start chatting!**

## 🎨 Design

- Modern dark mode with glassmorphism
- Animated gradient background with floating orbs
- Smooth micro-animations and transitions
- Responsive three-panel layout
- Premium typography with Inter & JetBrains Mono

## 📁 Project Structure

```
ai-tester/
├── index.html   # Main HTML structure
├── style.css    # Complete design system
├── app.js       # Application logic & API integrations
└── README.md    # This file
```

## 🔑 Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1, o3-mini |
| Anthropic | Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3 Opus |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash |
| Groq | Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B |
| Mistral | Mistral Large, Mistral Small, Codestral |
| DeepSeek | DeepSeek V3, DeepSeek R1 |
| OpenRouter | Access all models via OpenRouter |

## 📝 License

MIT
