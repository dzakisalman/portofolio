# NantiFit 🚀
<p align="center">
  <b>Level Up Your Health with AI</b>
</p>

<p align="center">
  <img src="FE_NantiFit/assets/images/logo_nantifit.png" alt="NantiFit Logo" width="150"/>
</p>

<p align="center">
  <a href="#-about-nantifit">About</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-api-documentation">API</a> •
  <a href="#-installation-guide">Installation</a> •
  <a href="#-contributing">Contributing</a> • 
  <a href="#-our-team">Team</a>
</p>

---

## 🌟 About NantiFit

**NantiFit** is a cutting-edge, AI-powered health and fitness ecosystem designed to be your ultimate digital wellness companion. By seamlessly integrating advanced computer vision, generative AI, and real-time activity tracking, NantiFit bridges the gap between nutrition, physical exercise, and lifestyle management.

Our mission is to democratize access to personalized health guidance, making it easier for everyone to achieve their fitness goals—whether it's tracking calories, perfecting workout forms, or finding the motivation to keep going.

> **Vision**: To become the intelligent health assistant in your pocket, making fitness accessible, personalized, and effective for everyone.

---

## ✨ Key Features

### 🍎 Smart Nutrition Tracking (AI-Powered)
Unlock the power of **Multi-Layer AI** for your diet.
*   **AI Food Scan**: Instantly identify food and analyze nutritional content using **TensorFlow Lite** (MobileNet) for on-device recognition and **USDA FoodData Central** for precise data.
*   **Intelligent Fallback**: If standard databases fail, our system automatically switches to **Google Gemini AI** to provide accurate nutritional estimates.
*   **Smart Manual Entry**: Log meals manually with AI-assisted corrections and auto-completion.
*   **History & Goals**: Track daily intake against personalized calorie and macro goals.

### 🏋️ AI Fitness & Motion Tracking
Interactive workouts without expensive hardware.
*   **Pose Detection**: Real-time analysis of your exercise form using **Google ML Kit**. Automatically counts repetitions for exercises like Push-ups and Squats.
*   **Precision Run Tracking**: GPS-enabled run tracking with **Google Maps** integration. Visualizes routes, speed, distance, and calories burned in real-time.
*   **Personalized Workouts**: AI-generated workout plans (Cutting, Bulking, Maintenance) tailored to your specific profile.

### 🤖 Intelligent Health Advisor
*   **24/7 AI Chat**: Get instant, context-aware health and fitness advice from our **Google Gemini** powered assistant.
*   **Smart Recommendations**: Receive proactive tips based on your activity and nutrition data.

### 🌍 Lifestyle & Community
*   **Fitness Shorts**: A curated feed of short-form fitness videos (TikTok-style) powered by **YouTube Data API**.
*   **Nearby Gyms**: Locate the best gyms and fitness centers around you using location services.
*   **Health News**: Stay informed with the latest health trends and research articles.
*   **Premium Subscriptions**: Unlock exclusive features like advanced analytics, unlimited AI chat, and personalized coaching via **Midtrans** payment gateway.

---

## 🛠️ Tech Stack

NantiFit is built on a robust, scalable architecture leveraging the latest technologies.

### **Frontend (Mobile App)**
| Technology | Purpose |
| :--- | :--- |
| **Flutter 3.x** | Cross-platform UI framework |
| **GetX** | State management, dependency injection, & routing |
| **Dio** | Efficient HTTP client for API interactions |
| **TensorFlow Lite** | On-device machine learning for food recognition |
| **Google ML Kit** | Real-time pose detection for exercises |
| **Google Maps** | Interactive map integration |
| **Media Kit** | High-performance video playback |

### **Backend (API Server)**
| Technology | Purpose |
| :--- | :--- |
| **Node.js** | Server-side runtime environment |
| **Express.js** | RESTful API framework |
| **Supabase** | Authentication & PostgreSQL Database |
| **Google Gemini AI** | Generative AI engine for chat & logic |
| **Midtrans** | Secure payment gateway integration |
| **Multer** | File upload handling |

### **External Services**
*   **USDA FoodData Central**: Comprehensive nutrition database.
*   **YouTube Data API v3**: Content source for Fitness Shorts.
*   **NewsAPI**: Aggregator for health news.

---

## 📂 Project Structure

### Backend (`BE_NantiFit`)
```
backendfitmate/
├── src/
│   ├── config/           # Configuration (Gemini, Midtrans, Supabase)
│   ├── controllers/      # Business logic (Auth, Food, Sports, AI, etc.)
│   ├── routes/           # API Endpoints
│   ├── middleware/       # Auth & Validation middleware
│   └── index.js          # App entry point
├── supabase/
│   └── migrations/       # Database schemas & migrations
├── package.json
└── .env                  # Environment variables
```

### Frontend (`FE_NantiFit`)
```
fitmate/
├── lib/
│   ├── controllers/      # GetX state controllers
│   ├── models/           # Data models
│   ├── screens/          # UI Screens (Home, Profile, Scan, Sports, etc.)
│   ├── services/         # API service layers
│   ├── core/             # Utilities & Constants
│   └── main.dart         # Entry point
├── assets/
│   ├── images/           # Images & Icons
│   └── *.tflite          # ML Models
└── pubspec.yaml          # Dependencies
```

---

## 🔌 API Documentation

Our Backend provides a comprehensive RESTful API. Below is a summary of key endpoints.

### **Authentication** (`/api/auth`)
*   `POST /register` - Register a new user
*   `POST /login` - User login
*   `GET /profile` - Get user profile details
*   `PUT /profile` - Update user profile

### **Food & Nutrition** (`/api/food`)
*   `POST /analyze` - Analyze food image via AI
*   `GET /history` - Retrieve consumption history
*   `POST /manual` - Add manual food entry

### **Running & Activities** (`/api/run`)
*   `POST /save` - Save a new running session
*   `GET /history` - Get running history
*   `GET /:id` - Get details of a specific run

### **Sports & Workouts** (`/api/sports`)
*   `POST /recommend` - Get AI-driven workout recommendations
*   `GET /exercises/:category` - Browse exercises by category

### **AI Assistant** (`/api/ai`)
*   `POST /chat` - Interact with the AI Health Assistant
*   `GET /history` - Get chat history

### **Lifestyle**
*   `GET /api/gym/nearby` - Find nearby gyms
*   `GET /api/youtube/shorts` - Get fitness video feed
*   `GET /api/subscription/status` - Check subscription status

---

## 🚀 Installation Guide

Top get started, you'll need to set up both the backend server and the mobile application.

### Prerequisites
*   Node.js 18.x or higher
*   Flutter SDK 3.9.2 or higher
*   Git

### 1️⃣ Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd BE_NantiFit
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    Create a `.env` file in `BE_NantiFit/` and add your keys (Supabase, Gemini, Midtrans, etc.). See `BE_NantiFit/README.md` for the template.
4.  Start the server:
    ```bash
    npm run dev
    ```

### 2️⃣ Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd FE_NantiFit
    ```
2.  Install dependencies:
    ```bash
    flutter pub get
    ```
3.  Configure API URL:
    Update `lib/controllers/api_config.dart` with your local or hosted backend URL.
4.  Run the app:
    ```bash
    flutter run
    ```

---

## 👥 Our Team

We are a group of passionate developers from **Universitas Negeri Surabaya**, majoring in **Teknik Informatika**.

| Name | Role | LinkedIn |
| :--- | :--- | :--- |
| **Adhityandi Anggara Putra** | Member | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/anggaraa/) |
| **Haykal Aulil Albab** | Member | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/haykalaulilalbab/) |
| **Muhammad Dzaki Salman** | Member | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/dzakisalman/) |
| **Candra Bagus Ainur Rochman** | Member | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/candra-bagus-ainur-rochman/) |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by the <b>NantiFit Team</b>
</p>
