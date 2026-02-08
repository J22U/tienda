const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path'); // Solo una declaración aquí arriba
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(cors());

// Servir archivos estáticos y la carpeta de subidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

// --- CONFIGURACIÓN DE DB ---
const config = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: false, 
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(async pool => {
        console.log('¡Conectado a SQL Server en Somee!');
        return pool;
    })
    .catch(err => console.error('Error al conectar:', err));

// --- CONFIGURACIÓN DE MULTER ---
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// --- RUTAS ---

// OBTENER PRODUCTOS (Trae la galería de fotos)
app.get('/productos', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Quitamos [AgroTienda] y usamos [dbo] para evitar errores de permisos en Somee
        const result = await pool.request().query(`
            SELECT p.*, 
            (SELECT ImagenURL FROM [dbo].[ProductoImagenes] 
             WHERE ProductoID = p.ProductoID FOR JSON PATH) AS Galeria
            FROM [dbo].[Productos] p
        `);
        
        const productos = result.recordset.map(prod => ({
            ...prod,
            Galeria: prod.Galeria ? JSON.parse(prod.Galeria) : []
        }));

        res.json(productos);
    } catch (err) { 
        console.error("Error en GET:", err.message);
        res.status(500).send(err.message); 
    }
});

// EDITAR PRODUCTO
app.put('/productos/:id', upload.array('imagenes', 10), async (req, res) => {
    try {
        const { nombre, marca, precio, stock, caracteristicas, sku } = req.body;
        const id = req.params.id;
        const pool = await poolPromise;
        const request = pool.request();

        request.input('id', sql.Int, id);
        request.input('n', sql.NVarChar, nombre);
        request.input('m', sql.NVarChar, marca);
        request.input('p', sql.Decimal(18, 2), precio);
        request.input('s', sql.Int, stock);
        request.input('c', sql.NVarChar, caracteristicas || '');
        request.input('sku', sql.NVarChar, sku);

        let query = `UPDATE [dbo].[Productos] SET Nombre = @n, Marca = @m, Precio = @p, Stock = @s, Caracteristicas = @c, CodigoSKU = @sku`;

        if (req.files && req.files.length > 0) {
            const pathImagen = `/uploads/${req.files[0].filename}`;
            request.input('img', sql.NVarChar, pathImagen);
            query += `, ImagenURL = @img`;
        }

        query += ` WHERE ProductoID = @id`;
        await request.query(query);

        if (req.files && req.files.length > 0) {
            await pool.request().input('id', sql.Int, id).query('DELETE FROM [dbo].[ProductoImagenes] WHERE ProductoID = @id');
            for (const file of req.files) {
                await pool.request()
                    .input('id', sql.Int, id)
                    .input('url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO [dbo].[ProductoImagenes] (ProductoID, ImagenURL) VALUES (@id, @url)');
            }
        }
        res.json({ success: true, message: "Producto actualizado" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// CREAR PRODUCTO
app.post('/productos', upload.array('imagenes', 10), async (req, res) => {
    try {
        const { nombre, marca, precio, stock, caracteristicas, sku } = req.body;
        const pool = await poolPromise;
        const imgPrincipal = req.files && req.files.length > 0 ? `/uploads/${req.files[0].filename}` : null;
        
        const result = await pool.request()
            .input('n', sql.NVarChar, nombre)
            .input('m', sql.NVarChar, marca)
            .input('p', sql.Decimal(18, 2), precio)
            .input('s', sql.Int, stock)
            .input('i', sql.NVarChar, imgPrincipal)
            .input('sku', sql.NVarChar, sku)
            .input('c', sql.NVarChar, caracteristicas)
            .query(`INSERT INTO [dbo].[Productos] (Nombre, Marca, Precio, Stock, ImagenURL, CodigoSKU, Caracteristicas) 
                    OUTPUT INSERTED.ProductoID VALUES (@n, @m, @p, @s, @i, @sku, @c)`);

        const newId = result.recordset[0].ProductoID;

        if (req.files) {
            for (const file of req.files) {
                await pool.request().input('pId', sql.Int, newId).input('url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO [dbo].[ProductoImagenes] (ProductoID, ImagenURL) VALUES (@pId, @url)');
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// ELIMINAR PRODUCTO
app.delete('/productos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM [dbo].[ProductoImagenes] WHERE ProductoID=@id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM [dbo].[Productos] WHERE ProductoID=@id');
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// RUTA INICIAL
app.get('/', (req, res) => {
    // Cambia 'index.html' por 'tienda.html' si ese es tu archivo principal
    res.sendFile(path.join(__dirname, 'index.html'));
});

// PUERTO DINÁMICO PARA RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));