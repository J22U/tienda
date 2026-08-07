const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan'); // Logging
require('dotenv').config();

const adminSessions = require('./sessions');

// OneSignal Configuration
// OneSignal Configuration (from .env - REST API Key required)
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
if (!ONESIGNAL_APP_ID) {
  console.error('❌ ONESIGNAL_APP_ID missing from .env');
}

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || null;

if (!ONESIGNAL_REST_API_KEY || ONESIGNAL_REST_API_KEY === 'YOUR_REST_API_KEY_HERE') {
    console.warn('⚠️ OneSignal REST API Key missing! Add to .env file.');
}

// Function to send push notification via OneSignal
function sendPushNotification(pedidoData) {
    const { numeroPedido, nombreCliente, total, productos } = pedidoData;
    
   const notification = {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: adminSessions.getActiveUserIds().length > 0 ? adminSessions.getActiveUserIds() : ["admin_trebol"],
        channel_for_external_user_ids: "push",
        // AGREGAMOS 'en' a headings
        headings: { 
            en: '🛒 Nuevo Pedido - Trébol',
            es: '🛒 Nuevo Pedido - Trébol' 
        },
        // AGREGAMOS 'en' a contents
        contents: { 
            en: `Pedido #${numeroPedido} de ${nombreCliente}\nTotal: $${Number(total).toLocaleString()}\n${productos} producto(s)`,
            es: `Pedido #${numeroPedido} de ${nombreCliente}\nTotal: $${Number(total).toLocaleString()}\n${productos} producto(s)` 
        },
        url: 'https://tienda-1vps.onrender.com/admin',
        priority: 10,
        ttl: 259200
    };

    const postData = JSON.stringify(notification);
    
    const options = {
        hostname: 'api.onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` // <-- FIX CLAVE
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.recipients > 0) {
                    console.log(`✅ [Push] ¡Entregado a ${response.recipients} admins! ID: ${response.id}`);
                } else {
                    console.warn(`📡 [Push] No admins encontrados (${adminSessions.getActiveUserIds().length}). Errores:`, response.errors || 'Ninguno');
                }
            } catch (e) { console.error('❌ Error en respuesta OneSignal:', data); }
        });
    });

    req.on('error', (e) => { console.error('⚠️ Error de red OneSignal:', e.message); });
    req.write(postData);
    req.end();
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🆕 SOCKET.IO AUTENTICADO - Solo admins logueados
io.use((socket, next) => {
    // 🔥 SIMPLE AUTH BYPASS for localStorage admin_logged (CSP/Socket fix)
    const simpleAuth = socket.handshake.auth.simpleAuth;
    const token = socket.handshake.auth.token || socket.handshake.headers['x-session-token'];
    
    if (simpleAuth === true) {
        // Trust localStorage flag for development/local
        socket.userId = 'admin_simple';
        console.log(`🔌 Admin conectado (simple auth): localStorage verified`);
        return next();
    }
    
    if (!token) {
        console.log(`❌ Socket rechazado - no token`);
        return next(new Error('Sesión inválida'));
    }

    jwt.verify(token, process.env.JWT_SECRET || 'MiClaveSuperSecretaParaJWT_32charsMin', (err, user) => {
        if (err) {
            const session = adminSessions.get(token);
            if (session && session.logged) {
                socket.userId = session.userId;
                socket.sessionToken = token;
                console.log(`🔌 Admin conectado (legacy session): ${socket.userId}`);
                return next();
            }
            console.log(`❌ Socket rechazado - JWT inválido (${err.message})`);
            return next(new Error('Sesión inválida'));
        }

        socket.userId = user.userId;
        socket.sessionToken = token;
        console.log(`🔌 Admin conectado: ${socket.userId}`);
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`✅ Socket admin: ${socket.userId}`);
    
    socket.on('disconnect', () => {
        console.log(`👋 Admin desconectado: ${socket.userId}`);
    });
    
    // Solo enviar nuevo-pedido a admins conectados
    socket.on('ping', () => {
        socket.emit('pong', { active: adminSessions.stats() });
    });
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.socket.io', 'https://jsdelivr.net', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://cdn.onesignal.com', 'https://onesignal.com'],
imgSrc: ["'self'", 'data:', 'http://localhost:3000', 'https://localhost:3000', 'https://tienda-1vps.onrender.com', 'https://res.cloudinary.com', 'https://images.unsplash.com', 'https://cloudinary.com', 'blob:', 'https://placehold.co'],
      connectSrc: ["'self'", 'wss://tienda-1vps.onrender.com', 'https://tienda-1vps.onrender.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'https://cdn.onesignal.com', 'https://onesignal.com', 'https://api.onesignal.com', 'https://res.cloudinary.com']
    }
  }
})); // CSP FIXED: + res.cloudinary.com para jsPDF images + connect-src
app.use(morgan('combined'));

const limiterLogin = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // Default 15 min
  max: 5,
  message: 'Demasiados intentos de login, intente en 15 min',
  standardHeaders: true
});

app.use('/api/login', limiterLogin);

// Configuración MIME types para PWA
app.use((req, res, next) => {
    if (req.url.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/manifest+json');
    }
    if (req.url.endsWith('.js') && req.url.includes('sw.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/admin', authOrRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.html', authOrRedirect, (req, res) => {
  res.redirect('/admin');
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.use(express.static(__dirname));

const config = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME || 'DB_TIENDA',
    options: { encrypt: true, trustServerCertificate: true }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(async pool => {
        console.log('¡Conectado a SQL Server!');
        
        // Verificar y crear columna DescuentoPorcentaje si no existe
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Productos' AND COLUMN_NAME = 'DescuentoPorcentaje')
                BEGIN
                    ALTER TABLE Productos ADD DescuentoPorcentaje decimal(5,2) NULL
                END
            `);
            console.log('Columna DescuentoPorcentaje verificada/creada en Productos');
        } catch (err) {
            console.warn('Nota: No se pudo verificar columna DescuentoPorcentaje:', err.message);
        }

// ✅ AUTO-CREATE CLIENTES TABLE (Deploy-safe)
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Clientes' AND xtype='U')
                BEGIN
                    CREATE TABLE Clientes (
                        ClienteID INT IDENTITY(1,1) PRIMARY KEY,
                        Nombre NVARCHAR(200) NOT NULL,
                        Correo NVARCHAR(200),
                        Telefono NVARCHAR(50),
                        Documento NVARCHAR(50),
                        Direccion NVARCHAR(500),
                        FechaCreacion DATETIME DEFAULT GETDATE(),
                        FechaUltimoUso DATETIME DEFAULT GETDATE(),
                        Usos INT DEFAULT 1
                    );
                    CREATE NONCLUSTERED INDEX IX_Clientes_Nombre ON Clientes(Nombre);
                    PRINT '✅ Clientes table + index created';
                    console.log('✅ Clientes table auto-created');
                END
                ELSE
                    PRINT 'ℹ️ Clientes table exists';
            `);
            console.log('✅ Clientes table verified/auto-created');
        } catch (err) {
            console.warn('Tabla Clientes:', err.message);
        }

        // Verificar y crear tabla Promociones si no existe
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Promociones]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE Promociones (
                        PromocionID INT IDENTITY(1,1) PRIMARY KEY,
                        Titulo NVARCHAR(255) NOT NULL,
                        Descripcion NVARCHAR(MAX) NULL,
                        ImagenURL NVARCHAR(500) NULL,
                        Activa BIT NOT NULL DEFAULT 0,
                        FechaInicio DATETIME NULL,
                        FechaFin DATETIME NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                    );
                END
            `);
            console.log('Tabla Promociones verificada/creada');
        } catch (err) {
            console.warn('Nota: No se pudo verificar o crear tabla Promociones:', err.message);
        }
        
        return pool;
    })
    .catch(err => console.error('Error al conectar:', err));

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'productos_trebol',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// 🔐 JWT MIDDLEWARE DEFINITION - FIXED
const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  for (const cookie of cookies) {
    const [name, ...val] = cookie.split('=');
    if (name === 'admin_token') {
      return decodeURIComponent(val.join('='));
    }
  }
  return null;
};

const authJWT = (req, res, next) => {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    console.log('🚫 NO TOKEN - 401');
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'MiClaveSuperSecretaParaJWT_32charsMin', (err, user) => {
    if (err) {
      console.log('🚫 INVALID TOKEN - 403:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    console.log('✅ AUTH OK:', user.userId);
    next();
  });
};

const authOrRedirect = (req, res, next) => {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return res.redirect('/admin-login');
  }

  jwt.verify(token, process.env.JWT_SECRET || 'MiClaveSuperSecretaParaJWT_32charsMin', (err, user) => {
    if (err) {
      return res.redirect('/admin-login');
    }
    req.user = user;
    next();
  });
};

app.use('/productos', (req, res, next) => {
  if (req.method === 'GET') return next();
  authJWT(req, res, next);
});

app.use('/promociones', (req, res, next) => {
  if (req.method === 'GET') return next();
  authJWT(req, res, next);
});

app.use('/pedidos', (req, res, next) => {
  if (req.method === 'POST') return next();
  authJWT(req, res, next);
});

app.use('/backup', authJWT);
app.use('/restore', authJWT);

console.log('✅ authJWT middleware loaded early');

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

app.get('/productos', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Fallback para tabla vacía/no existente
        try {
        const result = await pool.request().query(`
                SELECT p.*, 
                ISNULL((SELECT TOP 1 ImagenURL FROM ProductoImagenes pi WHERE pi.ProductoID = p.ProductoID), '') as FotoReal,
                ISNULL((SELECT STRING_AGG(CAST(pi2.ImagenURL AS NVARCHAR(MAX)), '|') 
                        FROM (SELECT TOP 10 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID ORDER BY ImagenID) pi2), '') as GaleriaCompleta
                FROM Productos p
            `);
            const productos = result.recordset.map(p => {
                const galeriaCompleta = p.GaleriaCompleta ? p.GaleriaCompleta.split('|').filter(url => url && url.trim()) : [];
                return {
                    ...p,
                    ImagenURL: p.ImagenURL || p.FotoReal || galeriaCompleta[0] || '',
                    Galeria: galeriaCompleta.length > 0 ? galeriaCompleta : []
                };
            });
            res.json(productos);
            return;
        } catch (dbErr) {
            console.log('Tabla Productos no encontrada, retornando array vacío:', dbErr.message);
            res.json([]);
            return;
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/productos', upload.array('imagenes', 6), async (req, res) => {
    console.log('➕ CREATE PRODUCT:', { user: req.user?.userId, bodyKeys: Object.keys(req.body) });
    const nombre = req.body.Nombre || req.body.nombre;
    const marca = req.body.Marca || req.body.marca;
    const sku = req.body.CodigoSKU || req.body.sku;
    const precio = req.body.Precio || req.body.precio;
    const stock = req.body.Stock || req.body.stock;
    const caracteristicas = req.body.Caracteristicas || req.body.caracteristicas;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('n', sql.NVarChar, nombre)
            .input('m', sql.NVarChar, marca)
            .input('s', sql.NVarChar, sku || null)
            .input('p', sql.Decimal(18, 2), parseFloat(precio) || 0)
            .input('st', sql.Int, parseInt(stock) || 0)
            .input('c', sql.NVarChar, caracteristicas || '')
            .query(`
                INSERT INTO Productos (Nombre, Marca, CodigoSKU, Precio, Stock, Caracteristicas) 
                VALUES (@n, @m, @s, @p, @st, @c);
                SELECT SCOPE_IDENTITY() AS ProductoID;
            `);

        const nuevoId = result.recordset[0].ProductoID;
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await pool.request()
                    .input('id', sql.Int, nuevoId)
                    .input('url', sql.NVarChar, file.path)
                    .query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
            }
        }
        res.json({ success: true, id: nuevoId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Ruta para aplicar descuento a producto 🔍 DEBUG
app.put('/productos/:id/descuento', async (req, res) => {
    console.log('🛡️ DESCUENTO:', { id: req.params.id, descuento: req.body.descuento, user: req.user?.userId });
    const { id } = req.params;
    const { descuento } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('desc', sql.Decimal(5, 2), parseFloat(descuento) || 0)
            .query('UPDATE Productos SET DescuentoPorcentaje = @desc WHERE ProductoID = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/productos/:id', upload.array('imagenes', 6), async (req, res) => {
    const { id } = req.params;
    
    console.log('🔧 PUT /productos/:id - START', { id, bodyKeys: Object.keys(req.body || {}), hasFiles: req.files ? req.files.length : 0 });
    
    let pool;
    try {
        pool = await poolPromise;
    } catch (dbErr) {
        console.error('💥 DB POOL FAILED:', dbErr);
        return res.status(500).json({ error: 'Database connection failed' });
    }
    
    try {
        if (!id || isNaN(parseInt(id))) {
            console.error('❌ INVALID ID:', id);
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const intId = parseInt(id);
        const nombre = (req.body.Nombre || req.body.nombre || '').trim();
        const marca = req.body.Marca || req.body.marca || '';
        const sku = req.body.CodigoSKU || req.body.sku || null;
        const precioRaw = req.body.Precio || req.body.precio;
        const stockRaw = req.body.Stock || req.body.stock;
        const caracteristicas = req.body.Caracteristicas || req.body.caracteristicas || '';

        if (!nombre) {
            console.error('❌ MISSING NOMBRE');
            return res.status(400).json({ error: 'Nombre requerido' });
        }

        const precio = parseFloat(precioRaw);
        const stock = parseInt(stockRaw);
        
        if (isNaN(precio) || precio < 0) {
            console.error('❌ INVALID PRECIO:', precioRaw);
            return res.status(400).json({ error: 'Precio inválido' });
        }
        if (isNaN(stock) || stock < 0) {
            console.error('❌ INVALID STOCK:', stockRaw);
            return res.status(400).json({ error: 'Stock inválido' });
        }

        console.log('📋 Parsed inputs OK:', { intId, nombre, precio, stock });
        
        // CHECK EXISTS + SELECT CURRENT STATE
        console.log('🔍 Checking product existence/state...');
        const existsResult = await pool.request()
            .input('id', sql.Int, intId)
            .query('SELECT COUNT(*) as cnt FROM Productos WHERE ProductoID=@id');
        const existsCnt = existsResult.recordset[0].cnt;
        
        let currentProduct = null;
        if (existsCnt > 0) {
            const productResult = await pool.request()
                .input('id', sql.Int, intId)
                .query('SELECT * FROM Productos WHERE ProductoID=@id');
            currentProduct = productResult.recordset[0];
        }
        console.log('✅ EXISTS:', existsCnt || 0, 'Current:', {
            exists: !!currentProduct,
            nombre: currentProduct?.Nombre,
            precio: currentProduct?.Precio,
            stock: currentProduct?.Stock
        });
        
        if (!currentProduct) {
            console.error('❌ PRODUCTO 404:', intId);
            return res.status(404).json({ error: `Producto ${intId} no existe` });
        }

        // UPDATE
        console.log('📝 Executing UPDATE...');
        const result = await pool.request()
            .input('id', sql.Int, intId)
            .input('n', sql.NVarChar(255), nombre)
            .input('m', sql.NVarChar(100), marca)
            .input('s', sql.NVarChar(50), sku)
            .input('p', sql.Decimal(18,2), precio)
            .input('st', sql.Int, stock)
            .input('c', sql.NVarChar, caracteristicas)
            .query(`UPDATE Productos SET 
                Nombre=@n, Marca=@m, CodigoSKU=@s, 
                Precio=@p, Stock=@st, Caracteristicas=@c 
                WHERE ProductoID=@id`); 

        console.log('✅ UPDATE rows affected:', result.rowsAffected[0]);

        // IMAGES (if present - multiple)
        if (req.files && req.files.length > 0) {
            console.log(`🖼️ Images: ${req.files.length}`, req.files.map(f => f.path));
            try {
                await pool.request().input('id', sql.Int, intId)
                    .query('DELETE FROM ProductoImagenes WHERE ProductoID=@id');
                    
                for (const file of req.files) {
                    await pool.request()
                        .input('id', sql.Int, intId)
                        .input('url', sql.NVarChar(500), file.path)
                        .query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
                }
                    
                console.log('✅ Images OK');
            } catch (imgErr) {
                console.error('⚠️ Images failed but continued:', imgErr.message);
            }
        }
        
        console.log('🎉 SUCCESS producto:', intId);
        res.json({ success: true, id: intId });
        
    } catch (error) {
        console.error('💥 PUT /productos/:id FAILED:', {
            id: req.params.id,
            error: error.message,
            stack: error.stack?.split('\n')[0]
        });
        res.status(500).json({ 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error servidor' 
        });
    }
});

// DELETE producto 🔍 DEBUG
app.delete('/productos/:id', async (req, res) => {
    console.log('🗑️ DELETE:', { id: req.params.id, user: req.user?.userId });
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM ProductoImagenes WHERE ProductoID=@id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Productos WHERE ProductoID=@id');
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// ==========================================
// RUTAS DE PROMOCIONES
// ==========================================

app.get('/promociones', async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = 'SELECT * FROM Promociones ORDER BY CreatedAt DESC';
        const activa = req.query.activa;
        if (activa !== undefined) {
            if (activa === 'true' || activa === '1') {
                query = 'SELECT * FROM Promociones WHERE Activa = 1 ORDER BY CreatedAt DESC';
            } else if (activa === 'false' || activa === '0') {
                query = 'SELECT * FROM Promociones WHERE Activa = 0 ORDER BY CreatedAt DESC';
            }
        }
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/promociones', upload.single('imagen'), async (req, res) => {
    try {
        const { Titulo, Descripcion, Activa, FechaInicio, FechaFin } = req.body;
        if (!Titulo) {
            return res.status(400).json({ error: 'Titulo requerido' });
        }

        const imagen = req.file ? req.file.path : null;

        const pool = await poolPromise;
        const insertResult = await pool.request()
            .input('titulo', sql.NVarChar(255), Titulo)
            .input('descripcion', sql.NVarChar(sql.MAX), Descripcion || '')
            .input('imagen', sql.NVarChar(500), imagen)
            .input('activa', sql.Bit, Activa === 'true' || Activa === '1' ? 1 : 0)
            .input('fechaInicio', sql.DateTime, FechaInicio ? new Date(FechaInicio) : null)
            .input('fechaFin', sql.DateTime, FechaFin ? new Date(FechaFin) : null)
            .query(`INSERT INTO Promociones (Titulo, Descripcion, ImagenURL, Activa, FechaInicio, FechaFin)
                    VALUES (@titulo, @descripcion, @imagen, @activa, @fechaInicio, @fechaFin);
                    SELECT SCOPE_IDENTITY() AS PromocionID;`);

        res.json({ success: true, id: insertResult.recordset[0].PromocionID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/promociones/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    try {
        const { Titulo, Descripcion, Activa, FechaInicio, FechaFin } = req.body;
        if (!Titulo) {
            return res.status(400).json({ error: 'Titulo requerido' });
        }

        const imagen = req.file ? req.file.path : null;

        const pool = await poolPromise;
        let queryString = `UPDATE Promociones SET Titulo=@titulo, Descripcion=@descripcion, Activa=@activa, FechaInicio=@fechaInicio, FechaFin=@fechaFin`;
        if (imagen) {
            queryString += ', ImagenURL=@imagen';
        }
        queryString += ' WHERE PromocionID=@id';

        const request = pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('titulo', sql.NVarChar(255), Titulo)
            .input('descripcion', sql.NVarChar(sql.MAX), Descripcion || '')
            .input('activa', sql.Bit, Activa === 'true' || Activa === '1' ? 1 : 0)
            .input('fechaInicio', sql.DateTime, FechaInicio ? new Date(FechaInicio) : null)
            .input('fechaFin', sql.DateTime, FechaFin ? new Date(FechaFin) : null);

        if (imagen) {
            request.input('imagen', sql.NVarChar(500), imagen);
        }

        await request.query(queryString);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/promociones/:id/activar', async (req, res) => {
    const { id } = req.params;
    const { activa } = req.body;
    if (activa === undefined) return res.status(400).json({ error: 'activa requerido' });

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('activa', sql.Bit, activa === true || activa === 'true' || activa === '1' ? 1 : 0)
            .query('UPDATE Promociones SET Activa=@activa WHERE PromocionID=@id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/promociones/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, parseInt(req.params.id)).query('DELETE FROM Promociones WHERE PromocionID=@id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// RUTAS DE PEDIDOS (CON TRANSACCIÓN)
// ==========================================

app.post('/pedidos', async (req, res) => {
    const { nombre, correo, telefono, documento, direccion, productos, total } = req.body;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        
        // Primero verificar stock y calcular precios con descuento
        for (const item of productos) {
            const stockCheck = await transaction.request()
                .input('id', sql.Int, item.ProductoID)
                .query('SELECT Stock, Nombre, Precio, ISNULL(DescuentoPorcentaje, 0) as DescuentoPorcentaje FROM Productos WHERE ProductoID = @id');
            
            const pActual = stockCheck.recordset[0];
            if (!pActual || pActual.Stock < item.cantidad) {
                throw new Error(`Stock insuficiente: ${pActual?.Nombre}`);
            }

            // Calcular precio con descuento del producto
            const precioBase = parseFloat(pActual.Precio) || 0;
            const descuento = parseFloat(pActual.DescuentoPorcentaje) || 0;
            const precioConDescuento = precioBase - (precioBase * descuento / 100);

            // Actualizar el producto en el pedido con el precio con descuento
            item.Precio = precioConDescuento;
            item.PrecioOriginal = precioBase;
            item.DescuentoAplicado = descuento;
        }
        
        // Insertar el pedido
        const resultPedido = await transaction.request()
            .input('nc', sql.NVarChar, nombre)
            .input('co', sql.NVarChar, correo)
            .input('te', sql.NVarChar, telefono)
            .input('do', sql.NVarChar, documento)
            .input('di', sql.NVarChar, direccion)
            .input('pr', sql.NVarChar, JSON.stringify(productos))
            .input('to', sql.Decimal(18, 2), total)
            .query(`INSERT INTO Pedidos (NombreCliente, Correo, Telefono, Documento, Direccion, Productos, Total, Fecha, Estado) VALUES (@nc, @co, @te, @do, @di, @pr, @to, GETDATE(), 'Pendiente'); SELECT SCOPE_IDENTITY() AS PedidoID;`);

        const nuevoPedidoId = resultPedido.recordset[0].PedidoID;
        
        // Actualizar stock
        for (const prod of productos) {
            await transaction.request()
                .input('cant', sql.Int, prod.cantidad)
                .input('pId', sql.Int, prod.ProductoID)
                .query(`UPDATE Productos SET Stock = Stock - @cant WHERE ProductoID = @pId`);
        }
        
        await transaction.commit();
        
        // ==========================================
        // NOTIFICACIONES EN TIEMPO REAL
        // ==========================================
        
        // Calcular el número de pedido para mostrar (basado en el total de pedidos existentes)
        // El pedido más reciente = 1, el segundo más reciente = 2, etc.
        const countResult = await pool.request()
            .query('SELECT COUNT(*) as TotalPedidos FROM Pedidos');
        const numeroPedidoDisplay = countResult.recordset[0].TotalPedidos;
        
        // Emitir evento Socket.io a todos los clientes conectados
        io.emit('nuevo-pedido', {
            PedidoID: nuevoPedidoId,
            NumeroDisplay: numeroPedidoDisplay,
            NombreCliente: nombre,
            Total: total,
            productos: productos.length,
            Fecha: new Date()
        });
        
        // Enviar notificación push via OneSignal (solo si está configurada)
        if (ONESIGNAL_REST_API_KEY && ONESIGNAL_REST_API_KEY !== 'YOUR_REST_API_KEY_HERE') {
            console.log('📱 Enviando push notification via OneSignal...');
            sendPushNotification({
                numeroPedido: numeroPedidoDisplay,
                nombreCliente: nombre,
                total: total,
                productos: productos.length
            });
        } else {
            console.log('⏭️ Skipping OneSignal - No valid REST API key in .env');
        }
        
        console.log(`🔔 Nuevo pedido #${numeroPedidoDisplay} (ID: ${nuevoPedidoId}) - Notificación enviada`);
        
        res.json({ success: true, pedidoId: nuevoPedidoId });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/pedidos', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT *, 
            -- Queremos numero histórico: pedido más antiguo = 1, más reciente = N
            (SELECT COUNT(*) FROM Pedidos p2 WHERE p2.Fecha <= p1.Fecha) as NumeroDisplay
            FROM Pedidos p1 
            ORDER BY Fecha DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/pedidos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT p1.*, (SELECT COUNT(*) FROM Pedidos p2 WHERE p2.Fecha <= p1.Fecha) as NumeroDisplay FROM Pedidos p1 WHERE p1.PedidoID = @id');
        if (!result.recordset || result.recordset.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/pedidos/:id/completar', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Pedidos SET Estado = 'Completado' WHERE PedidoID = @id");
        res.json({ success: true });
    } catch (err) { 
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.put('/pedidos/:id/pendiente', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Pedidos SET Estado = 'Pendiente' WHERE PedidoID = @id");
        res.json({ success: true });
    } catch (err) { 
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/pedidos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Pedidos WHERE PedidoID = @id');
        res.json({ success: true, message: 'Pedido eliminado correctamente' });
    } catch (err) {
        console.error("Error al eliminar pedido:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/pedidos/:id/total-manual', async (req, res) => {
    const { id } = req.params;
    const { totalManual } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('tm', sql.Decimal(18, 2), totalManual)
            .query('UPDATE Pedidos SET TotalManual = @tm WHERE PedidoID = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nuevo endpoint para cancelar pedido
app.put('/pedidos/:id/cancelar', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        // Obtener detalles del pedido para restaurar stock
        const pedidoResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Pedidos WHERE PedidoID = @id');
        
        if (pedidoResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        const pedido = pedidoResult.recordset[0];
        const items = JSON.parse(pedido.Productos || '[]');
        
        if (items.length === 0) {
            // Sin items, solo cambiar estado
            await pool.request()
                .input('id', sql.Int, id)
                .query("UPDATE Pedidos SET Estado = 'Cancelado' WHERE PedidoID = @id");
        } else {
            // Transacción para restaurar stock
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            
            try {
                // Restaurar stock por cada item
                for (const item of items) {
                    await transaction.request()
                        .input('pId', sql.Int, item.ProductoID)
                        .input('cant', sql.Int, item.cantidad || 0)
                        .query('UPDATE Productos SET Stock = Stock + @cant WHERE ProductoID = @pId');
                }
                
                // Cambiar estado a Cancelado
                await transaction.request()
                    .input('id', sql.Int, id)
                    .query("UPDATE Pedidos SET Estado = 'Cancelado' WHERE PedidoID = @id");
                
                await transaction.commit();
            } catch (txErr) {
                await transaction.rollback();
                throw txErr;
            }
        }
        
        // Emitir evento socket para refresh real-time
        io.emit('pedido-updated', { PedidoID: id, Estado: 'Cancelado' });
        
        res.json({ success: true, message: 'Pedido cancelado y stock restaurado' });
    } catch (err) {
        console.error('Error cancelar pedido:', err);
        res.status(500).json({ error: err.message });
    }
});


// 🔥 PEDIDO-LEVEL DISCOUNT (new endpoint)
app.put('/pedidos/:id/descuento-pedido', async (req, res) => {
    const { id } = req.params;
    const { descuento } = req.body;
    try {
        const pool = await poolPromise;
        
        // Ensure column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                          WHERE TABLE_NAME = 'Pedidos' AND COLUMN_NAME = 'DescuentoPorcentajePedido')
            BEGIN
                ALTER TABLE Pedidos ADD DescuentoPorcentajePedido decimal(5,2) NULL DEFAULT 0;
                UPDATE Pedidos SET DescuentoPorcentajePedido = 0 WHERE DescuentoPorcentajePedido IS NULL;
            END
        `);
        
        const pedidoResult = await pool.request().input('id', sql.Int, id).query('SELECT Total as TotalOriginal FROM Pedidos WHERE PedidoID = @id');
        const totalOriginal = parseFloat(pedidoResult.recordset[0]?.TotalOriginal) || 0;
        const descuentoPct = parseFloat(descuento) || 0;
        const totalFinal = totalOriginal * (1 - descuentoPct / 100);
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('desc', sql.Decimal(5, 2), descuentoPct)
            .input('totalFinal', sql.Decimal(18, 2), totalFinal)
            .query(`
                UPDATE Pedidos 
                SET DescuentoPorcentajePedido = @desc, Total = @totalFinal 
                WHERE PedidoID = @id
            `);
            
        console.log(`💰 Pedido ${id} descuento ${descuentoPct}%: $${totalOriginal.toLocaleString()} → $${totalFinal.toLocaleString()}`);
        res.json({ 
            success: true, 
            totalOriginal, 
            descuento: descuentoPct, 
            totalFinal 
        });
    } catch (err) {
        console.error('Descuento pedido error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔥 PEDIDO DISCOUNT ENDPOINT (uses existing columns)
app.put('/pedidos/:id/descuento', async (req, res) => {
    const { id } = req.params;
    const { descuentoPorcentaje } = req.body; // Frontend sends %
    
    try {
        const pool = await poolPromise;
        
        // Get current pedido data including Productos
        const pedido = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT Total as totalBase, Productos FROM Pedidos WHERE PedidoID = @id');
            
        if (pedido.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        const totalBase = parseFloat(pedido.recordset[0].totalBase);
        const descuento = parseFloat(descuentoPorcentaje) || 0;
        const totalManual = totalBase * (1 - descuento / 100);
        
        // Update products JSON to set PrecioOriginal if not set (for card display consistency)
        let productos = pedido.recordset[0].Productos;
        if (productos) {
            if (typeof productos === 'string') {
                productos = JSON.parse(productos);
            }
            // Set PrecioOriginal for all products if not already set
            productos.forEach(item => {
                if (!item.PrecioOriginal) {
                    item.PrecioOriginal = item.Precio;
                }
            });
            productos = JSON.stringify(productos);
        }
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('desc', sql.Decimal(5,2), descuento)
            .input('totalManual', sql.Decimal(18,2), totalManual)
            .input('productos', sql.NVarChar, productos)
            .query('UPDATE Pedidos SET DescuentoPorcentaje = @desc, TotalManual = @totalManual, Productos = @productos WHERE PedidoID = @id');
            
        // Update /pedidos to show TotalManual if exists
        console.log(`💰 Pedido ${id}: ${descuento}% → TotalManual $${totalManual.toLocaleString()} (persists!)`);
        
        res.json({
            success: true,
            descuentoPorcentaje: descuento,
            totalManual,
            totalBase
        });
    } catch (err) {
        console.error('Pedido descuento error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update /pedidos GET to prioritize TotalManual
app.get('/pedidos', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT *, 
            CASE 
                WHEN TotalManual IS NOT NULL AND TotalManual > 0 THEN TotalManual 
                ELSE Total 
            END as TotalDisplay,
            -- El pedido MÁS ANTIGUO = 1, el más reciente = mayor valor
            (SELECT COUNT(*) FROM Pedidos p2 WHERE p2.Fecha <= p1.Fecha) as NumeroDisplay
            FROM Pedidos p1 
            ORDER BY Fecha DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
} );

// 🎯 DESCUENTO POR PRODUCTO EN PEDIDO - Aplica descuento a una línea específica
app.put('/pedidos/:pedidoId/producto-descuento', async (req, res) => {
    const { pedidoId } = req.params;
    const { productoIndex, descuentoPorcentaje } = req.body;
    
    try {
        const pool = await poolPromise;
        
        // Obtener el pedido actual
        const pedidoResult = await pool.request()
            .input('id', sql.Int, pedidoId)
            .query('SELECT Productos, Total FROM Pedidos WHERE PedidoID = @id');
            
        if (pedidoResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        let productos = pedidoResult.recordset[0].Productos;
        if (typeof productos === 'string') {
            productos = JSON.parse(productos);
        }
        
        // Validar que el índice existe
        if (!productos[productoIndex]) {
            return res.status(400).json({ error: 'Producto no encontrado en el pedido' });
        }
        
        // Aplicar descuento al producto específico
        const producto = productos[productoIndex];
        const precioOriginal = parseFloat(producto.PrecioOriginal || producto.Precio) || 0;
        const descuento = parseFloat(descuentoPorcentaje) || 0;
        const precioConDescuento = precioOriginal - (precioOriginal * descuento / 100);
        
        // Guardar el descuento en el producto sin tocar el precio original
        producto.PrecioOriginal = precioOriginal;
        producto.PrecioConDescuento = precioConDescuento;
        producto.DescuentoPorcentajePedido = descuento;

        // Recalcular total del pedido considerando todos los descuentos por línea
        let nuevoTotal = 0;
        for (let item of productos) {
            const precioBase = parseFloat(item.PrecioOriginal || item.Precio) || 0;
            const descuentoItem = parseFloat(item.DescuentoPorcentajePedido || 0) || 0;
            const precioFinalItem = precioBase - (precioBase * descuentoItem / 100);
            nuevoTotal += precioFinalItem * (parseInt(item.cantidad) || 0);
        }
        
        // Guardar cambios
        await pool.request()
            .input('id', sql.Int, pedidoId)
            .input('productos', sql.NVarChar, JSON.stringify(productos))
            .input('total', sql.Decimal(18, 2), nuevoTotal)
            .query('UPDATE Pedidos SET Productos = @productos, TotalManual = @total WHERE PedidoID = @id');
        
        console.log(`💳 Pedido ${pedidoId}: Descuento ${descuento}% a producto ${productoIndex} → Nuevo total: $${nuevoTotal}`);
        
        res.json({
            success: true,
            productos,
            nuevoTotal,
            productoIndex
        });
    } catch (err) {
        console.error('Descuento producto error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== BADGE SUPPORT - Unread Count Endpoint =====
// ===== CLIENTES AUTOFILL ENDPOINTS =====
app.post('/clientes', async (req, res) => {
  const { nombre, correo, telefono, documento, direccion } = req.body;
  console.log('💾 POST /clientes:', nombre);
  
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }
  
  try {
    const pool = await poolPromise;
    
    // Ensure table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as tableCount FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Clientes'
    `);
    
    if (tableCheck.recordset[0].tableCount === 0) {
      await pool.request().query(`
        CREATE TABLE Clientes (
          ClienteID INT IDENTITY(1,1) PRIMARY KEY,
          Nombre NVARCHAR(200) NOT NULL,
          Correo NVARCHAR(200),
          Telefono NVARCHAR(50),
          Documento NVARCHAR(50),
          Direccion NVARCHAR(500),
          FechaCreacion DATETIME DEFAULT GETDATE(),
          FechaUltimoUso DATETIME DEFAULT GETDATE(),
          Usos INT DEFAULT 1
        );
        CREATE NONCLUSTERED INDEX IX_Clientes_Nombre ON Clientes(Nombre);
      `);
      console.log('✅ Clientes table created in POST');
    }
    
    await pool.request()
      .input('nombre', sql.NVarChar(200), nombre.trim())
      .input('correo', sql.NVarChar(200), correo || null)
      .input('telefono', sql.NVarChar(50), telefono || null)
      .input('documento', sql.NVarChar(50), documento || null)
      .input('direccion', sql.NVarChar(500), direccion || null)
      .query(`
        IF EXISTS (SELECT 1 FROM Clientes WHERE LOWER(Nombre) = LOWER(@nombre))
          UPDATE Clientes SET 
            Correo = @correo, Telefono = @telefono, Documento = @documento, Direccion = @direccion,
            FechaUltimoUso = GETDATE(), Usos = Usos + 1
          WHERE LOWER(Nombre) = LOWER(@nombre)
        ELSE
          INSERT INTO Clientes (Nombre, Correo, Telefono, Documento, Direccion) 
          VALUES (@nombre, @correo, @telefono, @documento, @direccion);
      `);
    
    console.log('✅ Cliente saved:', nombre);
    res.json({ success: true });
  } catch (err) {
    console.error('💥 /clientes POST ERROR:', err.message);
    res.json({ success: false, error: 'Save failed (check logs)' }); // Graceful 200
  }
});

app.get('/clientes', async (req, res) => {
  const { cedula } = req.query;
  console.log('🔍 GET /clientes por cédula:', cedula);
  
  if (!cedula?.trim()) {
    return res.json({});
  }
  
  try {
    const pool = await poolPromise;
    // Check table exists first
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as tableCount FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Clientes'
    `);
    
    if (tableCheck.recordset[0].tableCount === 0) {
      console.log('📭 No Clientes table - returning empty');
      return res.json({});
    }
    
    const result = await pool.request()
      .input('cedula', sql.NVarChar(50), cedula.trim())
      .query(`
        SELECT TOP 1 ClienteID, Nombre, Correo, Telefono, Documento, Direccion, 
               FechaUltimoUso, Usos 
        FROM Clientes 
        WHERE Documento = @cedula OR LOWER(Documento) LIKE '%' + LOWER(@cedula) + '%'
        ORDER BY FechaUltimoUso DESC
      `);
    
    const client = result.recordset[0] || {};
    console.log('✅ Cliente:', client.ClienteID ? 'FOUND' : 'NONE');
    res.json(client);
  } catch (err) {
    console.error('💥 /clientes GET ERROR:', {
      nombre: req.params.nombre,
      message: err.message?.substring(0, 200),
      code: err.code
    });
    // NEVER 500 - always return {} for frontend resilience
    res.json({});
  }
});

// ===== BADGE SUPPORT - Unread Count Endpoint =====
app.get('/unread-count', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT COUNT(*) as unread 
      FROM Pedidos 
      WHERE Estado = 'Pendiente' 
        AND Fecha > DATEADD(day, -1, GETDATE())
    `);
    res.json({ 
      unread: result.recordset[0].unread || 0 
    });
  } catch (err) {
    console.error('Badge count error:', err);
    res.status(500).json({ unread: 0 });
  }
});




// 🔐 LOGIN (after middleware def)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

app.post('/api/login', async (req, res) => {
  const { user, pass } = req.body;
  
  console.log('🔐 Login attempt:', { user: user?.substring(0,3)+'***' });
  
  if (user !== ADMIN_USER) {
    return res.status(401).json({ error: 'Usuario inválido' });
  }
  
  const valid = await bcrypt.compare(pass, ADMIN_PASS_HASH);
  console.log('🔐 bcrypt.compare result:', valid);
  
  if (!valid) {
    return res.status(401).json({ error: 'Contraseña inválida' });
  }
  
  const token = jwt.sign(
    { userId: ADMIN_USER, role: 'admin' },
    process.env.JWT_SECRET || 'MiClaveSuperSecretaParaJWT_32charsMin',
    { expiresIn: '24h' }
  );
  
  console.log(`🔐 Admin login exitoso: ${ADMIN_USER}`);
  res.cookie('admin_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  });
  res.json({ success: true, token, userId: ADMIN_USER });
});

// 🛡️ PROTECT PRODUCT ROUTES with JWT auth
// 🔍 DEBUG LOGGING for product operations
console.log('🔒 Product routes now PROTECTED with authJWT middleware');

// OLD sessions - deprecated (mantener para compatibilidad temporal)
app.get('/api/admin-session', (req, res) => {
    const token = req.headers['x-session-token'] || req.query.token;
    // Fallback legacy
    res.json({ 
        success: false, 
        message: 'Use /api/login para nueva auth JWT',
        deprecated: true
    });
});

app.get('/logout', (req, res) => {
    res.redirect('/tienda.html');
});

app.get('/menu', (req, res) => {
    res.json([]);
});

// Middleware para prevenir caché
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, max-stale=0, post-check=0, pre-check=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

app.get(/\.html$/, (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// ==========================================
// RUTAS DE BACKUP Y RESTAURACIÓN
// ==========================================

app.get('/backup', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const productosResult = await pool.request().query(`
            SELECT p.*, 
            (SELECT TOP 1 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID) as FotoReal
            FROM Productos p
        `);
        
        const pedidosResult = await pool.request().query('SELECT * FROM Pedidos ORDER BY Fecha DESC');
        
        const backup = {
            fecha: new Date().toISOString(),
            version: '1.0',
            productos: productosResult.recordset,
            pedidos: pedidosResult.recordset
        };
        
        res.setHeader('Content-Disposition', `attachment; filename=backup_trebol_${new Date().toISOString().slice(0,10)}.json`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/restore', async (req, res) => {
    const { productos, opciones } = req.body;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    const opcionActualizar = opciones?.actualizarExistentes || false;
    const opcionActualizarStock = opciones?.actualizarSoloStock || false;
    
    try {
        await transaction.begin();
        
        let creados = 0;
        let actualizados = 0;
        let omitidos = 0;
        
        for (const p of productos) {
            let existe = null;
            
            if (p.CodigoSKU) {
                const checkSku = await transaction.request()
                    .input('sku', sql.NVarChar, p.CodigoSKU)
                    .query('SELECT ProductoID FROM Productos WHERE CodigoSKU = @sku');
                existe = checkSku.recordset[0];
            }
            
            if (existe) {
                if (opcionActualizar) {
                    await transaction.request()
                        .input('id', sql.Int, existe.ProductoID)
                        .input('n', sql.NVarChar, p.Nombre)
                        .input('m', sql.NVarChar, p.Marca)
                        .input('s', sql.NVarChar, p.CodigoSKU)
                        .input('p', sql.Decimal(18, 2), parseFloat(p.Precio) || 0)
                        .input('st', sql.Int, parseInt(p.Stock) || 0)
                        .input('c', sql.NVarChar, p.Caracteristicas || '')
                        .query(`UPDATE Productos SET Nombre=@n, Marca=@m, CodigoSKU=@s, Precio=@p, Stock=@st, Caracteristicas=@c WHERE ProductoID=@id`);
                    actualizados++;
                } else if (opcionActualizarStock) {
                    await transaction.request()
                        .input('id', sql.Int, existe.ProductoID)
                        .input('st', sql.Int, parseInt(p.Stock) || 0)
                        .query(`UPDATE Productos SET Stock = @st WHERE ProductoID=@id`);
                    actualizados++;
                } else {
                    omitidos++;
                }
            } else {
                const result = await transaction.request()
                    .input('n', sql.NVarChar, p.Nombre)
                    .input('m', sql.NVarChar, p.Marca)
                    .input('s', sql.NVarChar, p.CodigoSKU || `SKU-${Date.now()}`)
                    .input('p', sql.Decimal(18, 2), parseFloat(p.Precio) || 0)
                    .input('st', sql.Int, parseInt(p.Stock) || 0)
                    .input('c', sql.NVarChar, p.Caracteristicas || '')
                    .query(`
                        INSERT INTO Productos (Nombre, Marca, CodigoSKU, Precio, Stock, Caracteristicas) 
                        VALUES (@n, @m, @s, @p, @st, @c);
                        SELECT SCOPE_IDENTITY() AS ProductoID;
                    `);
                
                const nuevoId = result.recordset[0].ProductoID;
                
                if (p.FotoReal || p.ImagenURL) {
                    const url = p.FotoReal || p.ImagenURL;
                    await transaction.request()
                        .input('id', sql.Int, nuevoId)
                        .input('url', sql.NVarChar, url)
                        .query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
                }
                creados++;
            }
        }
        
        await transaction.commit();
        res.json({ 
            success: true, 
            message: `Backup restaurado: ${creados} creados, ${actualizados} actualizados, ${omitidos} omitidos`
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/restore-pedidos', async (req, res) => {
    const { pedidos, opciones } = req.body;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    const opcionReemplazar = opciones?.reemplazarExistentes || false;
    
    try {
        await transaction.begin();
        
        let creados = 0;
        let omitidos = 0;
        
        if (opcionReemplazar) {
            await transaction.request().query('DELETE FROM Pedidos');
        }
        
        for (const p of pedidos) {
            let existe = null;
            
            if (p.Fecha && p.NombreCliente) {
                const checkDup = await transaction.request()
                    .input('nc', sql.NVarChar, p.NombreCliente.substring(0, 100))
                    .input('fe', sql.DateTime, new Date(p.Fecha))
                    .query('SELECT PedidoID FROM Pedidos WHERE NombreCliente = @nc AND Fecha = @fe');
                existe = checkDup.recordset[0];
            }
            
            if (existe && !opcionReemplazar) {
                omitidos++;
            } else {
                const productosJson = typeof p.Productos === 'string' ? p.Productos : JSON.stringify(p.Productos || []);
                
                await transaction.request()
                    .input('nc', sql.NVarChar, p.NombreCliente || p.Nombre || 'Cliente')
                    .input('co', sql.NVarChar, p.Correo || '')
                    .input('te', sql.NVarChar, p.Telefono || '')
                    .input('do', sql.NVarChar, p.Documento || '')
                    .input('di', sql.NVarChar, p.Direccion || '')
                    .input('pr', sql.NVarChar, productosJson)
                    .input('to', sql.Decimal(18, 2), parseFloat(p.Total) || 0)
                    .input('fe', sql.DateTime, p.Fecha ? new Date(p.Fecha) : new Date())
                    .input('es', sql.NVarChar, p.Estado || 'Pendiente')
                    .input('tm', sql.Decimal(18, 2), p.TotalManual ? parseFloat(p.TotalManual) : null)
                    .input('dp', sql.Decimal(5,2), p.DescuentoPorcentaje ? parseFloat(p.DescuentoPorcentaje) : null)
                    .query(`
                        INSERT INTO Pedidos (NombreCliente, Correo, Telefono, Documento, Direccion, Productos, Total, Fecha, Estado, TotalManual, DescuentoPorcentaje) 
                        VALUES (@nc, @co, @te, @do, @di, @pr, @to, @fe, @es, @tm, @dp)
                    `);
                creados++;
            }
        }
        
        await transaction.commit();
        res.json({ 
            success: true, 
            message: `Pedidos restaurados: ${creados} creados, ${omitidos} omitidos`
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'tienda.html')); });

const PORT = process.env.PORT || 3000;

// Iniciar servidor con Socket.io
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`🔌 Socket.io listo para notificaciones en tiempo real`);
});
