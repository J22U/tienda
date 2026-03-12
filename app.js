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
require('dotenv').config();

// OneSignal Configuration
const ONESIGNAL_CONFIG = {
    appId: 'a6a0e0fc-4caf-4ce6-adff-5856c98bfffe',
    apiKey: 'os_v2_app_u2qob7cmv5gonlp7lblmtc7772qyyq6sivqec25wsvfkmeqioilxc643u56wdki2sj6hlpfvdpwmf6rbwk54uqj77s24arft3jp67ja'
};

// Function to send push notification via OneSignal
function sendPushNotification(pedidoData) {
    const { numeroPedido, nombreCliente, total, productos } = pedidoData;
    
    // OneSignal notification data
    const notification = {
        app_id: ONESIGNAL_CONFIG.appId,
        headings: {
            en: '🛒 Nuevo Pedido - Trébol',
            es: '🛒 Nuevo Pedido - Trébol'
        },
        contents: {
            en: `Pedido #${numeroPedido} de ${nombreCliente}\nTotal: $${Number(total).toLocaleString()}\n${productos} producto(s)`,
            es: `Pedido #${numeroPedido} de ${nombreCliente}\nTotal: $${Number(total).toLocaleString()}\n${productos} producto(s)`
        },
        url: 'https://tienda-1vps.onrender.com/admin.html',
        chrome_web_icon: 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png',
        chrome_big_picture: 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png',
        firefox_icon: 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png',
        safari_apns_env: 'production',
        aps: {
            alert: {
                title: '🛒 Nuevo Pedido - Trébol',
                body: `Pedido #${numeroPedido} de ${nombreCliente} - $${Number(total).toLocaleString()}`
            },
            sound: 'default',
            badge_type: 1
        }
    };
    
    // Convert to JSON
    const postData = JSON.stringify(notification);
    
    // OneSignal REST API request options
    const options = {
        hostname: 'onesignal.com',
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_CONFIG.apiKey}`
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('OneSignal response:', data);
        });
    });
    
    req.on('error', (error) => {
        console.error('OneSignal error:', error);
    });
    
    req.write(postData);
    req.end();
    
    console.log('📱 OneSignal push notification queued for delivery');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
    cloud_name: 'donc8a6tc',
    api_key: '781626543592578',
    api_secret: 'jxp0bDLONGpIyMxm5TPtl1tkVhU'
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

const config = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
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

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

app.get('/productos', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.*, 
            (SELECT TOP 1 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID) as FotoReal,
            (SELECT STRING_AGG(CAST(ImagenURL AS NVARCHAR(MAX)), '|') FROM (SELECT TOP 100 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID ORDER BY ImagenID) AS Imagenes) as GaleriaCompleta
            FROM Productos p
        `);

        const productos = result.recordset.map(p => {
            const galeriaCompleta = p.GaleriaCompleta ? p.GaleriaCompleta.split('|').filter(url => url.trim()) : [];
            return {
                ...p,
                ImagenURL: p.ImagenURL || p.FotoReal || galeriaCompleta[0] || '',
                Galeria: galeriaCompleta
            };
        });

        res.json(productos);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/productos', upload.array('imagenes', 6), async (req, res) => {
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

// Ruta para aplicar descuento a producto
app.put('/productos/:id/descuento', async (req, res) => {
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

app.delete('/productos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM ProductoImagenes WHERE ProductoID=@id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Productos WHERE ProductoID=@id');
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
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
        if (ONESIGNAL_CONFIG.apiKey && ONESIGNAL_CONFIG.apiKey !== 'YOUR_REST_API_KEY') {
            sendPushNotification({
                numeroPedido: numeroPedidoDisplay,
                nombreCliente: nombre,
                total: total,
                productos: productos.length
            });
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
        const result = await pool.request().query('SELECT * FROM Pedidos ORDER BY Fecha DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/pedidos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Pedidos WHERE PedidoID = @id');
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

app.put('/pedidos/:id/descuento', async (req, res) => {
    const { id } = req.params;
    const { descuento } = req.body; 
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('desc', sql.Decimal(5, 2), parseFloat(descuento) || 0)
            .query('UPDATE Pedidos SET DescuentoPorcentaje = @desc WHERE PedidoID = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/login');
    });
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
                    .input('dp', sql.Decimal(5, 2), p.DescuentoPorcentaje ? parseFloat(p.DescuentoPorcentaje) : null)
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
