# RealTalk — A Real-Time Messaging Project

> A full-stack messaging application built to learn, practice, and demonstrate modern web development.

---

## ⚠️ Project Status

**The live demo is no longer online.** The Railway free-tier credit expired, so the hosted version has been taken down. The code, documentation, and architecture remain available in the repository for anyone who wants to explore or run it locally.

---

## 🚀 About This Project

RealTalk is a **full-stack, real-time messaging application** I built as a personal project to practice the full development lifecycle — from architecture and testing to deployment and monitoring. It's not a finished commercial product, but I tried to approach it the way a production system might be built, and I learned a lot along the way.

It's roughly **~15,000 lines of code**, and while I'm proud of it, it's very much a learning project rather than a polished enterprise product.

---

## 🏆 What It Does

### **✨ User Experience**
- **Real-Time Messaging** — Instant message delivery with typing indicators
- **Presence System** — Online/offline status with last-seen tracking
- **Group Chats** — Create and participate in group conversations
- **Friend Management** — Send, accept, and decline friend requests
- **Media Sharing** — File uploads with image previews
- **Responsive Design** — Works on mobile and desktop

### **🛡️ Security**
- **JWT Authentication** — With refresh token rotation
- **Input Validation** — Request sanitization and validation
- **Rate Limiting** — Basic protection against abuse
- **CORS & Security Headers** — Standard hardening practices

### **⚡ Performance**
- **Redis Caching** — For sessions and frequently accessed data
- **WebSocket Communication** — Via Socket.io
- **Database Indexing** — To keep queries reasonably fast
- **Lazy Loading** — For messages and media

---

## 🏗️ Architecture

### **📁 Project Structure**
```
RealTalk/
├── frontend/                    # Single Page Application
│   ├── css/pages/              # Modular CSS by feature
│   ├── js/pages/               # Feature-based JavaScript modules
│   ├── cypress/                # E2E testing suite
│   └── assets/                 # Static resources
│
└── server/                     # Backend API
    ├── api/
    │   ├── controllers/        # Business logic handlers
    │   ├── services/          # Core business logic layer
    │   ├── routes/            # API endpoint definitions
    │   └── middlewares/       # Custom middleware layers
    │
    ├── models/                 # MongoDB schemas
    ├── sockets/               # Real-time communication layer
    ├── config/                # Environment configurations
    ├── utils/                 # Reusable helpers
    ├── monitoring/            # Prometheus + Grafana setup
    ├── logs/                  # Structured logging
    ├── __tests__/            # Test suite
    └── scripts/              # DevOps automation scripts
```

---

## 🛠️ Technology Stack

### **Backend**
- **Runtime**: Node.js v18+ with Express.js
- **Database**: MongoDB with Mongoose
- **Real-Time**: Socket.io
- **Caching**: Redis
- **Auth**: JWT with refresh tokens, bcrypt for hashing
- **Validation**: Joi
- **File Handling**: Multer + Cloudinary
- **Email**: SendGrid

### **Frontend**
- **Core**: Vanilla ES6+ JavaScript
- **Styling**: Pure CSS with Flexbox/Grid
- **Real-Time**: Socket.io client
- **Testing**: Cypress (E2E), Jest (unit)

### **DevOps & Monitoring**
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + Morgan
- **CI/CD**: GitHub Actions (config available)

### **Cloud Services (used for the demo)**
- **Hosting**: Railway (backend) + Vercel (frontend)
- **Database**: MongoDB Atlas
- **Cache**: Upstash Redis
- **Storage**: Cloudinary
- **Email**: SendGrid

All of these were free tiers, which is why the demo is no longer running.

---

## 📊 Monitoring

The project includes basic observability setup:
- API response times
- WebSocket connection counts
- Database query performance
- Memory/CPU usage
- Error rates
- Active sessions

Health check endpoints: `/health`, `/metrics`, `/status`

---

## 🔐 Security Approach

### **Authentication Flow**
```
1. User Login → Credentials validated → JWT issued (15min expiry)
2. Automatic refresh → Silent token renewal
3. Logout → Token blacklisted → Sessions terminated
```

### **Middlewares**
- `auth.middleware.js` — JWT verification
- `validation.middleware.js` — Input sanitization
- `rateLimit.middleware.js` — Request throttling
- `helmet.middleware.js` — Security headers
- `cors.middleware.js` — Cross-origin policies

---

## 🧪 Testing

### **Test Pyramid**
```
        ↗ E2E Tests (Cypress) — UI flows
      ↗
    ↗ Integration Tests (Jest) — API endpoints
  ↗
↗ Unit Tests (Jest) — Individual functions
```

Coverage includes API tests (auth, users, chat, friends, groups), socket tests, E2E user journeys, and some load testing with k6.

---

## 🚢 Running It Locally

### **Development**
```bash
# Local development with hot reload
npm run dev:full  # Starts both backend and frontend
```

### **Docker**
```bash
# Full stack with monitoring
docker-compose -f docker-compose.prod.yml up -d

# Monitoring stack only
docker-compose -f docker-compose.monitoring.yml up
```

You'll need to supply your own environment variables (MongoDB URI, Redis URL, Cloudinary keys, SendGrid key, JWT secret, etc.).

---

## 🎯 What I Learned

1. **Software Architecture** — Separating concerns in a large Node.js codebase
2. **Security** — Layering defenses, even if imperfectly
3. **DevOps** — Monitoring, logging, and deployment automation
4. **Testing** — Writing tests at multiple levels
5. **Performance** — Caching, indexing, and efficient queries
6. **Real-Time Systems** — WebSocket management and state synchronization
7. **Cloud Integration** — Wiring together several free-tier services
8. **Project Management** — Keeping a large codebase organized

---

## 🔮 Possible Future Work

If I return to this project, some things I'd like to add:

**Short-term**
- [ ] Voice/Video calls (WebRTC)
- [ ] Message reactions
- [ ] Threading and replies
- [ ] Better search
- [ ] Push notifications

**Long-term**
- [ ] Microservices decomposition
- [ ] Kubernetes manifests
- [ ] Spam detection
- [ ] Proper end-to-end encryption
- [ ] Plugin system

---

## 👨‍💻 About Me

**Author**: Ravan Asgarov  
I'm a full-stack developer interested in system design, real-time applications, and cloud deployment. This project was a way for me to practice building something substantial end-to-end. I still have a lot to learn.

**Contact**:
- GitHub: [@21Ravan12](https://github.com/21Ravan12)
- Portfolio: [portfolio-omega-five-50.vercel.app](https://portfolio-omega-five-50.vercel.app/)
- LinkedIn: [linkedin.com/in/ravan-asgarov](https://linkedin.com/in/ravan-asgarov)

---

## ⚠️ Honest Notes on Production Readiness

This project is **not** production-ready in a commercial sense. It was built as a learning exercise, and while I tried to follow good practices, there are gaps:

- [x] Environment configuration
- [x] Error handling and logging
- [x] Database indexing
- [x] API validation and sanitization
- [x] Monitoring setup
- [x] Cloud service integration
- [x] CORS and security headers
- [x] Basic rate limiting
- [ ] Load testing and performance tuning
- [ ] Disaster recovery plan
- [ ] Backup strategies
- [ ] Compliance / regulatory review

Anyone considering using this as a foundation for a real product should do their own security review, load testing, and compliance checks.

---

## 📄 License

**MIT** — Free to use for educational or commercial purposes.  
Attribution appreciated but not required.

---

## ⭐ If You Found This Useful

- **[Star on GitHub](https://github.com/21Ravan12/Real-Time-Chat-Application)** ⭐
- **Share it with someone who might learn from it**

---

> **Disclaimer**: This is a personal learning project. It demonstrates some full-stack development practices, but it hasn't been audited, load-tested at scale, or reviewed for compliance. Use it as a reference, not as a turnkey solution.

---
*Last Updated: 2026 | Version: 2.0 | Status: 🔴 Demo offline (free-tier credits expired) | Code: 🟢 Available on GitHub*

---

**[⬆ Back to Top](#realtalk--a-real-time-messaging-project)**
