<div align="center">
  <br />
  <h1>SOVERMIND</h1>
  <p>
    <strong>Private. Offline. Sovereign. A local-first AI health companion that runs entirely on your device.</strong>
  </p>
  
  <p>
    <a href="https://sovermind-app.vercel.app/"><img src="https://img.shields.io/badge/LIVE_APP-sovermind--app.vercel.app-70ffe0?style=for-the-badge" alt="Live App" /></a>
    <a href="https://explorer.solana.com/address/Gyk1UsWrmo2W3p4LGTyyFbsXCWwsocKVc8X3tdDaJXJ4?cluster=devnet"><img src="https://img.shields.io/badge/SOLANA-DEVNET-9945FF?style=for-the-badge" alt="Solana Devnet" /></a>
    <a href="https://qvac.tether.io"><img src="https://img.shields.io/badge/QVAC-SDK_INTEGRATED-00dfbe?style=for-the-badge" alt="QVAC SDK" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
    <img src="https://img.shields.io/badge/Tether%20QVAC-00dfbe.svg?style=for-the-badge&logo=tether&logoColor=white" alt="QVAC" />
    <img src="https://img.shields.io/badge/ONNX-%23005CED.svg?style=for-the-badge&logo=onnx&logoColor=white" alt="ONNX" />
    <img src="https://img.shields.io/badge/Solana-9945FF.svg?style=for-the-badge&logo=solana&logoColor=white" alt="Solana" />
    <img src="https://img.shields.io/badge/Vite-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </p>
  <br />
</div>

> **SOVERMIND** is a local-first AI health companion that brings advanced medical inferences—chat, OCR, voice transcription, and translation—directly to your machine. Zero bytes are sent to the cloud. Featuring Solana micro-payments for premium reports and Tether's robust QVAC SDK. This is health privacy meets absolute digital sovereignty.

<div align="center">
  <img src="public/monitor-1.png" alt="SoverMind Landing Page" width="100%" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin: 20px 0;" />
</div>

---

## Table of Contents

- [Live Deployment](#live-deployment)
- [Screenshots](#screenshots)
- [System Architecture](#system-architecture)
- [Pipeline Architecture](#pipeline-architecture)
- [Protocol Features](#protocol-features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Privacy Guarantees](#privacy-guarantees)
- [Project Structure](#project-structure)

---

## Live Deployment

| Component | URL | Status |
|:---|:---|:---:|
| **Frontend App** | [sovermind-app.vercel.app](https://sovermind-app.vercel.app/) | Live Demo |
| **Solana Program** | [`Gyk1UsWrmo2W3p4LGTyyFbsXCWwsocKVc8X3tdDaJXJ4`](https://explorer.solana.com/address/Gyk1UsWrmo2W3p4LGTyyFbsXCWwsocKVc8X3tdDaJXJ4?cluster=devnet) | Deployed |
| **Network** | Solana Devnet | Active |

---

## Screenshots

<table>
  <tr>
    <td align="center"><b>Health Monitor — AI Chat</b></td>
    <td align="center"><b>Prescription Scan</b></td>
  </tr>
  <tr>
    <td><img src="public/monitor.png" alt="Monitor" width="100%"/></td>
    <td><img src="public/scan.png" alt="Scan" width="100%"/></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><b>Health Analysis & Vault</b></td>
  </tr>
  <tr>
    <td colspan="2"><img src="public/analysis.png" alt="Analysis" width="100%"/></td>
  </tr>
</table>

---

## System Architecture

SoverMind operates entirely on your machine. The frontend UI communicates with a local backend that directly orchestrates Tether's QVAC SDK for AI inference. No health data ever leaves your device.

```mermaid
graph TD
    classDef frontend fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef backend fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef qvac fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef vault fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef blockchain fill:#14b8a6,stroke:#0d9488,stroke-width:2px,color:#fff

    subgraph UserMachine ["💻 USER'S LOCAL MACHINE (0 Bytes sent to cloud)"]
        direction TB
        UI["🎨 Frontend (React + Vite)<br/>Port 5173"]:::frontend
        
        subgraph BackendStack ["⚙️ Backend (Fastify + QVAC SDK) Port 3001"]
            API["REST API & WebSockets"]:::backend
            
            subgraph QVAC ["🧠 QVAC On-Device Models"]
                direction LR
                LLM["Llama.cpp<br/>(LLM Chat)"]:::qvac
                Whisper["Whisper.cpp<br/>(Voice)"]:::qvac
                ONNX["ONNX<br/>(OCR)"]:::qvac
                NMT["NMT.cpp<br/>(Translation)"]:::qvac
            end
            
            Vault["🔒 Encrypted Vault<br/>(~/.sovermind/)"]:::vault
            
            API <--> QVAC
            API <--> Vault
        end
        
        UI <-->|"HTTP / WS"| API
    end
    
    Solana["⛓️ Solana Devnet<br/>(Optional micro-payments for Premium Reports)"]:::blockchain
    UI -.->|"Tether WDK"| Solana
```

---

## Pipeline Architecture

SoverMind uses four QVAC capabilities in a single end-to-end pipeline. Every step runs locally. The byte counter in the header is hardcoded to `0` because no network calls are ever made.

### 🎙️ Voice & Multilingual Chat
```mermaid
graph LR
    classDef input fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef model fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef output fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff

    V[Voice Input]:::input -->|"@qvac/transcription-whispercpp"| W[Whisper.cpp]:::model
    W -->|"@qvac/llm-llamacpp"| L[Llama.cpp]:::model
    L -->|"@qvac/translation-nmtcpp"| T[NMT.cpp]:::model
    T -->|"Displayed to user"| O[Translated Output]:::output
```

### 📄 Prescription OCR & Vault
```mermaid
graph LR
    classDef input fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef model fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef output fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff

    I[Image Upload]:::input -->|"@qvac/ocr-onnx"| O[ONNX OCR]:::model
    O -->|"@qvac/llm-llamacpp"| L[Llama.cpp Entities]:::model
    L -->|"AES-256 Encrypted"| V[Local Vault]:::output
```

---

## Protocol Features

| Feature | Description |
|:---|:---|
| **AI Health Chat** | Ask health questions — Llama.cpp answers locally, streaming token by token |
| **Voice Input** | Speak your query in any language, transcribed on-device via Whisper.cpp |
| **Prescription OCR** | Photograph a prescription — medicines extracted and explained using ONNX |
| **Multilingual Output** | Responses translated to Tamil, Hindi, Swahili offline using NMT.cpp |
| **Encrypted Vault** | Entries encrypted with AES-256-GCM using a key derived from your machine ID |
| **Premium Reports** | Optional Solana Devnet flow (Tether WDK) to pay 0.50 USDT for signed PDF reports |

---

## Technology Stack

| Layer | Technology | Function |
|:---|:---|:---|
| **Frontend** | React 18 (Vite) | High-performance VDOM rendering |
| **Styling** | Tailwind CSS | Modern layout and aesthetics |
| **Backend** | Fastify v4 (Node.js) | High-performance API and WebSockets |
| **AI Core** | Tether QVAC SDK | Local orchestration of Llama, Whisper, ONNX, NMT |
| **State** | Zustand | Global application state management |
| **Web3** | Solana / Anchor | Optional micro-payments and signed hash storage |
| **Web3 SDK** | Tether WDK | Non-custodial Solana wallet connections |

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v20+
- A GPU with Vulkan support

### 1. Clone & Download Models
```bash
git clone https://github.com/Gokul-social/Sovermind.git
cd sovermind
```
Download models to `backend/models/`:
- `mistral-7b-instruct-v0.3.Q4_K_M.gguf`
- `ggml-small.bin`
- `ocr-model.onnx`
- `models/translation/`

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
```
Ensure your `LLM_MODEL_PATH`, `WHISPER_MODEL_PATH`, etc., are correctly pointing to the downloaded models in `.env`.

### 3. Start Backend
```bash
npm install
npm run dev
```

### 4. Start Frontend
```bash
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Privacy Guarantees

| What | Stays local? |
|---|---|
| Your health queries | ✅ Yes — LLM runs on-device |
| Voice recordings | ✅ Yes — Whisper runs on-device |
| Prescription images | ✅ Yes — OCR runs on-device |
| Vault entries | ✅ Yes — encrypted on disk |
| Translation | ✅ Yes — NMT runs on-device |
| Bytes sent to cloud | ✅ Always 0 |
| Solana tx (optional) | ⚠️ Report hash only — no health data |

---

## Project Structure

```
sovermind/
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # Layout & Shared UI components
│   │   ├── pages/              # Monitor, Scan, Vault
│   │   ├── store/              # Zustand global state
│   │   ├── hooks/              # useQVAC, useSessionLogger
│   │   └── lib/                # QVAC SDK client & Solana integration
│   └── .env.example
├── backend/                    # Fastify + Node.js
│   ├── src/
│   │   ├── routes/             # health, llm, ocr, transcribe, translate
│   │   ├── services/           # AI services wrapping QVAC modules
│   │   ├── ws/                 # WebSocket streaming handler
│   │   └── lib/                # Model loaders and vault crypto
│   ├── models/                 # QVAC model files directory
│   └── .env.example
├── contract/                   # Anchor (Solana) program
│   ├── programs/sovermind/     # Rust smart contracts
│   └── scripts/deploy.ts       # Deployment scripts
└── reference/                  # Design assets and prototypes
```

---

<div align="center">
  <br />
  <p>Built for the <strong>Colosseum Frontier Hackathon</strong> · Powered by <strong>Tether QVAC</strong></p>
  <p>
    <a href="https://sovermind-app.vercel.app/">Live Demo</a> · 
    <a href="https://qvac.tether.io">Tether QVAC Docs</a> · 
    <a href="./LICENSE">MIT License</a>
  </p>
</div>
