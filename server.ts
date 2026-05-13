import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";

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

// Database Persistence
const DB_PATH = path.join(process.cwd(), "data.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          uid: 'admin-001',
          email: 'vertexcapitalbankingfinanceltd@gmail.com',
          displayName: 'Vertex Admin',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vertexadmin',
          balance: 10000.00,
          createdAt: new Date().toISOString(),
          theme: 'light',
          role: 'admin'
        }
      ],
      transactions: [],
      investments: [],
      withdrawalRequests: [],
      messages: [],
      paymentMethods: [
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
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`[DB] Database saved successfully at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[DB] Failed to save database:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL = 'vertexcapitalbankingfinanceltd@gmail.com';
    const ADMIN_PASSWORD = 'vertexcapitalbankingfinanceltd@gmail.com';
    const user = db.users.find(u => u.email === email);
    if (user) {
      // If this is the admin account, validate password
      if (user.role === 'admin' && !(email === ADMIN_EMAIL && password === ADMIN_PASSWORD)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/signup", (req, res) => {
    const { name, email } = req.body;
    const existing = db.users.find(u => u.email === email);
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
      role: email === 'vertexcapitalbankingfinanceltd@gmail.com' ? 'admin' : 'user'
    };
    db.users.push(newUser);
    saveDB();
    res.json(newUser);
  });

  app.get("/api/users", (req, res) => {
    res.json(db.users.map(u => ({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, email: u.email, balance: u.balance, role: u.role, createdAt: u.createdAt })));
  });

  app.get("/api/user/:uid", (req, res) => {
    const { uid } = req.params;
    const user = db.users.find(u => u.uid === uid);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/user/update-profile", (req, res) => {
    const { uid, photoURL, displayName } = req.body;
    const user = db.users.find(u => u.uid === uid);
    if (user) {
      if (photoURL) user.photoURL = photoURL;
      if (displayName) user.displayName = displayName;
      saveDB();
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Admin Routes
  app.post("/api/admin/update-balance", (req, res) => {
    const { uid, amount, type } = req.body; // type: 'add' | 'remove'
    const user = db.users.find(u => u.uid === uid);
    
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
      fromName: user.displayName,
      toName: user.displayName,
      amount: numAmount,
      type: type === 'add' ? 'deposit' : 'withdrawal',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description: `Admin balance adjustment (${type})`,
    };
    db.transactions.unshift(newTx);
    saveDB();

    console.log(`[Admin] Balance update for ${user.email}: ${type} ${numAmount}. New balance: ${user.balance}`);
    res.json({ success: true, balance: user.balance });
  });

  app.post("/api/admin/investments/update", (req, res) => {
    const { uid, amount, type } = req.body; // type: 'add' | 'remove'
    let investment = db.investments.find(inv => inv.uid === uid);
    
    if (!investment) {
      investment = {
        uid,
        totalInvested: 0,
        currentValue: 0,
        monthlyReturn: 0,
        assets: []
      };
      db.investments.push(investment);
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
    
    saveDB();
    console.log(`[Admin] Portfolio update for user ${uid}: ${type} ${numAmount}`);
    res.json({ success: true, investment });
  });

  app.delete("/api/admin/user/:uid", (req, res) => {
    const { uid } = req.params;
    const index = db.users.findIndex(u => u.uid === uid);
    if (index === -1) return res.status(404).json({ error: "User not found" });
    
    db.users.splice(index, 1);
    saveDB();
    res.json({ success: true });
  });

  // Support Routes
  app.get("/api/support/messages", (req, res) => {
    res.json(db.messages);
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
    db.messages.unshift(newMessage);
    saveDB();
    res.json(newMessage);
  });

  app.post("/api/support/reply", (req, res) => {
    const { messageId, reply } = req.body;
    const message = db.messages.find(m => m.id === messageId);
    if (message) {
      message.reply = reply;
      message.status = 'replied';
      saveDB();
      res.json(message);
    } else {
      res.status(404).json({ error: "Message not found" });
    }
  });

  // Payment Methods Routes
  app.get("/api/payment-methods", (req, res) => {
    res.json(db.paymentMethods);
  });

  app.post("/api/admin/payment-methods", (req, res) => {
    const { name, details, icon } = req.body;
    const newMethod = {
      id: `pm-${Math.random().toString(36).substr(2, 9)}`,
      name,
      details,
      icon
    };
    db.paymentMethods.push(newMethod);
    saveDB();
    res.json(newMethod);
  });

  app.delete("/api/admin/payment-methods/:id", (req, res) => {
    const { id } = req.params;
    const index = db.paymentMethods.findIndex(pm => pm.id === id);
    if (index !== -1) {
      db.paymentMethods.splice(index, 1);
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Method not found" });
    }
  });

  app.get("/api/transactions/:uid", (req, res) => {
    const { uid } = req.params;
    const userTxs = db.transactions.filter(t => t.fromUid === uid || t.toUid === uid);
    res.json(userTxs);
  });

  app.get("/api/admin/transactions", (req, res) => {
    res.json(db.transactions);
  });

  app.post("/api/admin/transaction/update", (req, res) => {
    const { id, amount, description, timestamp, fromName, toName, status } = req.body;
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
      if (amount !== undefined) tx.amount = parseFloat(amount);
      if (description !== undefined) tx.description = description;
      if (timestamp !== undefined) tx.timestamp = timestamp;
      if (fromName !== undefined) tx.fromName = fromName;
      if (toName !== undefined) tx.toName = toName;
      if (status !== undefined) tx.status = status;
      saveDB();
      res.json(tx);
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  });

  app.post("/api/admin/transaction/delete", (req, res) => {
    const { id } = req.body;
    const index = db.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      db.transactions.splice(index, 1);
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  });

  app.post("/api/admin/transaction/create", (req, res) => {
    const { fromUid, toUid, amount, type, description, timestamp, fromName, toName, status } = req.body;
    
    const newTx = {
      id: `tx-man-${Math.random().toString(36).substr(2, 9)}`,
      fromUid: fromUid || 'system',
      toUid: toUid || 'external',
      fromName: fromName || 'System',
      toName: toName || 'User',
      amount: parseFloat(amount),
      type: type || 'transfer',
      status: status || 'completed',
      timestamp: timestamp || new Date().toISOString(),
      description: description || 'Manual Transaction'
    };

    db.transactions.unshift(newTx);
    saveDB();
    res.json(newTx);
  });

  app.delete("/api/transactions/:uid", (req, res) => {
    const { uid } = req.params;
    db.transactions = db.transactions.filter(t => t.fromUid !== uid && t.toUid !== uid);
    saveDB();
    res.json({ success: true });
  });

  // Investment & Withdrawal Routes
  app.get("/api/investments/:uid", (req, res) => {
    const { uid } = req.params;
    let userInv = db.investments.find(i => i.uid === uid);
    if (!userInv) {
      userInv = {
        uid,
        totalInvested: 0,
        currentValue: 0,
        monthlyReturn: 0,
        assets: []
      };
      db.investments.push(userInv);
      saveDB();
    }
    res.json(userInv);
  });

  app.post("/api/withdrawals/request", (req, res) => {
    const { uid, amount, method, details } = req.body;
    const user = db.users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newRequest = {
      id: `wr-${Math.random().toString(36).substr(2, 9)}`,
      uid,
      userName: user.displayName,
      amount,
      status: 'pending',
      timestamp: new Date().toISOString(),
      method,
      details
    };
    db.withdrawalRequests.unshift(newRequest);
    saveDB();
    res.json(newRequest);
  });

  app.get("/api/admin/withdrawals", (req, res) => {
    res.json(db.withdrawalRequests);
  });

  app.post("/api/admin/withdrawals/action", (req, res) => {
    const { requestId, action } = req.body; // action: 'approve' | 'reject'
    const request = db.withdrawalRequests.find(r => r.id === requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request already processed" });
    }

    request.status = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
      const user = db.users.find(u => u.uid === request.uid);
      if (user) {
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
        db.transactions.unshift(newTx);
      }
    }

    saveDB();
    res.json(request);
  });

  app.post("/api/transfer", (req, res) => {
    const { fromUid, toUid, amount, description, externalBankDetails } = req.body;
    const fromUser = db.users.find(u => u.uid === fromUid);
    
    if (!fromUser || fromUser.balance < amount) {
      return res.status(400).json({ error: "Invalid transfer or insufficient balance" });
    }

    if (toUid === 'external' && externalBankDetails) {
      fromUser.balance -= amount;
      const newTx = {
        id: `tx-ext-${Math.random().toString(36).substr(2, 9)}`,
        fromUid,
        toUid: 'external',
        fromName: fromUser.displayName,
        toName: externalBankDetails.bankName || 'External Bank',
        amount,
        type: 'transfer',
        status: 'pending', // External transfers might be pending
        timestamp: new Date().toISOString(),
        description: description || `Transfer to ${externalBankDetails.accountNumber}`,
        externalBankDetails
      };
      db.transactions.unshift(newTx);
      saveDB();
      return res.json({ success: true, transaction: newTx, balance: fromUser.balance });
    }

    const toUser = db.users.find(u => u.uid === toUid);
    if (!toUser) {
      return res.status(400).json({ error: "Recipient not found" });
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

    db.transactions.unshift(newTx);
    saveDB();
    res.json({ success: true, transaction: newTx, balance: fromUser.balance });
  });

  app.post("/api/upload-avatar", upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image provided" });
      
      // Try Cloudinary first if keys are present
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
          const b64 = Buffer.from(req.file.buffer).toString("base64");
          const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
          
          const result = await cloudinary.uploader.upload(dataURI, {
            resource_type: "auto",
          });
          
          console.log(`[Upload] Image uploaded to Cloudinary: ${result.secure_url}`);
          return res.json({ url: result.secure_url });
        } catch (cloudinaryErr) {
          console.error("Cloudinary upload failed, falling back to local storage:", cloudinaryErr);
        }
      }

      // Fallback: Save locally
      const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      
      const host = req.headers.host;
      // Use https for railway or other proxies
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const localUrl = `${protocol}://${host}/uploads/${fileName}`;
      
      console.log(`[Upload] Image saved locally: ${localUrl}`);
      res.json({ url: localUrl });
    } catch (error: any) {
      console.error("Upload error details:", error.message || error);
      res.status(500).json({ error: "Upload failed: " + (error.message || "Internal server error") });
    }
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
