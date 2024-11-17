import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const routerPortero = (app, db, transporter) => {
  const router = express.Router();

  dotenv.config({ path: "../.env" });

  // Ruta para inicio de sesión en portero
  router.post("/loginPortero", (req, res) => {
    const sql = "SELECT * FROM login_portero WHERE nombreUsuario = ?";
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

  // Ruta para traer portero específico
  router.get("/getPorterosDetails", (req, res) => {
    const sql = "SELECT * FROM get_porteros WHERE numDocumento = ?";
    db.query(sql, [req.body.numDocumento], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      res.json(data);
    });
  });

  // Envio alerta de cronómetro
  router.post("/sendInformacion", (req, res) => {

    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.Correo,
      subject: "Agotamiento del tiempo en parqueadero",
      html: `<div style="margin: 50px;">
  <div style="font-family: Arial, sans-serif; text-align: center; color: white;  border-radius: 15px 15px 0px 0px;
  background: #28a745; padding: 2px;">
        <h2 >CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>      
  </div>

<div style="margin: 15px">
<h1 style="font-family: Arial, sans-serif; text-align: center">Aviso importante</h1>
      <p>
        Estimado transeúnte.<br><br>
        El presente correo es para informar que el tiempo por uso de parqueadero esta por terminar. Le solicitamos encarecidamente que retire el vehiculo de placa <snap style="text-decoration: underline; color: red;">${req.body.Placa}</snap> aparcado en el espacio numero <snap style="text-decoration: underline; color: red;">${req.body.Esp}</snap>. Pasados 10 minutos despues de este mensaje se iniciará a cobrar el tiempo adicional que tarde en dejar libre el espacio.<br><br>

        Agradecemos su atención a esta circular y quedamos atentos a cualquier duda o comentario.<br><br>
Atentamente, <br><br>
Portería del Conjunto Residencial Torres de Santa Isabel
      </p>
</div>
<div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 0px 0px 15px 15px;
  background: #ff856b; padding: 2px;">
        <p>uralitasigloxxi@gmail.com</p>
        <p>Tel: 601 747 9393</p>   
<p>Cl. 9 Sur #26-32, Bogotá</p>        
  </div>

</div>
`,
    };

    // Enviar el correo
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log(error);
      return res.json({ message: "Correo enviado con éxito" });
    });
  });

  // Envio ticket
  router.post("/sendTicket", (req, res) => {

    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.Correo,
      subject: "Ticket de parqeuadero",
      html: `<div style="margin: 50px; width: 280px;">
  <!-- Encabezado del ticket -->
  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 15px 15px 0 0; background: #28a745; padding: 5px;">
    <h2 style="font-size: 1.2em; margin: 0;">CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>      
  </div>

  <!-- Cuerpo del ticket -->
  <div style="margin: 10px; padding: 10px; border: 1px solid #333; border-radius: 8px; background-color: #fff;">
    <h3 style="text-align: center; margin: 0; font-size: 1.1em;">Ticket de Parqueadero</h3>
    <hr style="border: 0; border-top: 1px dashed #333; margin: 8px 0;">

    <table style="width: 100%; font-size: 0.9em; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">Placa del Vehículo:</td>
        <td style="padding: 4px 0; text-align: right;">${req.body.Placa}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">Número de Espacio:</td>
        <td style="padding: 4px 0; text-align: right;">${req.body.Esp}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">Tiempo Transcurrido:</td>
        <td style="padding: 4px 0; text-align: right;">${req.body.Time}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold;">Valor por Minuto:</td>
        <td style="padding: 4px 0; text-align: right;">$50</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; border-top: 1px solid #333;">Total a Pagar:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #d9534f; border-top: 1px solid #333;">$${Math.round(
          (req.body.Total / 60) * 50
        )}</td>
      </tr>
    </table>

    <hr style="border: 0; border-top: 1px dashed #333; margin: 8px 0;">
    <p style="text-align: center; font-size: 0.8em; color: #555;">Gracias por utilizar nuestro servicio</p>
  </div>

  <!-- Pie del ticket -->
  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 0 0 15px 15px; background: #ff856b; padding: 5px;">
    <p style="margin: 0; font-size: 0.85em;">uralitasigloxxi@gmail.com</p>
    <p style="margin: 0; font-size: 0.85em;">Tel: 601 747 9393</p>
    <p style="margin: 0; font-size: 0.85em;">Cl. 9 Sur #26-32, Bogotá</p>        
  </div>
</div>
`,
    };

    // Enviar el correo
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log(error);
      return res.json({ message: "Correo enviado con éxito" });
    });
  });

  app.use("/portero", router);
};

export default routerPortero;
