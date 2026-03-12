# 🚀 Kit Global Project Manager Backend

Advanced Task & Project Management System built with **NestJS**, **TypeScript**, and **MongoDB**. This project implements a robust architecture designed for scalability, security, and high-performance data processing.

---

## ✨ Core Features

* **🛡️ Multi-Level RBAC:** Strict resource access control. Project owners and members can only interact with their authorized resources.
* **📊 Advanced Analytics:** High-performance dashboard logic powered by **MongoDB Aggregation Pipelines ($facet)**. Calculates total tasks, overdue items, status distribution, and top tags in a single database round-trip.
* **📍 Geospatial Search:** Built-in support for finding tasks within a specific geographic radius using MongoDB `2dsphere` indexes.
* **📂 Hierarchical Tasks:** Support for nested subtasks with automated validation of project consistency.
* **💬 Discussion Engine:** Fully integrated comment system for every task with author-only edit/delete permissions.
* **🔐 Secure Auth:** JWT-based authentication with Passport.js, featuring a custom Singleton configuration for environment security.
* **⚙️ Automated CI Pipeline:** GitHub Actions workflow configured for automated linting, building, and comprehensive E2E testing using a volatile MongoDB container on every push/PR.
* **💎 Clean Architecture:** 100% Type safety, Custom Pipes for MongoID validation, and DTO-based data flow with `class-transformer`.

---

## 🛠 Tech Stack

* **Framework:** NestJS (v10+)
* **Database:** MongoDB + Mongoose
* **Validation:** Class-validator & Class-transformer
* **Documentation:** Swagger (OpenAPI)
* **Testing:** Jest & Supertest (Full E2E Coverage)
* **Config:** Custom Static AppConfig Pattern

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/oleksiistepaniak/kit-global-project-manager-backend
cd kit-global-project-manager-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and fill in your credentials:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/kit_global_task
JWT_SECRET=your_super_secret_random_key
JWT_EXPIRES_IN=24h
```

---

## 🚀 Running the App

```bash
# development mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

---

## 🧪 Testing

The project features a comprehensive E2E test suite covering Authentication, Project RBAC, Task Aggregations, and Comments.

```bash
# run all e2e tests
npm run test:e2e
```

---

## 📖 API Documentation

The interactive Swagger UI is available at:
`http://localhost:YOUR_PORT/api/docs`

---

## 🏗 Project Structure

```text
src/
├── auth/         # Authentication, JWT strategies & Guards
├── projects/     # Project management & Access control
├── tasks/        # Tasks, Subtasks & Analytics (Aggregations)
├── comments/     # Task discussion system
├── common/       # Global Pipes, Decorators & Utility helpers
└── config/       # Custom Singleton AppConfig for Environment
```

---
Developed by **Oleksii Stepaniak**  🚀
