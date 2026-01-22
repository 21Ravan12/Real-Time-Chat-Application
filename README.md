# RealTalk - Modern Real-Time Messaging Application

> **Convenient, fast, and secure chat experience**

---

## ✨ **Features**

### **Key Features**

- ✅ Real-time messaging
- ✅ Online/Offline status indicator
- ✅ Friend adding/removing system
- ✅ Group chats
- ✅ Profile management

### **Technical Specifications**
- 🔐 Authentication with JWT
- ⚡ Real-time communication with Socket.io
- 📱 Mobile-friendly design
- 🧪 Test coverage (Jest + Cypress)
- 📊 Basic monitoring (Prometheus/Grafana)

---

## 🏗️ **Project Structure**

```
RealTalk/
├── frontend/ # User interface
│ ├── css/ # Style files
│ ├── js/ # Client-side JavaScript
│ └── cypress/ # E2E tests
│
└── server/ # Backend API
├── api/ # Routes and controllers
├── models/ # Database models
├── sockets/ # WebSocket handlers
└── utils/ # Helper functions
```

---

## 🚀 **Getting Started**

### **Requirements**

- Node.js (v18+)
- MongoDB
- Redis (optional - for sessions)

### **Installation**
```bash
# 1. Clone the Repository
git clone [repo-url]
cd RealTalk

# 2. Backend Installation
cd server
npm install
cp .env.example .env
# Edit the .env file

# 3. Frontend Installation
cd ../frontend
npm install

# 4. Start MongoDB
# (Make sure MongoDB is running)

# 5. Run the Application
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd frontend
npx live-server # or another static server
```

---

## 🔧 **Configuration**

### **Environment Variables** (.env)**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/realtalk
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

---

## 🧪 **Tests**

```bash
# Backend tests
cd server
npm test

# Frontend E2E tests
cd frontend
npx cypress open
```

---

## 📡 **API Endpoints**

### **Authentication**
```
POST /api/auth/register # New user
POST /api/auth/login # Log in
POST /api/auth/logout # Log out
GET /api/auth/me # Existing user
```

### **Users**
```
GET /api/users # All users
GET /api/users/:id # Specific user
PUT /api/users/:id # Update profile
```
### **Friendship**
```
GET /api/friends # Friend list
POST /api/friends/:id # Friend request
DELETE /api/friends/:id # Delete friend
```

### **Chat**
```
GET /api/chat/messages # Message history
GET /api/chat/conversations # Conversations
POST /api/chat/messages # Send message
```

---

## 🌐 **WebSocket Events**
```javascript
// Connection
socket.on('connect', () => {})
socket.on('disconnect', () => {})

// Messaging
socket.emit('sendMessage', {})
socket.on('newMessage', (message) => {})

// Status
socket.on('userOnline', (userId) => {})
socket.on('userOffline', (userId) => {})

// Typing...
socket.emit('typing', {})
socket.on('userTyping', (data) => {})
```

---

## 🎨 **Frontend**

### **Pages**

- `/` - Login/Authentication
- `/chat` - Main chat interface
- `/profile` - Profile management

### **Technologies Used**

- Vanilla JavaScript (ES6+)
- CSS3 (Flexbox/Grid)
- HTML5
- Socket.io Client

---

## 📊 **Monitoring (Optional)**

Simple monitoring with Prometheus + Grafana:
```bash
cd server
docker-compose -f docker-compose.monitoring.yml up
```

---

## 🤝 **Contributing**

1. Fork
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 **License**

MIT License - see LICENSE file for details.

---

## 👤 **Author**

**Ravan Asgarov**

- GitHub: [@21Ravan12](https://github.com/21Ravan12)
- Portfolio: [portfolio-omega-five-50.vercel.app](https://portfolio-omega-five-50.vercel.app/)

---

> **Note:** This project is a real-time messaging application developed for learning purposes. Additional security measures are recommended for production use.
