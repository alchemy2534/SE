---
description: Deploy Node.js Monolith to Render
---

# Deploy Node.js Monolith to Render

This workflow outlines the steps to deploy the Dental Clinic application to Render.com.

## Prerequisites
- A GitHub or GitLab account.
- A Render.com account.
- A MongoDB Atlas account (for the database).

## Steps

### 1. Set up MongoDB Atlas (Database)
Since Render does not host MongoDB natively, you need a cloud database.
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up/login.
2.  Create a **New Project**.
3.  Create a **Cluster** (The free Shared tier is sufficient).
4.  **Create a Database User**: Go to "Database Access", create a user with a password. Remember these credentials!
5.  **Network Access**: Go to "Network Access" and add IP Address `0.0.0.0/0` (Allow Access from Anywhere) so Render can connect.
6.  **Get Connection String**:
    - Click **Connect** on your cluster.
    - Choose **Drivers**.
    - Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/test?retryWrites=true&w=majority`).
    - Replace `<username>` and `<password>` with the user you created.

### 2. Push Code to GitHub
1.  Initialize a git repository if you haven't:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Create a new repository on [GitHub](https://github.com/new).
3.  Link and push your local code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin master
    ```

### 3. Deploy on Render
1.  Login to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configure Service**:
    - **Name**: `dental-clinic-app` (or similar).
    - **Region**: Choose the one closest to you (e.g., Singapore, Frankfurt).
    - **Branch**: `master` (or `main`).
    - **Root Directory**: Leave empty (since `server.js` is in the root).
    - **Runtime**: `Node`.
    - **Build Command**: `npm install`.
    - **Start Command**: `node server.js`.
5.  **Environment Variables**:
    - Scroll down to "Environment Variables" and verify/add keys:
        - `Key`: `MONGO_URI`, `Value`: *Your MongoDB Atlas connection string*.
        - `Key`: `JWT_SECRET`, `Value`: *A secure random string*.
        - `Key`: `NODE_ENV`, `Value`: `production`.
6.  Click **Create Web Service**.

### 4. Verify Deployment
- Wait for the build to finish.
- Once deployed, Render will provide a URL (e.g., `https://dental-clinic-app.onrender.com`).
- Visit the URL to verify your app works.
