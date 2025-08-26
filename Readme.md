
```markdown
# 🤖 AI-Powered Interview Assistant 🎤

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Technologies](https://img.shields.io/badge/technologies-React%2CExpress%2CNode.js%2CWebSocket-brightgreen.svg)](/README.md#technologies-used)

A full-stack application designed to assist in the interview process. This project leverages the power of AI to generate interview questions, analyze candidate responses, and provide comprehensive feedback. It includes features like a real-time voice interview interface, AI-powered analysis, and a ticket management system.

[🔗 Demo](https://your-demo-link.com)

## 📜 Table of Contents

- [✨ Features](#-features)
- [⬇️ Installation](#-installation)
- [🚦 Usage](#-usage)
- [📸 Screenshots](#-screenshots)
- [💻 Technologies Used](#-technologies-used)
- [📄 License](#-license)
- [🧑‍💻 Author](#-author)

## ✨ Features

*   ✅ **AI-Powered Question Generation:** Dynamically generates interview questions based on role, level, and tech stack.
*   ✅ **Real-time Voice Interview:** A real-time, AI-driven voice interview experience using WebSockets.
*   ✅ **AI-Driven Analysis:** Analyzes candidate responses for confidence, clarity, and technical understanding.
*   ✅ **Automated Reporting:** Generates comprehensive interview reports with feedback and recommendations.
*   ✅ **Ticket Management System:** Integrated with a full-stack application to analyze and manage tickets.
*   ✅ **User Authentication:** Secure user login and signup functionality.

## ⬇️ Installation

1.  **Clone the Repository:**

    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**

    Create a `.env` file in the root directory and set the following variables:

    ```
    VITE_SERVER_URL=http://localhost:3000  # Replace with your server URL
    GOOGLE_GENERATIVE_AI_API_KEY=YOUR_GOOGLE_API_KEY  # Your Gemini API key
    ASSEMBLYAI_API_KEY=YOUR_ASSEMBLYAI_API_KEY # Your Assembly AI key
    MAILTRAP_SMTP_HOST=YOUR_MAILTRAP_SMTP_HOST
    MAILTRAP_SMTP_PORT=YOUR_MAILTRAP_SMTP_PORT
    MAILTRAP_SMTP_USER=YOUR_MAILTRAP_SMTP_USER
    MAILTRAP_SMTP_PASS=YOUR_MAILTRAP_SMTP_PASS
    JWT_SECRET=YOUR_JWT_SECRET  # Secret key for JWT
    MONGO_URI=YOUR_MONGO_URI # MongoDB connection string
    ```

4.  **Run the Development Server:**

    ```bash
    npm run dev
    ```

## 🚦 Usage

1.  **Access the Application:** Open your web browser and go to `http://localhost:5173`.
2.  **Sign Up/Login:** Create an account or log in to access the interview features.
3.  **Generate an Interview:** Navigate to the interview generation page, fill out the details (role, level, etc.), and generate interview questions.
4.  **Start an Interview Session:** Use the provided interface to begin the voice interview. Speak your answers, and the system will analyze them.
5.  **View Reports:** Review the generated reports with detailed feedback and recommendations.

## 📸 Screenshots

*   **Landing Page:**

    ![Landing Page](https://via.placeholder.com/800x400/4CAF50/FFFFFF?text=Landing+Page)
    _(Replace with your screenshot link)_
*   **Interview Generation Form:**

    ![Interview Generation Form](https://via.placeholder.com/800x400/9C27B0/FFFFFF?text=Interview+Generation+Form)
    _(Replace with your screenshot link)_
*   **Real-Time Interview Session:**

    ![Real-Time Interview Session](https://via.placeholder.com/800x400/2196F3/FFFFFF?text=Real-Time+Interview+Session)
    _(Replace with your screenshot link)_
*   **Detailed Analysis Report:**

    ![Detailed Analysis Report](https://via.placeholder.com/800x400/00BCD4/FFFFFF?text=Detailed+Analysis+Report)
    _(Replace with your screenshot link)_

## 💻 Technologies Used

*   **Frontend:**
    *   React
    *   Redux Toolkit
    *   Tailwind CSS
    *   React Router
*   **Backend:**
    *   Node.js
    *   Express.js
    *   MongoDB
    *   WebSocket (ws)
    *   JWT
    *   Inngest
*   **AI Services:**
    *   @ai-sdk/google (Gemini)
    *   AssemblyAI
*   **Other Libraries:**
    *   Axios
    *   bcrypt
    *   dotenv
    *   Nodemailer

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🧑‍💻 Author

*   **Aditya Srivastav**
```

