const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Ponlo en false si estás trabajando en tu PC local
        trustServerCertificate: true 
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('¡Conectado exitosamente a AgroTienda en SQL Server!');
        return pool;
    })
    .catch(err => console.log('Error de conexión:', err));

module.exports = { sql, poolPromise };