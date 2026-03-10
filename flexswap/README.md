# FlexSwap — Gift Card Exchange Platform

A full-stack gift card trading platform with real-time chat, escrow protection, and a live marketplace.

## Project Structure

```
flexswap/
├── backend/          # Node.js + Express REST API + WebSocket
│   ├── src/
│   │   ├── config/       # App config & constants
│   │   ├── middleware/   # Auth, error handling
│   │   ├── routes/       # API route handlers
│   │   └── services/     # WebSocket service
│   ├── db/
│   │   └── schema.sql    # PostgreSQL schema
│   ├── server.js         # Entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/         # React app (Vite)
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Dashboard, Marketplace, Chat, etc.
    │   ├── context/      # Auth & App state
    │   ├── hooks/        # Custom React hooks
    │   ├── services/     # API & WebSocket clients
    │   └── utils/        # Helpers & formatters
    ├── index.html
    └── package.json
```

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env        # fill in your values
node server.js
# API → http://localhost:5000
# WS  → ws://localhost:5000/ws
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login → JWT |
| GET | /api/auth/me | Current user |
| GET | /api/cards | All card types + live rates |
| GET | /api/cards/:id/price?amount=100 | Price calculator |
| POST | /api/listings | Create listing |
| GET | /api/listings | Browse listings |
| GET | /api/listings/mine | My listings |
| PUT | /api/listings/:id/cancel | Cancel listing |
| POST | /api/listings/:id/bid | Auction bid |
| POST | /api/trades/buy | Initiate purchase |
| POST | /api/trades/:id/fund-escrow | Lock funds |
| POST | /api/trades/:id/validate | Confirm card |
| GET | /api/trades/my | Trade history |
| GET | /api/wallet/balance | Balances |
| POST | /api/wallet/withdraw | Withdraw |
| POST | /api/wallet/convert | Currency convert |
| POST | /api/chat/conversations | Start chat |
| POST | /api/chat/conversations/:id/messages | Send message |

## WebSocket Events

**Send:**
- `{ type: "auth", token: "<JWT>" }`
- `{ type: "join_conversation", conversation_id: "uuid" }`
- `{ type: "typing" }`

**Receive:**
- `{ type: "market_tick", rates: {...} }` — every 8s
- `{ type: "new_message", message: {...} }`
- `{ type: "typing", from_user: "uuid" }`
