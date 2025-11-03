# Xeno-Insights-Dashboard

 Xeno Dashboard

A Multi-Store Shopify Analytics Platform

Xeno Dashboard is a full-stack analytics platform that connects to multiple Shopify stores via their API tokens, providing real-time insights into sales performance, customer trends, and product analytics — all in one unified dashboard.

 Features

Multi-store support – Connect and manage multiple Shopify stores under one account.

Secure API integration – Connect stores using Shopify Admin API via private app tokens.

Automated data sync – Background job runs every 30 minutes to fetch updated store data.

Comprehensive analytics

Total revenue, orders, and customer growth

Top-performing products and categories

Customer segmentation and repeat purchase rate

Sales trends (daily, weekly, monthly)

Interactive charts and insights powered by Chart.js.

User authentication – JWT-based login and multi-tenant database design for data isolation.

🏗️ Tech Stack
Category	Technologies
Frontend	React.js, Tailwind CSS, Chart.js
Backend	Node.js, Express.js
Database	PostgreSQL with Prisma ORM
Authentication	JWT (JSON Web Token)
API Integration	Shopify Admin REST API


Installation
1️⃣ Clone the repository
git clone https://github.com/thanujaa9/xenoinsight-dashboard.git
cd xenoinsight-dashboard

2️⃣ Install dependencies

For both frontend and backend:

npm install

3️⃣ Create .env files

Backend (.env)

DATABASE_URL=postgresql://username:password@localhost:5432/xeno
JWT_SECRET=your_jwt_secret

Run the backend:

node src/app.js


By default, it runs on http://localhost:5000

3️⃣ Frontend setup
cd frontend
npm install


Create a .env file in the frontend folder:

REACT_APP_API_BASE_URL=http://localhost:5000


Start the frontend:

npm start


By default, it runs on http://localhost:3000

🧩 How It Works

User connects a Shopify store using Admin API token.

Backend fetches data (orders, customers, products) periodically.

Frontend dashboard visualizes analytics via dynamic charts and metrics.

🎥 **Demo Video:** [Watch the Xeno Dashboard Demo Video](https://drive.google.com/file/d/1mbxaRTyyfRlsMI9K5_WIh-C8314rmmdV/view?usp=sharing)
