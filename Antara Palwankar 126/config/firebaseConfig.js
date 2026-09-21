const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

let db;
let auth;

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  if (admin.apps.length === 0) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized with serviceAccountKey.json');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin initialized with environment credentials');
    } else {
      // In-memory Firestore simulation fallback if no external serviceAccount key is loaded yet
      console.warn('⚠️ No serviceAccountKey.json found. Initializing in-memory mock Firestore for testing/dev.');
      db = createMockFirestore();
    }
  }

  if (!db && admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
  }
} catch (error) {
  console.warn('⚠️ Firebase init warning:', error.message);
  console.warn('Falling back to local in-memory store for high-performance offline development & testing.');
  db = createMockFirestore();
}

/**
 * In-memory Mock Firestore with transaction support for robust local testing
 */
function createMockFirestore() {
  const store = {
    users: new Map(),
    events: new Map([
      ['event_techconf_2026', {
        id: 'event_techconf_2026',
        title: 'Global Cloud & AI Summit 2026',
        description: 'Annual flagship backend conference',
        category: 'Technology',
        eventDate: '2026-06-15T09:00:00Z',
        venue: 'Bandra Kurla Complex, Mumbai',
        city: 'Mumbai',
        organizerId: 'usr_organizer_01',
        organizerName: 'Tech Events Global',
        ticketPrice: 1499,
        totalCapacity: 500,
        availableTickets: 482,
        createdAt: '2026-03-01T12:00:00Z',
        status: 'active',
      }],
      ['event_musicfest_2026', {
        id: 'event_musicfest_2026',
        title: 'Sunburn Arena Music Festival 2026',
        description: 'Electronic music and DJ festival',
        category: 'Music',
        eventDate: '2026-07-20T17:00:00Z',
        venue: 'Mahalaxmi Racecourse, Mumbai',
        city: 'Mumbai',
        organizerId: 'usr_organizer_01',
        organizerName: 'Tech Events Global',
        ticketPrice: 2499,
        totalCapacity: 1000,
        availableTickets: 950,
        createdAt: '2026-03-05T10:00:00Z',
        status: 'active',
      }],
    ]),
    tickets: new Map(),
  };

  const getCollection = (colName) => {
    if (!store[colName]) {
      store[colName] = new Map();
    }
    return store[colName];
  };

  return {
    collection: (colName) => {
      const col = getCollection(colName);
      return {
        doc: (id) => {
          const docId = id || `${colName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          return {
            id: docId,
            get: async () => {
              const data = col.get(docId);
              return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
              };
            },
            set: async (data, options) => {
              const existing = col.get(docId) || {};
              const merged = options && options.merge ? { ...existing, ...data } : { ...data, id: docId };
              col.set(docId, merged);
              return merged;
            },
            update: async (updates) => {
              const existing = col.get(docId);
              if (!existing) throw new Error(`Document ${docId} does not exist`);
              const updated = { ...existing, ...updates };
              col.set(docId, updated);
              return updated;
            },
            delete: async () => {
              col.delete(docId);
              return true;
            },
          };
        },
        get: async () => {
          const docs = Array.from(col.values()).map((data) => ({
            id: data.id,
            exists: true,
            data: () => ({ ...data }),
          }));
          return {
            empty: docs.length === 0,
            size: docs.length,
            docs,
          };
        },
        where: function (field, op, value) {
          return {
            get: async () => {
              const filtered = Array.from(col.values()).filter((item) => {
                if (op === '==') return item[field] === value;
                if (op === '>=') return item[field] >= value;
                if (op === '<=') return item[field] <= value;
                if (op === '!=') return item[field] !== value;
                if (op === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value);
                return false;
              });
              const docs = filtered.map((data) => ({
                id: data.id,
                exists: true,
                data: () => ({ ...data }),
              }));
              return {
                empty: docs.length === 0,
                size: docs.length,
                docs,
              };
            },
            where: this.where,
          };
        },
      };
    },
    runTransaction: async (updateFunction) => {
      // Create transaction context
      const transaction = {
        get: async (docRef) => {
          return await docRef.get();
        },
        update: (docRef, updates) => {
          docRef.update(updates);
        },
        set: (docRef, data, options) => {
          docRef.set(data, options);
        },
        delete: (docRef) => {
          docRef.delete();
        },
      };
      return await updateFunction(transaction);
    },
  };
}

module.exports = { admin, db, auth };
