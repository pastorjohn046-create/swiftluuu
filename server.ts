import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Mock Database
  let users = [
    {
      uid: 'admin-001',
      email: 'demo@nexus.bank',
      displayName: 'User #001',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      balance: 10000.00,
      createdAt: new Date().toISOString(),
      theme: 'light',
      role: 'admin'
    },
    {
      uid: 'user-002',
      email: 'sarah@example.com',
      displayName: 'User #002',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      balance: 10000.00,
      createdAt: new Date().toISOString(),
      theme: 'light',
      role: 'user'
    }
  ];

  let transactions = [];
  
  let investments = [
    {
      uid: 'user-002',
      totalInvested: 5000.00,
      currentValue: 5420.50,
      monthlyReturn: 8.4,
      assets: [
        { name: 'Global Tech Fund', value: 3200.00, change: 12.5 },
        { name: 'Real Estate REIT', value: 2220.50, change: 3.2 }
      ]
    }
  ];

  let withdrawalRequests = [
    {
      id: 'wr-1',
      uid: 'user-002',
      userName: 'User #002',
      amount: 500.00,
      status: 'pending',
      timestamp: new Date().toISOString(),
      method: 'Bank Transfer'
    }
  ];

  let messages = [
    {
      id: 'msg-1',
      userId: 'user-2',
      userName: 'Sarah Jenkins',
      userEmail: 'sarah@example.com',
      content: 'How do I increase my daily transfer limit?',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: 'pending',
      reply: ''
    }
  ];

  let paymentMethods = [
    {
      id: 'pm-1',
      name: 'Bank Transfer',
      details: 'Nexus Bank • 1234-5678-9012',
      icon: 'landmark'
    },
    {
      id: 'pm-2',
      name: 'Crypto (USDT)',
      details: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      icon: 'bitcoin'
    }
  ];

  // API Routes
  app.post("/api/login", (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/signup", (req, res) => {
    const { name, email } = req.body;
    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }
    const newUser = {
      uid: `user-${Math.random().toString(36).substr(2, 9)}`,
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      balance: 10000.00,
      createdAt: new Date().toISOString(),
      theme: 'light',
      role: 'user'
    };
    users.push(newUser);
    res.json(newUser);
  });

  app.get("/api/users", (req, res) => {
    res.json(users.map(u => ({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, email: u.email, balance: u.balance, role: u.role, createdAt: u.createdAt })));
  });

  // Admin Routes
  app.post("/api/admin/update-balance", (req, res) => {
    const { uid, amount, type } = req.body; // type: 'add' | 'remove'
    const user = users.find(u => u.uid === uid);
    
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ error: "Invalid amount" });

    if (type === 'add') {
      user.balance += numAmount;
    } else if (type === 'remove') {
      if (user.balance < numAmount) return res.status(400).json({ error: "Insufficient balance" });
      user.balance -= numAmount;
    } else {
      return res.status(400).json({ error: "Invalid operation type" });
    }

    // Log as a system transaction
    const newTx = {
      id: `tx-admin-${Math.random().toString(36).substr(2, 9)}`,
      fromUid: 'system',
      toUid: uid,
      fromName: 'System Admin',
      toName: user.displayName,
      amount: numAmount,
      type: type === 'add' ? 'deposit' : 'withdrawal',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description: `Admin balance adjustment (${type})`,
    };
    transactions.unshift(newTx);

    res.json({ success: true, balance: user.balance });
  });

  app.post("/api/admin/investments/update", (req, res) => {
    const { uid, amount, type } = req.body; // type: 'add' | 'remove'
    let investment = investments.find(inv => inv.uid === uid);
    
    if (!investment) {
      investment = {
        uid,
        totalInvested: 0,
        currentValue: 0,
        monthlyReturn: 0,
        assets: []
      };
      investments.push(investment);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ error: "Invalid amount" });

    if (type === 'add') {
      investment.totalInvested += numAmount;
      investment.currentValue += numAmount;
    } else if (type === 'remove') {
      investment.totalInvested = Math.max(0, investment.totalInvested - numAmount);
      investment.currentValue = Math.max(0, investment.currentValue - numAmount);
    } else {
      return res.status(400).json({ error: "Invalid operation type" });
    }
    
    res.json({ success: true, investment });
  });

  app.delete("/api/admin/user/:uid", (req, res) => {
    const { uid } = req.params;
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) return res.status(404).json({ error: "User not found" });
    
    users.splice(index, 1);
    res.json({ success: true });
  });

  // Support Routes
  app.get("/api/support/messages", (req, res) => {
    res.json(messages);
  });

  app.post("/api/support/send", (req, res) => {
    const { userId, userName, userEmail, content } = req.body;
    const newMessage = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      userEmail,
      content,
      timestamp: new Date().toISOString(),
      status: 'pending',
      reply: ''
    };
    messages.unshift(newMessage);
    res.json(newMessage);
  });

  app.post("/api/support/reply", (req, res) => {
    const { messageId, reply } = req.body;
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.reply = reply;
      message.status = 'replied';
      res.json(message);
    } else {
      res.status(404).json({ error: "Message not found" });
    }
  });

  // Payment Methods Routes
  app.get("/api/payment-methods", (req, res) => {
    res.json(paymentMethods);
  });

  app.post("/api/admin/payment-methods", (req, res) => {
    const { name, details, icon } = req.body;
    const newMethod = {
      id: `pm-${Math.random().toString(36).substr(2, 9)}`,
      name,
      details,
      icon
    };
    paymentMethods.push(newMethod);
    res.json(newMethod);
  });

  app.delete("/api/admin/payment-methods/:id", (req, res) => {
    const { id } = req.params;
    const index = paymentMethods.findIndex(pm => pm.id === id);
    if (index !== -1) {
      paymentMethods.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Method not found" });
    }
  });

  app.get("/api/transactions/:uid", (req, res) => {
    const { uid } = req.params;
    const userTxs = transactions.filter(t => t.fromUid === uid || t.toUid === uid);
    res.json(userTxs);
  });

  // Investment & Withdrawal Routes
  app.get("/api/investments/:uid", (req, res) => {
    const { uid } = req.params;
    let userInv = investments.find(i => i.uid === uid);
    if (!userInv) {
      userInv = {
        uid,
        totalInvested: 0,
        currentValue: 0,
        monthlyReturn: 0,
        assets: []
      };
      investments.push(userInv);
    }
    res.json(userInv);
  });

  app.post("/api/withdrawals/request", (req, res) => {
    const { uid, amount, method } = req.body;
    const user = users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newRequest = {
      id: `wr-${Math.random().toString(36).substr(2, 9)}`,
      uid,
      userName: user.displayName,
      amount,
      status: 'pending',
      timestamp: new Date().toISOString(),
      method
    };
    withdrawalRequests.unshift(newRequest);
    res.json(newRequest);
  });

  app.get("/api/admin/withdrawals", (req, res) => {
    res.json(withdrawalRequests);
  });

  app.post("/api/admin/withdrawals/action", (req, res) => {
    const { requestId, action } = req.body; // action: 'approve' | 'reject'
    const request = withdrawalRequests.find(r => r.id === requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request already processed" });
    }

    request.status = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
      const user = users.find(u => u.uid === request.uid);
      if (user) {
        // Deduct from balance if it was a balance withdrawal, 
        // but user said "Portfolio Investments" withdrawal.
        // Let's assume it deducts from their main balance for simplicity in this mock, 
        // or just mark it as a completed transaction.
        user.balance -= request.amount;
        
        const newTx = {
          id: `tx-wd-${Math.random().toString(36).substr(2, 9)}`,
          fromUid: user.uid,
          toUid: 'external',
          fromName: user.displayName,
          toName: request.method,
          amount: request.amount,
          type: 'withdrawal',
          status: 'completed',
          timestamp: new Date().toISOString(),
          description: `Withdrawal via ${request.method} (Approved)`,
        };
        transactions.unshift(newTx);
      }
    }

    res.json(request);
  });

  app.post("/api/transfer", (req, res) => {
    const { fromUid, toUid, amount, description } = req.body;
    const fromUser = users.find(u => u.uid === fromUid);
    const toUser = users.find(u => u.uid === toUid);

    if (!fromUser || !toUser || fromUser.balance < amount) {
      return res.status(400).json({ error: "Invalid transfer" });
    }

    fromUser.balance -= amount;
    toUser.balance += amount;

    const newTx = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      fromUid,
      toUid,
      fromName: fromUser.displayName,
      toName: toUser.displayName,
      amount,
      type: 'transfer',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description,
    };

    transactions.unshift(newTx);
    res.json({ success: true, transaction: newTx, balance: fromUser.balance });
  });

  app.post("/api/upload-avatar", upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image provided" });
      
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
      });
      
      res.json({ url: result.secure_url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
