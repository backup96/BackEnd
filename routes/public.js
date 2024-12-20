import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcrypt";

const routerPublic = (app, db, transporter) => {
  const router = express.Router();

  dotenv.config({ path: "../.env" });

  // Ruta para consulta de apartamentos
  router.get("/Apartamentos", (req, res) => {
    const sql = "SELECT * FROM apartamento";
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      res.json(data);
    });
  });

  // Función para verificar una sesión iniciada
  const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
      return res.json({ Error: "No hay una sesión iniciada" });
    } else {
      jwt.verify(token, "jwt-secret-key", (err, decoded) => {
        if (err) {
          return res.json({ Error: "Error con el token" });
        } else {
          req.nombreUsuario = decoded.nombreUsuario;
          next();
        }
      });
    }
  };

  router.get("/", verifyUser, (req, res) => {
    return res.json({ Status: "Success", nombreUsuario: req.nombreUsuario });
  });

  // Ruta para limpiar cookies creadas y cerrar sesión
  router.get("/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true, // Debe coincidir con la configuración al crearla
      sameSite: "none",
      path: "/", // Debe coincidir con el path original
    });
    return res.json({ Status: "Success" });
  });

  // Ruta para solicitar recuperación de contraseña
  router.post("/RecPass", (req, res) => {
    const email = req.body.Correo;
    const sql1 = "SELECT * FROM reset_pass_view WHERE correo = ?";
    const sql2 =
      "INSERT INTO reset_pass (token, expiración, idUsuario_FK) VALUES (?, ?, ?)";
    db.query(sql1, [email], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      if (data.length > 0) {
        const Usuario = data[0].idPersonaFk;
        // Generación de token
        const token = crypto.randomBytes(20).toString("hex");

        // Guardar el token y la expiración en la base de datos
        const expiration = Date.now() + 3600000; // 1 hora

        db.query(sql2, [token, expiration, Usuario], (err) => {
          if (err) {console.log(err);
          return res.status(500).json({
            error: "Error guardando el token en la base de datos",
          });}
          // Configurar el correo electrónico
          const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Recuperación de contraseña",
            html: `<div style="margin: 50px;">
  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 15px 15px 0px 0px;
  background: #28a745; padding: 2px;">
    <h2>CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>      
  </div>

  <div style="margin: 15px">
    <p>
      Un cordial saludo residente de Torres de Santa Isabel,<br><br>
      Hemos recibido una solicitud para restablecer la contraseña asociada a su cuenta.<br><br>
      Si no realizó esta solicitud, puede ignorar este correo. Sin embargo, si desea proceder, por favor haga clic en el botón a continuación para restablecer su contraseña:<br><br>
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="
        https://front-end-backup96s-projects.vercel.app/#/reset-password/${token}" style="text-decoration: none;">
        <button style="background: #28a745; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 5px; cursor: pointer;">
          Restablecer Contraseña
        </button>
      </a>
    </div>
    <p>
      Si tiene alguna pregunta o necesita ayuda adicional, no dude en ponerse en contacto con la administración.<br><br>
      Atentamente, <br><br>
      Administración del Conjunto Residencial Torres de Santa Isabel
    </p>
  </div>

  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 0px 0px 15px 15px;
  background: #ff856b; padding: 2px;">
    <p>uralitasigloxxi@gmail.com</p>
    <p>Tel: 601 747 9393</p>   
    <p>Cl. 9 Sur #26-32, Bogotá</p>        
  </div>
</div>`,
          };

          // Enviar el correo
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log(error);
            return res.json({ message: "Correo enviado con éxito" });
          });
        });
      }
    });
  });

  // Ruta para restablecer la contraseña
  router.post("/reset-password", (req, res) => {
    const token = req.body.token;
    const password = req.body.Pass;

    // Buscar al usuario con el token y verificar que no haya expirado
    db.query(
      "SELECT * FROM reset_pass WHERE token = ? AND expiración > ?",
      [token, Date.now()],
      (err, result) => {
        if (err)
          return res.status(500).json({ error: "Error en la base de datos" });
        if (result.length === 0)
          return res.status(400).json({ message: "Token inválido o expirado" });

        const user = result[0].idUsuario_FK;

        // Encriptar la nueva contraseña
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error encriptando la contraseña" });

          // Actualizar la contraseña del usuario y limpiar el token
          db.query("Call cambiar_pass(?, ?)", [hashedPassword, user], (err) => {
            if (err)
              return res.status(500).json({
                error: "Error actualizando la contraseña en la base de datos",
              });
            res.json({ status: "Contraseña restablecida correctamente" });
          });
        });
      }
    );
  });

  // Consultar propietarios específico
  router.post("/getPropietarioEsp", (req, res) => {
    const sql =
      "SELECT idPropietario FROM get_propietarios WHERE nombreUsuario = ?";
    db.query(sql, [req.body.name], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al buscar el propietario" });
      }
      res.json(data);
    });
  });

  // Agregar el router al prefijo /users
  app.use("/public", router);
};

export default routerPublic;