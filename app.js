const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

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

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
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
            // Si ImagenURL es nulo, usamos FotoReal que viene de la otra tabla
            ImagenURL: p.ImagenURL || p.FotoReal || ''
        }));

        res.json(productos);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/productos', upload.single('imagenes'), async (req, res) => {
    // Soporte para nombres en Mayúscula y Minúscula (Evita error NULL en Somee)
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
            const url = `/uploads/${req.file.filename}`;
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
            const url = `/uploads/${req.file.filename}`;
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

app.put('/pedidos/:id/completar', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query("UPDATE Pedidos SET Estado = 'Completado' WHERE PedidoID = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'tienda.html')); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));