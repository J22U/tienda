const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Asegúrate de tener dotenv para las variables de entorno

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
    options: {
        encrypt: true, 
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(async pool => {
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

// ... (Toda la configuración inicial, multer y poolPromise se mantienen igual)

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

// POST - CREAR PRODUCTO (¡Ya está perfecto!)
app.post('/productos', upload.single('imagenes'), async (req, res) => {
    const { nombre, marca, sku, precio, stock, caracteristicas } = req.body;
    try {
        const pool = await poolPromise;
        const precioNum = parseFloat(precio) || 0;
        const stockNum = parseInt(stock) || 0;

        const result = await pool.request()
            .input('n', sql.NVarChar, nombre)
            .input('m', sql.NVarChar, marca)
            .input('s', sql.NVarChar, sku || null)
            .input('p', sql.Decimal(18, 2), precioNum)
            .input('st', sql.Int, stockNum)
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
    } catch (err) {
        console.error("Error al crear:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT - ACTUALIZAR PRODUCTO (Corregido para evitar errores 500)
app.put('/productos/:id', upload.single('imagenes'), async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, sku, precio, stock, caracteristicas } = req.body;
    
    try {
        const pool = await poolPromise;
        const precioNum = parseFloat(precio) || 0;
        const stockNum = parseInt(stock) || 0;

        // 1. Actualizamos datos básicos
        await pool.request()
            .input('id', sql.Int, id)
            .input('n', sql.NVarChar, nombre)
            .input('m', sql.NVarChar, marca)
            .input('s', sql.NVarChar, sku || null)
            .input('p', sql.Decimal(18, 2), precioNum)
            .input('st', sql.Int, stockNum)
            .input('c', sql.NVarChar, caracteristicas || '')
            .query(`UPDATE Productos SET 
                    Nombre = @n, Marca = @m, CodigoSKU = @s, 
                    Precio = @p, Stock = @st, Caracteristicas = @c 
                    WHERE ProductoID = @id`);

        // 2. Si hay imagen nueva
        if (req.file) {
            const nuevaImagenURL = `/uploads/${req.file.filename}`;
            const checkImg = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM ProductoImagenes WHERE ProductoID = @id');

            if (checkImg.recordset.length > 0) {
                await pool.request()
                    .input('id', sql.Int, id)
                    .input('url', sql.NVarChar, nuevaImagenURL)
                    .query('UPDATE ProductoImagenes SET ImagenURL = @url WHERE ProductoID = @id');
            } else {
                await pool.request()
                    .input('id', sql.Int, id)
                    .input('url', sql.NVarChar, nuevaImagenURL)
                    .query('INSERT INTO ProductoImagenes (ProductoID, ImagenURL) VALUES (@id, @url)');
            }
        }
        res.json({ success: true, message: "Producto actualizado" });
    } catch (err) {
        console.error("Error al actualizar:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ... (El resto de tus rutas GET y DELETE de productos y pedidos están bien)

app.delete('/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        // 1. Borramos primero las imágenes asociadas (por integridad referencial)
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM [dbo].[ProductoImagenes] WHERE ProductoID = @id');

        // 2. Borramos el producto
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM [dbo].[Productos] WHERE ProductoID = @id');

        res.json({ success: true, message: "Producto eliminado" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// (Rutas POST, PUT y DELETE de productos se mantienen igual que tu lógica original...)
// [Omitidas por brevedad para enfocar en la corrección de Pedidos e Inventario]

// ==========================================
// RUTAS DE PEDIDOS (CORREGIDAS Y AUTOMATIZADAS)
// ==========================================

app.post('/pedidos', async (req, res) => {
    const { nombre, correo, telefono, documento, direccion, productos, total } = req.body;
    const pool = await poolPromise;
    
    // Iniciamos una transacción para que el pedido y el stock sean "todo o nada"
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Verificar stock antes de procesar nada
        for (const item of productos) {
            const stockCheck = await transaction.request()
                .input('id', sql.Int, item.ProductoID)
                .query('SELECT Stock, Nombre FROM Productos WHERE ProductoID = @id');
            
            const pActual = stockCheck.recordset[0];
            if (!pActual || pActual.Stock < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${pActual ? pActual.Nombre : 'ID ' + item.ProductoID}`);
            }
        }

        // 2. Insertar el pedido
        await transaction.request()
            .input('nc', sql.NVarChar, nombre)
            .input('co', sql.NVarChar, correo)
            .input('te', sql.NVarChar, telefono)
            .input('do', sql.NVarChar, documento)
            .input('di', sql.NVarChar, direccion)
            .input('pr', sql.NVarChar, JSON.stringify(productos)) 
            .input('to', sql.Decimal(18, 2), total)
            .query(`INSERT INTO Pedidos (NombreCliente, Correo, Telefono, Documento, Direccion, Productos, Total, Fecha, Estado) 
                    VALUES (@nc, @co, @te, @do, @di, @pr, @to, GETDATE(), 'Pendiente')`);

        // 3. Descontar del inventario automáticamente
        for (const prod of productos) {
            await transaction.request()
                .input('cant', sql.Int, prod.cantidad)
                .input('pId', sql.Int, prod.ProductoID)
                .query(`UPDATE [dbo].[Productos] SET Stock = Stock - @cant WHERE ProductoID = @pId`);
        }

        // Si todo salió bien, confirmamos los cambios en la DB
        await transaction.commit();
        res.json({ success: true, message: "Pedido registrado e inventario actualizado." });

    } catch (err) {
        // Si algo falla, deshacemos cualquier cambio (no se crea el pedido ni se resta stock)
        if (transaction) await transaction.rollback();
        console.error("Error al procesar pedido:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/pedidos', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Pedidos ORDER BY Fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/pedidos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Pedidos WHERE PedidoID = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// RUTA PARA COMPLETAR PEDIDO (ESTADO)
// ==========================================
app.put('/pedidos/:id/completar', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Pedidos SET Estado = 'Completado' WHERE PedidoID = @id");

        res.json({ success: true, message: "Pedido marcado como completado" });
    } catch (err) {
        console.error("Error al actualizar pedido:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tienda.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));