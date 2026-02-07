const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(cors());
// IMPORTANTE: Asegúrate de usar path.join para que las rutas de imágenes no fallen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- CONFIGURACIÓN DE DB ---
const config = {
    user: 'sa',
    password: 'Agro1234*',
    server: 'localhost',
    database: 'AgroTienda',
    options: {
        encrypt: false,
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

// --- CONFIGURACIÓN DE MULTER ---
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// --- RUTAS ---

// OBTENER PRODUCTOS (MODIFICADO PARA TRAER LA GALERÍA)
app.get('/productos', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Esta consulta usa FOR JSON PATH para meter todas las fotos de 'ProductoImagenes' en un solo campo llamado 'Galeria'
        const result = await pool.request().query(`
            SELECT p.*, 
            (SELECT ImagenURL FROM [AgroTienda].[dbo].[ProductoImagenes] 
             WHERE ProductoID = p.ProductoID FOR JSON PATH) AS Galeria
            FROM [AgroTienda].[dbo].[Productos] p
        `);
        
        // Formateamos el resultado: SQL devuelve la Galeria como un string, la convertimos a JSON real
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

// EDITAR PRODUCTO (Ruta blindada)
app.put('/productos/:id', upload.array('imagenes', 10), async (req, res) => {
    try {
        const { nombre, marca, precio, stock, caracteristicas, sku } = req.body;
        const id = req.params.id;
        const pool = await poolPromise;

        if (isNaN(id)) return res.status(400).json({ error: "ID no válido" });

        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('n', sql.NVarChar, nombre);
        request.input('m', sql.NVarChar, marca);
        request.input('p', sql.Decimal(18, 2), precio);
        request.input('s', sql.Int, stock);
        request.input('c', sql.NVarChar, caracteristicas || '');
        request.input('sku', sql.NVarChar, sku);

        let query = `
            UPDATE [AgroTienda].[dbo].[Productos] 
            SET Nombre = @n, Marca = @m, Precio = @p, Stock = @s, 
                Caracteristicas = @c, CodigoSKU = @sku
        `;

        if (req.files && req.files.length > 0) {
            const pathImagen = `/uploads/${req.files[0].filename}`;
            request.input('img', sql.NVarChar, pathImagen);
            query += `, ImagenURL = @img`;
        }

        query += ` WHERE ProductoID = @id`;
        await request.query(query);

        // Galería: Borramos las anteriores y metemos las nuevas (las 2 o más que subas)
        if (req.files && req.files.length > 0) {
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM [AgroTienda].[dbo].[ProductoImagenes] WHERE ProductoID = @id');

            for (const file of req.files) {
                await pool.request()
                    .input('id', sql.Int, id)
                    .input('url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO [AgroTienda].[dbo].[ProductoImagenes] (ProductoID, ImagenURL) VALUES (@id, @url)');
            }
        }

        res.json({ success: true, message: "Producto actualizado correctamente" });
    } catch (err) {
        console.error("--- ERROR EN ACTUALIZACIÓN ---", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
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
            .query(`
                INSERT INTO [AgroTienda].[dbo].[Productos] (Nombre, Marca, Precio, Stock, ImagenURL, CodigoSKU, Caracteristicas) 
                OUTPUT INSERTED.ProductoID 
                VALUES (@n, @m, @p, @s, @i, @sku, @c)
            `);

        const newId = result.recordset[0].ProductoID;

        // Guardamos todas las fotos en la tabla de imágenes
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await pool.request()
                    .input('pId', sql.Int, newId)
                    .input('url', sql.NVarChar, `/uploads/${file.filename}`)
                    .query('INSERT INTO [AgroTienda].[dbo].[ProductoImagenes] (ProductoID, ImagenURL) VALUES (@pId, @url)');
            }
        }
        res.json({ success: true, message: "Producto creado con éxito" });
    } catch (err) { res.status(500).send(err.message); }
});

// ELIMINAR
app.delete('/productos/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM [AgroTienda].[dbo].[ProductoImagenes] WHERE ProductoID=@id');
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM [AgroTienda].[dbo].[Productos] WHERE ProductoID=@id');
        res.json({ success: true, message: "Eliminado" });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(3000, () => console.log("Servidor listo en puerto 3000"));