import express from "express";
import mysql from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import routerPropietario from "./routes/propietario.js";
import routerAdmin from "./routes/admin.js";
import routerPublic from "./routes/public.js";
import routerPortero from "./routes/portero.js";
import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';
import { PORT, DATABASE_HOST, DATABASE_NAME, DATABASE_PASS, DATABASE_USER } from "./config.js";
const saltRounds = 10;

// dotenv.config({ path: "./.env" });

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "https://front-betk1gzh3-backup96s-projects.vercel.app", // Dominios permitidos
    methods: "GET,POST,PUT,DELETE", // Métodos HTTP permitidos
    credentials: true, // Si necesitas enviar cookies o headers de autenticación
  })
);

app.use(cookieParser());

const db = mysql.createConnection({
  host: DATABASE_HOST,
  user: DATABASE_USER,
  password: DATABASE_PASS,
  database: DATABASE_NAME,
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

routerPropietario(app, db);

routerAdmin(app, db, transporter);

routerPublic(app, db, transporter);

routerPortero(app, db, transporter);

// Ruta para vista parqueadero-propietario
app.get("/espacio_parqueadero", (req, res) => {
  const tipoEspacio = req.query.tipoEspacio;
  let sql = "SELECT * FROM espacios_parqueadero";
  let params = [];

  if (tipoEspacio) {
      sql += " WHERE tipoEspacio = ?";
      params.push(tipoEspacio);
  }

  db.query(sql, params, (err, data) => {
      if (err) {
          console.error("Error en la consulta:", err);
          return res.status(500).json({ status: 'error', message: "Error al obtener los datos" });
      }
      console.log("Datos devueltos:", data); // Agregar logging aquí
      return res.json({ status: 'success', data });
  });
});

// Ruta para calendario-propietario
app.post('/citas_salon_comunal', (req, res) => {
  const {
    numDocumento,
    horarioInicio,
    horarioFin,
    motivoReunion,
    idPropietario,
    Fecha,
  } = req.body;
  const sql = `
    INSERT INTO citas_salon_comunal ( numDocumento, horarioInicio, horarioFin, motivoReunion, idPropietarioFK, Fecha)
    VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(
    sql,
    [
      numDocumento,
      horarioInicio,
      horarioFin,
      motivoReunion,
      idPropietario,
      Fecha
    ],
    (err, results) => {
      if (err) {
        console.error("Error al insertar la reserva:", err);
        return res
          .status(500)
          .json({ message: "Error al realizar la reserva" });
      }
      return res.status(201).json({ id: results.insertId });
    }
  );
});

app.get("/citas_salon_comunal", (req, res) => {
  const userDoc = req.query.numDocumento;

  // Si no se proporciona numDocumento, traer todas las citas
  const sql = "SELECT * FROM citas_salon_comunal";
  
  db.query(sql, (err, data) => {
    if (err) {
      return res.status(500).json({ 
        message: "Error al obtener las citas",
        error: err 
      });
    }

    const userDocString = String(userDoc);
    
    const formattedData = data.map(cita => ({
      ...cita,
      Fecha: new Date(cita.Fecha).toISOString().split('T')[0],
      numDocumento: String(cita.numDocumento),
      esPropia: String(cita.numDocumento) === userDocString
    }));

    return res.status(200).json(formattedData);
  });
});
 
// Ruta para datos del propietario (Perfil)
app.post('/vista_perfil', (req, res) => {
  const nombreUsuario = req.body.name;
  const sql = "SELECT * FROM vista_perfil WHERE nombreUsuario = ?";
  db.query(sql, [nombreUsuario], (err, results) => {
    if (err) {
      console.error("Error en la consulta:", err.message); 
      return res.status(500).json({ error: err.message });
    }
    console.log("Datos obtenidos:", results); 
    res.json(results);
  });
});

// Actualizar ddatos del perfil
app.post('/actualizar_perfil', (req, res) => {
  const { telefono, correo, nombreUsuario } = req.body;

  console.log("Datos a actualizar:", { telefono, correo, nombreUsuario });

  const sql = "UPDATE vista_perfil SET telefono = ?, correo = ? WHERE nombreUsuario = ?";
  db.query(sql, [telefono, correo, nombreUsuario], (err, results) => {
    if (err) {
      console.error("Error en la consulta:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    // console.log("Perfil actualizado:", results);
    res.json({ message: "Perfil actualizado exitosamente" });
  });
});

// Ruta para obtener datos de vista_propietarios_portero
app.get("/consultapropietarios", (req, res) => {
  const sql = "SELECT * FROM vista_propietarios_portero";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ Error: "Error al consultar los datos" });
    }
    res.json(data);
  });
});
// Ruta para consultar los espacios de parqueadero
app.get("/espacios_parqueadero", (req, res) => {
  const sql = "SELECT * FROM espacios_parqueadero";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ Error: "Error al consultar los datos" });
    }
    res.json(data);
  });
});
// Ruta para obtener los invitados
app.get('/invitados', (req, res) => {
  const query = 'SELECT * FROM vista_invitados';

  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al consultar los invitados' });
    }
    res.json(results);
  });
});

// CAMBIAR CONTRASEÑA CON ENCRIPTACIÓN EN PERFIL PROP
app.post('/cambiar_contrasena', async (req, res) => {
  const { newPassword, nombreUsuario } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const sql = "UPDATE personas_cuenta SET clave = ? WHERE nombreUsuario = ?";
    
    db.query(sql, [hashedPassword, nombreUsuario], (err, results) => {
      if (err) {
        console.error("Error al actualizar la contraseña:", err);
        return res.status(500).json({ 
          error: "Error al actualizar la contraseña" 
        });
      }
      
      if (results.affectedRows === 0) {
        return res.status(404).json({ 
          error: "Usuario no encontrado" 
        });
      }
      
      // Solo enviamos una respuesta exitosa
      return res.status(200).json({ 
        message: "Contraseña actualizada exitosamente" 
      });
    });
    
  } catch (error) {
    console.error("Error al encriptar la contraseña:", error);
    return res.status(500).json({ 
      error: "Error al procesar la contraseña" 
    });
  }
});


// Ruta para obtener datos de vista_propietarios_portero
app.get("/consultapropietarios", (req, res) => {
  const sql = "SELECT * FROM vista_propietarios_portero";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ Error: "Error al consultar los datos" });
    }
    res.json(data);
  });
});

// Ruta para consultar los espacios de parqueadero
app.get("/espacios_parqueadero", (req, res) => {
  const sql = "SELECT * FROM espacios_parqueadero";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ Error: "Error al consultar los datos" });
    }
    res.json(data);
  });
});

// Ruta para obtener los invitados
app.get('/invitados', (req, res) => {
  const query = 'SELECT * FROM vista_invitados';

  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al consultar los invitados' });
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log("Servidor corriendo en el puerto", PORT);
});
