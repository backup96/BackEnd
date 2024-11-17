import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { YearMonth } from "../DateTime.js";

const routerAdmin = (app, db, transporter) => {
  const router = express.Router();

  dotenv.config({ path: "../.env" });

  const salt = 10;

  const curMonthYear = YearMonth();

  // Ruta para confirmación de creación de cuenta
  router.post("/confirmAcc", (req, res) => {
    const sql = "Call Inserción_Persona(?)";
    bcrypt.hash(req.body.NumeroDocumento.toString(), salt, (err, hash) => {
      if (err)
        return res.json({ Error: "Fallo en la encriptación de la contraseña" });
      const values = [
        req.body.Nombre,
        req.body.Apellido,
        req.body.Teléfono,
        req.body.NumeroDocumento,
        req.body.Correo,
        req.body.CodigoVivienda,
        hash,
      ];
      db.query(sql, [values], (err, data) => {
        if (err) {
          console.error("Error en la consulta:", err); // Muestra el error en el servidor
          return res
            .status(500)
            .json({ Error: "Error al enviar solicitud de registro" });
        } else {
          const mailOptions = {
            from: process.env.EMAIL,
            to: req.body.correo,
            subject: "Credenciales para inicio de sesión",
            html: `<div style="margin: 50px;">
  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 15px 15px 0px 0px;
  background: #28a745; padding: 2px;">
    <h2>CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>      
  </div>

  <div style="margin: 15px">
    <p>
      Un cordial saludo,<br><br>
      Nos complace informarle que su solicitud de creación de cuenta en nuestra aplicación web ha sido aprobada. A continuación, encontrará los detalles de acceso a su cuenta:<br><br>
      <strong>Nombre de usuario:</strong> ${req.body.Nombre}${req.body.Apellido}${req.body.NumeroDocumento}<br>
      <strong>Contraseña:</strong> ${req.body.NumeroDocumento}<br><br>
      Por motivos de seguridad, le recomendamos cambiar su contraseña desde su cuenta en la aplicación tras iniciar sesión por primera vez.<br><br>
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
</div>

`,
          };

          // Enviar el correo
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log(error);
            return res.json({ message: "Correo enviado con éxito" });
          });
        }
        return res.json({ Status: "Success" });
      });
    });
  });

  // Ruta para negación de creación de cuenta
  router.post("/cancelAcc", (req, res) => {
    const sql = "DELETE FROM solicitud WHERE NumDocumento = ?";
    const values = [req.body.NumeroDocumento];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Ruta para inicio de sesión en administrador
  router.post("/login", (req, res) => {
    const sql = "SELECT * FROM login_admin WHERE nombreUsuario = ?";
    const values = [req.body.nombreUsuario];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
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
          Error: "Nombre de usuario o contraseña incorrectos",
        });
      }
    });
  });

  // Ruta para obtener el archivo PDF desde la base de datos
  router.get("/descargar/:id", (req, res) => {
    const id = req.params.id;

    // Consulta para obtener el archivo PDF por su id
    const sql = "SELECT Archivo FROM solicitud WHERE idSolicitud = ?";

    db.query(sql, [id], (err, result) => {
      if (err) throw err;

      if (result.length > 0) {
        const archivo = result[0].Archivo;

        // Enviar el archivo como respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="archivo_${id}.pdf"`
        );
        res.send(archivo);
      } else {
        res.status(404).send("Archivo no encontrado");
      }
    });
  });

  // Ruta para consulta de solicitudes para creación de cuenta
  router.get("/getSolicitudes", (req, res) => {
    const sql = "SELECT * FROM solicitud";
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

  // -----------------------------------------------------------------//

  // Crud viviendas
  // Consultar viviendas
  router.get("/getApartamentos", (req, res) => {
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

  // Consultar viviendas específico
  router.post("/getApartamentosEsp", (req, res) => {
    const sql = "SELECT * FROM apartamento WHERE codigoVivienda = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al buscar apartamento" });
      }
      res.json(data);
    });
  });

  // Insertar viviendas
  router.post("/postApartamentos", (req, res) => {
    const sql = "Call Inserción_Apartamento(?)";
    const values = [req.body.Bloque, req.body.Torre, req.body.numAprt];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Actualizar viviendas
  router.post("/patchApartamentos", (req, res) => {
    const sql = "Call Actualización_Apartamento(?)";
    const values = [
      req.body.codApt,
      req.body.Bloque,
      req.body.Torre,
      req.body.numAprt,
    ];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar viviendas
  router.post("/deleteApartamentos", (req, res) => {
    const sql = "DELETE FROM apartamento WHERE codigoVivienda = ?";
    const values = [req.body.codApt];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  //--------------------------------------------------------//

  // Crud propietarios
  // Consultar propietarios
  router.get("/getPropietarios", (req, res) => {
    const sql = "SELECT * FROM get_propietarios";
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

  // Consultar propietarios específico
  router.post("/getPropietarioEsp", (req, res) => {
    const sql = "SELECT * FROM get_propietarios WHERE numDocumento = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al buscar apartamento" });
      }
      res.json(data);
    });
  });

  // Insertar propietarios
  router.post("/postPropietarios", (req, res) => {
    const sql = "Call Inserción_Persona_Admin(?)";
    bcrypt.hash(req.body.NumeroDocumento.toString(), salt, (err, hash) => {
      if (err)
        return res.json({ Error: "Fallo en la encriptación de la contraseña" });
      const values = [
        req.body.Nombre,
        req.body.Apellido,
        req.body.Teléfono,
        req.body.NumeroDocumento,
        req.body.Correo,
        req.body.CodigoVivienda,
        req.body.EspacioParqueadero,
        req.body.Placa,
        hash,
      ];
      if (req.body.EspacioParqueadero === "") {
        values[6] = null;
      }
      db.query(sql, [values], (err, data) => {
        if (err) {
          console.error(err.code); // Muestra el error en el servidor
          return res.status(500).json({ Error: err.code });
        }
        return res.json({ Status: "Success" });
      });
    });
  });

  // Actualizar propietarios
  router.post("/patchPropietarios", (req, res) => {
    const sql = "Call Actualizacion_Propietarios(?)";
    const values = [
      req.body.NumeroDocumento,
      req.body.Teléfono,
      req.body.Correo,
      req.body.EspacioParqueadero,
      req.body.Placa,
      req.body.CodigoVivienda,
    ];
    if (req.body.EspacioParqueadero === "") {
      values[3] = null;
    }
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al actualizar el apartamento" });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar propietarios
  router.post("/deletePropietarios", (req, res) => {
    const sql = "Call Eliminar_propietario(?)";
    const values = [req.body.NumeroDocumento];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  // -------------------------------------------------------//

  // Crud porteros
  // Consultar porteros
  router.get("/getPorteros", (req, res) => {
    const sql = "SELECT * FROM get_porteros";
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

  // Consultar porteros específico
  router.post("/getPorterosEsp", (req, res) => {
    const sql = "SELECT * FROM get_porteros WHERE numDocumento = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al buscar apartamento" });
      }
      res.json(data);
    });
  });

  // Insertar porteros
  router.post("/postPorteros", (req, res) => {
    const sql = "Call Inserción_Portero(?)";
    bcrypt.hash(req.body.NumeroDocumento.toString(), salt, (err, hash) => {
      if (err)
        return res.json({ Error: "Fallo en la encriptación de la contraseña" });
      const values = [
        req.body.Nombre,
        req.body.Apellido,
        req.body.Tel,
        req.body.NumeroDocumento,
        req.body.Correo,
        req.body.TipoTurno,
        hash,
      ];
      db.query(sql, [values], (err, data) => {
        if (err) {
          console.error(err.code); // Muestra el error en el servidor
          return res.status(500).json({ Error: err.code });
        }
        return res.json({ Status: "Success" });
      });
    });
  });

  // Actualizar porteros
  router.post("/patchPorteros", (req, res) => {
    const sql = "Call Actualizar_portero(?)";
    const values = [
      req.body.NumeroDocumento,
      req.body.Tel,
      req.body.TipoTurno,
      req.body.Correo,
    ];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar porteros
  router.post("/deletePorteros", (req, res) => {
    const sql = "Call Eliminar_Porteros(?)";
    const values = [req.body.NumeroDocumento];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  //---------------------------------------------------------//

  // Crud parqueaderos
  // Consultar Parqeuaderos
  router.get("/getParqueadero", (req, res) => {
    const sql = "SELECT * FROM espacios_parqueadero";
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

  // Consultar parqueaderos específico
  router.post("/getParqueaderoEsp1", (req, res) => {
    const sql = "SELECT * FROM espacios_parqueadero WHERE numEspacio = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al buscar apartamento" });
      }
      res.json(data);
    });
  });

  // Consultar parqueaderos específico
  router.post("/getParqueaderoEsp2", (req, res) => {
    const sql = "SELECT * FROM espacios_parqueadero WHERE tipoEspacio = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al buscar apartamento" });
      }
      res.json(data);
    });
  });

  // Insertar parqueaderos
  router.post("/postParqueadero", (req, res) => {
    const sql = "Call Insertar_parqueadero(?)";
    const values = [req.body.NumeroEspacio, req.body.TipoEspacio];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Actualizar propietarios
  router.post("/patchParqueadero", (req, res) => {
    const sql = "Call Actualizar_parqueadero(?)";
    const values = [
      req.body.NumeroEspacio,
      req.body.TipoEspacio,
      req.body.Estado,
    ];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar propietarios
  router.post("/deleteParqueadero", (req, res) => {
    const sql = "DELETE FROM espacios_parqueadero WHERE numEspacio = ?";
    const values = [req.body.NumeroEspacio];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  //-----------------------------------------------------------//

  // Crud Invitados
  // Consultar Invitados
  router.get("/getInvitados", (req, res) => {
    const sql = "SELECT * FROM get_invitados";
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

  // Consultar específica Invitados
  router.post("/getInvitadosEsp", (req, res) => {
    const sql = "SELECT * FROM get_invitados Where numDocumento = ?";
    db.query(sql, [req.body.Term], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      res.json(data);
    });
  });

  // Inserción Invitados
  router.post("/postInvitados", (req, res) => {
    const sql = "Call Inserción_Invitados(?)";
    bcrypt.hash(req.body.NumeroDocumento.toString(), salt, (err, hash) => {
      if (err)
        return res.json({ Error: "Fallo en la encriptación de la contraseña" });
      const values = [
        req.body.Nombre,
        req.body.Apellido,
        req.body.Teléfono,
        req.body.NumeroDocumento,
        req.body.Correo,
        req.body.CodigoVivienda,
        req.body.EspacioParqueadero,
        req.body.Placa,
      ];
      db.query(sql, [values], (err, data) => {
        if (err) {
          console.error(err.code); // Muestra el error en el servidor
          return res.status(500).json({ Error: err.code });
        }
        return res.json({ Status: "Success" });
      });
    });
  });

  // Actualizar Invitados
  router.post("/patchInvitados", (req, res) => {
    const sql = "Call Actualizar_Invitados(?)";
    const values = [
      req.body.Teléfono,
      req.body.Correo,
      req.body.EspacioParqueadero,
      req.body.Placa,
      req.body.NumeroDocumento,
      req.body.CodigoVivienda,
      req.body.CodigoViviendaOld,
    ];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error(err.code); // Muestra el error en el servidor
        return res.status(500).json({ Error: err.code });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar Invitados
  router.post("/deleteInvitados", (req, res) => {
    const sql = "Call Eliminar_Invitado(?)";
    const values = [req.body.NumeroDocumento];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  //--------------------------------------------------//
  // Crud Salon comunal
  // Consultar Salon comunal
  router.get("/getReservaSalon", (req, res) => {
    const sql = "SELECT * FROM get_citassalon";
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

  // Actualizar Salon comunal
  router.post("/patchReservaSalon", (req, res) => {
    const sql = "Call Actualizar_SalonComunal(?)";
    const values = [
      req.body.Dia,
      req.body.HoraInicio,
      req.body.HoraFin,
      req.body.NumDocumento,
    ];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Error en la consulta:", err); // Muestra el error en el servidor
        return res
          .status(500)
          .json({ Error: "Error al enviar solicitud de registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  // Eliminar Salon comunal
  router.post("/deleteReservaSalon", (req, res) => {
    const sql = "DELETE FROM citas_salon_comunal WHERE Fecha = ?";
    const values = [req.body.DiaOld];
    db.query(sql, [values], (err, data) => {
      if (err) {
        console.error("Al eliminar el registro:", err); // Muestra el error en el servidor
        return res.status(500).json({ Error: "Error al eliminar el registro" });
      }
      return res.json({ Status: "Success" });
    });
  });

  //----------------------------------------------------//
  // Consultar correos
  router.get("/getInformacion", (req, res) => {
    const sql = "SELECT * FROM get_propietarios";
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

  // Envio recibo Administración
  router.post("/sendInformacion", (req, res) => {
    const fecha = new Date();

    var valPar;

    if (req.body.numPar === null) {
      valPar = 0.0;
    } else {
      valPar = 3.0;
    }

    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.correo,
      subject: "Recibo de pago de administración",
      html: `<div style="margin: 50px;">
  <div style="font-family: Arial, sans-serif; text-align: center; color: white; border-radius: 15px;
  background: #28a745; padding: 2px;">
        <h2 >CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>
        <p>Cl. 9 Sur #26-32</p>
        <p>Tel: 601 747 9393</p>     
  </div>

<div style="margin: 15px">
<table style="width: 100%; border-spacing: 0; font-family: Arial, sans-serif;">
    <tr>
      <td style="text-align: left; vertical-align: top;">
        <p>Mes: ${curMonthYear.Mes} de ${curMonthYear.Year}</p>
        <p>Fecha: ${fecha.toLocaleDateString()}</p>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <p>Cuenta de cobro</p>
        <p>No. 15.905</p>
      </td>
    </tr>
  </table>

  <hr>

  <table style="width: 100%; border-spacing: 0; font-family: Arial, sans-serif;">
    <tr>
      <td style="text-align: left;">
        <p>Nombre: ${req.body.nombre}</p>
        <p>Numero de vivienda: ${req.body.codVivi}</p>
      </td>
      <td style="text-align: right;">
        <p>Código: ${req.body.codPer}</p>
      </td>
    </tr>
  </table>

  <table style="width: 100%;  border-collapse: collapse;">
  <tr style="border: 1px solid;">
    <th style="border: 1px solid;">Concepto</th>
    <th>Saldo</th>
  </tr>
  <tr>
    <td>Administración</td>
    <td>60.000</td>
  </tr>
  <tr style="border-bottom: 1px solid;">
    <td>Parqueadero</td>
    <td>${valPar}.000</td>
  </tr>
  <tr>
    <td>Total</td>
    <td>${60 + valPar}.000</td>
  </tr>
</table>
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

  // Envio de Circulares
  router.post("/sendCircularInformacion", (req, res) => {
    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.correo,
      subject: "Circular informativa",
      html: `<div style="margin: 50px;">
  <div style="font-family: Arial, sans-serif; text-align: center; color: white;  border-radius: 15px 15px 0px 0px;
  background: #28a745; padding: 2px;">
        <h2 >CONJUNTO RESIDENCIAL TORRES DE SANTA ISABEL</h2>      
  </div>

<div style="margin: 15px">
      <p>
        Un cordial saludo residentes de Torres de Santa Isabel<br><br>
        El presente correo es para informar que  ${req.body.text}<br><br>

        Agradecemos su atención a esta circular y quedamos atentos a cualquier duda o comentario.<br><br>
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

</div>
`,
    };

    // Enviar el correo
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log(error);
      return res.json({ message: "Correo enviado con éxito" });
    });
  });

  //----------------------------------------------------//
  // Consultar Espacios rentados
  router.get("/getEspRent", (req, res) => {
    const sql = "SELECT * FROM get_EspRent";
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

  // Consultar total Espacios rentados
  router.get("/getTotalEspRent", (req, res) => {
    const sql = "SELECT COUNT(*) as total FROM get_EspRent";
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

  // Agregar el router al prefijo /users
  app.use("/admin", router);
};

export default routerAdmin;
