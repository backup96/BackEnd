import express from "express";
import { DateTime } from "../DateTime.js";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const routerPropietario = (app, db) => {
  const router = express.Router();

  const curDate = DateTime()

  // Configurar Multer
  const storage = multer.memoryStorage(); // Almacenar el archivo en memoria
  const upload = multer({ storage: storage });

  // Ruta para envio de solicitud de cuenta
  router.post("/register", upload.single("Archivo"), (req, res) => {
    const { Nombre, Apellido, NumeroDocumento, Tel, Correo, CodigoVivienda } =
      req.body;
    const file = req.file.buffer;
    const sql = "Call Creacion_solicitud_cuenta(?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(
      sql,
      [
        curDate.fecha,
        curDate.hora,
        Nombre,
        Apellido,
        NumeroDocumento,
        Tel,
        Correo,
        CodigoVivienda,
        file,
      ],
      (err, data) => {
        if (err) {
          console.error("Error en la consulta:", err); // Muestra el error en el servidor
          return res
            .status(500)
            .json({ Error: "Error al enviar solicitud de registro" });
        }
        return res.json(data);
      }
    );
  });

  // Ruta para inicio de sesión en propietario
  router.post("/vista_perfil", (req, res) => {
    const sql = "SELECT * FROM login_propietario WHERE nombreUsuario = ?";
    db.query(sql, [req.body.nombreUsuario], (err, data) => {
      if (err) {
        console.error("Error al iniciar sesión", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      if (data.length > 0) {
        bcrypt.compare(
          req.body.clave.toString(),
          data[0].clave,
          (err, response) => {
            if (err)
              return res.json({ Error: "Error al comparar constraseñas" });
            if (response) {
              const nombreUsuario = data[0].nombreUsuario;
              const token = jwt.sign({ nombreUsuario }, "jwt-secret-key", {
                expiresIn: "1d",
              });
              res.cookie("token", token, {
                httpOnly: true,
                secure: true, // Esto debe coincidir con el entorno en el que estás (https en producción)
                sameSite: "none", // Configuración de SameSite
                path: "/", // Importante para eliminar correctamente
              });
              return res.json({ Status: "Success" });
            } else {
              return res.json({ Error: "Las constraseñas no coinciden" });
            }
          }
        );
      } else {
        return res.json({
          Error: "Nombre de Usuario o contraseña incorrectos",
        });
      }
    });
  });

  // Ruta para rentar espacio
  router.post("/Rent", (req, res) => {
    const sql = "Call Rentar(?, ?)";
    db.query(
      sql,
      [req.body.idParqueadero, req.body.numDocumento],
      (err, data) => {
        if (err) {
          console.error("Error al rentar espacio", err);
          // No enviaremos una respuesta de error
        }
  
        if (data.length > 0) {
          return res.json({ Status: "Success" });
        } else {
          return res.json({ Status: "Success" });
        }
      }
    );
  });


  // Agregar el router al prefijo /users
  app.use("/propietario", router);
};

export default routerPropietario;
