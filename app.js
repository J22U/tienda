const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2; // Agregado
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // Agregado
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Cloudinary (Usa tus credenciales)
cloudinary.config({
    cloud_name: 'donc8a6tc',
    api_key: '781626543592578',
    api_secret: 'jxp0bDLONGpIyMxm5TPtl1tkVhU' // Reemplaza esto con tu API Secret real
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
    .then(pool => {
        console.log('¡Conectado a SQL Server!');
        return pool;
    })
    .catch(err => console.error('Error al conectar:', err));

// Nuevo almacenamiento configurado para Cloudinary
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
            (SELECT TOP 1 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID) as FotoReal
            FROM Productos p
        `);

        const productos = result.recordset.map(p => ({
            ...p,
            ImagenURL: p.ImagenURL || p.FotoReal || ''
        }));

        res.json(productos);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/productos', upload.single('imagenes'), async (req, res) => {
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
        if (req.file) {
            // Cloudinary devuelve la URL completa en req.file.path
            const url = req.file.path; 
            await pool.request()
                .input('id', sql.Int, nuevoId)
                .input('url', sql.NVarChar, url)
                .query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
        }
        res.json({ success: true, id: nuevoId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/productos/:id', upload.single('imagenes'), async (req, res) => {
    const { id } = req.params;
    const nombre = req.body.Nombre || req.body.nombre;
    const marca = req.body.Marca || req.body.marca;
    const sku = req.body.CodigoSKU || req.body.sku;
    const precio = req.body.Precio || req.body.precio;
    const stock = req.body.Stock || req.body.stock;
    const caracteristicas = req.body.Caracteristicas || req.body.caracteristicas;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('n', sql.NVarChar, nombre)
            .input('m', sql.NVarChar, marca)
            .input('s', sql.NVarChar, sku || null)
            .input('p', sql.Decimal(18, 2), parseFloat(precio) || 0)
            .input('st', sql.Int, parseInt(stock) || 0)
            .input('c', sql.NVarChar, caracteristicas || '')
            .query(`UPDATE Productos SET Nombre=@n, Marca=@m, CodigoSKU=@s, Precio=@p, Stock=@st, Caracteristicas=@c WHERE ProductoID=@id`);

        if (req.file) {
            const url = req.file.path; // URL de Cloudinary
            await pool.request().input('id', sql.Int, id).query('DELETE FROM ProductoImagenes WHERE ProductoID=@id');
            await pool.request().input('id', sql.Int, id).input('url', sql.NVarChar, url).query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        for (const item of productos) {
            const stockCheck = await transaction.request().input('id', sql.Int, item.ProductoID).query('SELECT Stock, Nombre FROM Productos WHERE ProductoID = @id');
            const pActual = stockCheck.recordset[0];
            if (!pActual || pActual.Stock < item.cantidad) throw new Error(`Stock insuficiente: ${pActual?.Nombre}`);
        }
        await transaction.request()
            .input('nc', sql.NVarChar, nombre).input('co', sql.NVarChar, correo).input('te', sql.NVarChar, telefono).input('do', sql.NVarChar, documento).input('di', sql.NVarChar, direccion)
            .input('pr', sql.NVarChar, JSON.stringify(productos)).input('to', sql.Decimal(18, 2), total)
            .query(`INSERT INTO Pedidos (NombreCliente, Correo, Telefono, Documento, Direccion, Productos, Total, Fecha, Estado) VALUES (@nc, @co, @te, @do, @di, @pr, @to, GETDATE(), 'Pendiente')`);
        for (const prod of productos) {
            await transaction.request().input('cant', sql.Int, prod.cantidad).input('pId', sql.Int, prod.ProductoID).query(`UPDATE Productos SET Stock = Stock - @cant WHERE ProductoID = @pId`);
        }
        await transaction.commit();
        res.json({ success: true });
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

// Obtener un pedido por id
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
        
        // Cambiar estado a Completado
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Pedidos SET Estado = 'Completado' WHERE PedidoID = @id");
            
        res.json({ success: true });
    } catch (err) { 
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// Nueva ruta para marcar pedido como Pendiente (revertir)
app.put('/pedidos/:id/pendiente', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        // Cambiar estado a Pendiente
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Pedidos SET Estado = 'Pendiente' WHERE PedidoID = @id");
            
        res.json({ success: true });
    } catch (err) { 
        console.error("Error:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// ELIMINAR PEDIDO (Nueva ruta que faltaba)
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

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/login'); // Te manda al login tras cerrar
    });
});

// Middleware para prevenir caché en páginas HTML
app.use((req, res, next) => {
    // Headers agresivos de no-caché para prevenir back button
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, max-stale=0, post-check=0, pre-check=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// Middleware específico para archivos HTML
app.get(/\.html$/, (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// ==========================================
// RUTAS DE BACKUP Y RESTAURACIÓN
// ==========================================

// Endpoint para obtener todos los datos (backup completo)
app.get('/backup', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Obtener productos con sus imágenes
        const productosResult = await pool.request().query(`
            SELECT p.*, 
            (SELECT TOP 1 ImagenURL FROM ProductoImagenes WHERE ProductoID = p.ProductoID) as FotoReal
            FROM Productos p
        `);
        
        // Obtener pedidos
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

// Endpoint para restaurar/importar productos
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
            // Verificar si existe por SKU o ID
            let existe = null;
            
            if (p.CodigoSKU) {
                const checkSku = await transaction.request()
                    .input('sku', sql.NVarChar, p.CodigoSKU)
                    .query('SELECT ProductoID FROM Productos WHERE CodigoSKU = @sku');
                existe = checkSku.recordset[0];
            }
            
            if (existe) {
                if (opcionActualizar) {
                    // Actualizar producto existente completamente
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
                    // Solo actualizar stock
                    await transaction.request()
                        .input('id', sql.Int, existe.ProductoID)
                        .input('st', sql.Int, parseInt(p.Stock) || 0)
                        .query(`UPDATE Productos SET Stock = @st WHERE ProductoID=@id`);
                    actualizados++;
                } else {
                    omitidos++;
                }
            } else {
                // Crear nuevo producto
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
                
                // Guardar imagen si existe
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

// Endpoint para restaurar pedidos
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
            // Eliminar todos los pedidos existentes
            await transaction.request().query('DELETE FROM Pedidos');
        }
        
        for (const p of pedidos) {
            // Verificar si ya existe el pedido por fecha y cliente
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
                // Crear nuevo pedido
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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
