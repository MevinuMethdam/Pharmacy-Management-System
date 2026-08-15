const express = require('express');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const sequelize = require('./config/db');

const Medicine = require('./models/Medicine');
require('./models/Sale');
require('./models/SaleItem');

require('./models/Doctor');
require('./models/Patient');
require('./models/Prescription');
require('./models/ControlledDrugLog');
require('./models/PrescriptionItem');

require('./models/Customer');
require('./models/RefillReminder');

const Supplier = require('./models/Supplier');

// --- පරණ Relationships ---
Supplier.hasMany(Medicine, { foreignKey: 'supplierId', as: 'medicines' });
Medicine.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// --- NEW: GRN & Payments Models (කිසිම පරණ කෝඩ් එකකට හානියක් නැත) ---
const PurchaseInvoice = require('./models/PurchaseInvoice');
const PurchaseItem = require('./models/PurchaseItem');
const SupplierPayment = require('./models/SupplierPayment');

// Supplier <-> PurchaseInvoice Relationship
Supplier.hasMany(PurchaseInvoice, { foreignKey: 'supplierId', as: 'invoices' });
PurchaseInvoice.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// PurchaseInvoice <-> PurchaseItem Relationship
PurchaseInvoice.hasMany(PurchaseItem, { foreignKey: 'purchaseInvoiceId', as: 'items' });
PurchaseItem.belongsTo(PurchaseInvoice, { foreignKey: 'purchaseInvoiceId', as: 'invoice' });

// Medicine <-> PurchaseItem Relationship
Medicine.hasMany(PurchaseItem, { foreignKey: 'medicineId', as: 'purchaseHistory' });
PurchaseItem.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

// Supplier <-> SupplierPayment Relationship
Supplier.hasMany(SupplierPayment, { foreignKey: 'supplierId', as: 'payments' });
SupplierPayment.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
// ----------------------------------------------------------------------

require('./models/AIOutbreakLog');

const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const salesRoutes = require('./routes/salesRoutes');

const directoryRoutes = require('./routes/directoryRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const crmRoutes = require('./routes/crmRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const nmraLogRoutes = require('./routes/nmraLogRoutes');
const aiOutbreakRoutes = require('./routes/aiOutbreakRoutes');

// --- NEW: Routes Imports ---
const purchaseRoutes = require('./routes/purchaseRoutes');
const supplierPaymentRoutes = require('./routes/supplierPaymentRoutes');
// -------------------------

// 🚀 මෙතනින් තමයි app එක initialize වෙන්නේ
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/nmra-logs', nmraLogRoutes);
app.use('/api/ai-outbreak', aiOutbreakRoutes);

// --- NEW: API Endpoints (app.use එන්න ඕනේ app එක හැදුවට පස්සේ මෙතනයි) ---
app.use('/api/purchases', purchaseRoutes);
app.use('/api/supplier-payments', supplierPaymentRoutes);
// -------------------------

io.on('connection', (socket) => {
    console.log('⚡ A user connected to real-time system:', socket.id);
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

app.get('/', (req, res) => {
    res.send('Kegalle Pharmacy API is running perfectly... 🚀');
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true })
    .then(() => {
        console.log('✅ Database Synchronized! All tables are ready.');
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Database Sync Failed:', err);
    });