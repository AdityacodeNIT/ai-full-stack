# AI-Powered Ticketing & Interview Assistant 🤖

A full-stack application designed to streamline customer support ticketing and enhance interview preparation with AI-driven assistance.

## 🚀 Overview

This project provides a comprehensive solution for managing support tickets and offers an innovative AI-powered interview assistant. It combines a robust backend for data management and AI processing with a dynamic frontend for an intuitive user experience, all within a single repository.

## 🛡️ Badges

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![WebSockets](https://img.shields.io/badge/Realtime-WebSockets-010101?logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Gemini API](https://img.shields.io/badge/AI-Gemini_API-blueviolet?logo=google&logoColor=white)](https://ai.google.dev/gemini)
[![AssemblyAI](https://img.shields.io/badge/Speech_to_Text-AssemblyAI-4A4A4A?logo=assemblyai&logoColor=white)](https://www.assemblyai.com/)
[![Vapi.ai](https://img.shields.io/badge/Voice_AI-Vapi.ai-FF69B4?logo=vapi&logoColor=white)](https://vapi.ai/)
[![Redux](https://img.shields.io/badge/State_Management-Redux-764ABC?logo=redux&logoColor=white)](https://redux.js.org/)
[![Inngest](https://img.shields.io/badge/Event_Driven-Inngest-6D28D9?logo=inngest&logoColor=white)](https://www.inngest.com/)
[![Nodemailer](https://img.shields.io/badge/Email-Nodemailer-0078D4?logo=nodemailer&logoColor=white)](https://nodemailer.com/)
[![JWT](https://img.shields.io/badge/Authentication-JWT-000000?logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Bcrypt](https://img.shields.io/badge/Password_Hashing-Bcrypt-000000?logo=bcrypt&logoColor=white)](https://www.npmjs.com/package/bcrypt)


## 📋 Table of Contents

- [🚀 Overview](#-overview)
- [🛡️ Badges](#️-badges)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Installation and Setup](#️-installation-and-setup)
  - [Clone the Repository](#clone-the-repository)
  - [Install Dependencies](#install-dependencies)
  - [Configure Environment Variables](#configure-environment-variables)
  - [Run the Servers](#run-the-servers)
- [📖 Usage Guide](#-usage-guide)
- [🛠️ Technologies Used](#️-technologies-used)
- [📄 License](#-license)
- [🤝 Author & Contributors](#-author--contributors)

## ✨ Features

-  **User Authentication**: Secure sign-up and login with JWT.
- 🎫 **Ticket Management**: Create, view, update, and delete support tickets.
- 🗣️ **AI-Powered Interview Assistant**: Real-time voice-based interview practice with AI feedback.
- 💬 **Real-time Communication**: WebSockets for instant updates and interactive features.
- 👑 **Admin Panel**: Dedicated interface for administrators to manage users and tickets.
- 📧 **Email Notifications**: Automated emails for user sign-up and ticket creation.
- 🧠 **Intelligent AI Responses**: Utilizes Gemini API for advanced conversational AI.
- 🎤 **Speech-to-Text**: Powered by AssemblyAI for accurate voice transcription.
- 📞 **Voice AI Integration**: Seamless voice interactions via Vapi.ai.

## 🏗️ Architecture

This project follows a monorepo structure, housing both the frontend and backend components in a single repository.

```
.
├── ai-ticket-assistant/ (Backend - Node.js, Express, MongoDB)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── websocket/
│   ├── inngest/
│   └── index.js
└── ai-ticketing/ (Frontend - React, Redux, Tailwind CSS)
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── features/
    │   ├── pages/
    │   ├── redux/
    │   └── App.jsx
    └── index.html
```

The `ai-ticket-assistant` directory contains the backend services, including API endpoints, database models, authentication middleware, and WebSocket handlers. The `ai-ticketing` directory holds the React-based frontend, responsible for the user interface and interaction with the backend APIs.

## ⚙️ Installation and Setup

Follow these steps to get the project up and running on your local machine.

### Clone the Repository

```bash
git clone https://github.com/AdityacodeNIT/ai-full-stack.git
cd ai-full-stack
```

### Install Dependencies

Navigate into each directory and install the respective dependencies:

```bash
# Install backend dependencies
cd ai-ticket-assistant
npm install

# Install frontend dependencies
cd ../ai-ticketing
npm install
```

### Configure Environment Variables

Create `.env` files in both `ai-ticket-assistant/` and `ai-ticketing/` directories.

#### Backend (`ai-ticket-assistant/.env`)

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your_mailtrap_user
MAILTRAP_SMTP_PASS=your_mailtrap_password
APP_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

#### Frontend (`ai-ticketing/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Run the Servers

Start both the backend and frontend servers.

```bash
# Start backend server (from ai-full-stack/ai-ticket-assistant directory)
cd ai-ticket-assistant
npm run dev

# In a new terminal, start frontend server (from ai-full-stack/ai-ticketing directory)
cd ../ai-ticketing
npm run dev
```

The frontend will typically run on `http://localhost:5173` and the backend API on `http://localhost:3000`.

## 📖 Usage Guide

Here's a step-by-step guide on how to use the AI-Powered Ticketing & Interview Assistant:

1.  **Sign Up**:
    *   Navigate to the registration page (e.g., `http://localhost:5173/signup`).
    *   Fill in your details and create an account.
    *   *(Placeholder for Screenshot/GIF: Sign-up page)*

2.  **Login**:
    *   After signing up, log in with your credentials (e.g., `http://localhost:5173/login`).
    *   *(Placeholder for Screenshot/GIF: Login page)*

3.  **Ticket Management**:
    *   Once logged in, you can access the ticketing system.
    *   **Create a New Ticket**: Click on "Create Ticket", fill in the details, and submit.
    *   **View Tickets**: Browse through existing tickets, filter by status, and view details.
    *   *(Placeholder for Screenshot/GIF: Ticket creation/listing page)*

4.  **AI Interview Assistant**:
    *   Go to the interview section (e.g., `http://localhost:5173/interview`).
    *   Start a new interview session. The AI will ask questions, and you can respond verbally.
    *   Receive real-time feedback and suggestions from the AI.
    *   *(Placeholder for Screenshot/GIF: Interview session in progress)*

5.  **Admin Functionality (if applicable)**:
    *   If you have admin privileges, navigate to the admin dashboard (e.g., `http://localhost:5173/admin`).
    *   Manage users, view all tickets, and perform administrative tasks.
    *   *(Placeholder for Screenshot/GIF: Admin dashboard)*

## 🛠️ Technologies Used

*   **Frontend**:
    *   [React](https://react.dev/) - JavaScript library for building user interfaces.
    *   [Redux Toolkit](https://redux-toolkit.js.org/) - Official, opinionated, batteries-included toolset for efficient Redux development.
    *   [React Router DOM](https://reactrouter.com/en/main) - Declarative routing for React.
    *   [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
    *   [Axios](https://axios-http.com/) - Promise-based HTTP client for the browser and Node.js.
*   **Backend**:
    *   [Node.js](https://nodejs.org/) - JavaScript runtime built on Chrome's V8 JavaScript engine.
    *   [Express.js](https://expressjs.com/) - Fast, unopinionated, minimalist web framework for Node.js.
    *   [MongoDB](https://www.mongodb.com/) - NoSQL database.
    *   [Mongoose](https://mongoosejs.com/) - MongoDB object data modeling (ODM) for Node.js.
    *   [JWT (JSON Web Tokens)](https://jwt.io/) - For secure authentication.
    *   [Bcrypt](https://www.npmjs.com/package/bcrypt) - For password hashing.
    *   [CORS](https://www.npmjs.com/package/cors) - Node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.
    *   [Dotenv](https://www.npmjs.com/package/dotenv) - Loads environment variables from a `.env` file.
    *   [Cookie-parser](https://www.npmjs.com/package/cookie-parser) - Parse Cookie header and populate `req.cookies`.
    *   [WebSockets (ws)](https://www.npmjs.com/package/ws) - A simple to use, blazing fast, and thoroughly tested WebSocket client and server for Node.js.
    *   [Nodemailer](https://nodemailer.com/) - Send e-mails with Node.js.
    *   [Inngest](https://www.inngest.com/) - Event-driven serverless functions.
    *   [Gemini API](https://ai.google.dev/gemini) - Google's AI model for conversational AI.
    *   [AssemblyAI](https://www.assemblyai.com/) - AI models for speech-to-text transcription.
    *   [Vapi.ai](https://vapi.ai/) - Voice AI platform for building conversational agents.
    *   [Fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) - A fluent API for `ffmpeg`.
    *   [Node-record-lpcm16](https://www.npmjs.com/package/node-record-lpcm16) - Record audio from a microphone.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Author & Contributors

*   **Aditya Srivastav** - [GitHub Profile](https://github.com/AdityacodeNIT)

*(Add more contributors here with their GitHub profiles and avatars if applicable)*
