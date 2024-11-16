const fecha = new Date();

const DateTime = () => {
  // Obtener los componentes de la fecha
  const año = fecha.getFullYear();
  // Enero = 0
  // Febrero = 2 ....
  // Se suma un valor a getMonth para que la lista de meses empieze desde 1 y no 0
  // padStart(2, "0") = Si el numero tiene menos de 2 digitos agrega un 0 al principio
  const mes = String(fecha.getMonth() + 1).padStart(2, "0"); // Los meses empiezan desde 0
  const dia = String(fecha.getDate()).padStart(2, "0");

  // Formato Año/Mes/Día
  const fechaFormateada = `${año}-${mes}-${dia}`;

  // Obtener los componentes de la hora
  const horas = String(fecha.getHours()).padStart(2, "0"); // Horas (0-23)
  const minutos = String(fecha.getMinutes()).padStart(2, "0"); // Minutos (0-59)
  const segundos = String(fecha.getSeconds()).padStart(2, "0"); // Segundos (0-59)

  // Formato Hora:Minutos:Segundos
  const horaFormateada = `${horas}:${minutos}:${segundos}`;

  const Cur_dateTime = {
    fecha: fechaFormateada,
    hora: horaFormateada,
  };

  return Cur_dateTime;
};

const YearMonth = () => {
  var mesActual = fecha.getMonth() + 1;
  if (mesActual === 1) {
    mesActual = "Enero";
  } else if (mesActual === 2) {
    mesActual = "Febrero";
  } else if (mesActual === 3) {
    mesActual = "Marzo";
  } else if (mesActual === 4) {
    mesActual = "Abril";
  } else if (mesActual === 5) {
    mesActual = "Mayo";
  } else if (mesActual === 6) {
    mesActual = "Junio";
  } else if (mesActual === 7) {
    mesActual = "Julio";
  } else if (mesActual === 8) {
    mesActual = "Agosto";
  } else if (mesActual === 9) {
    mesActual = "Septiembre";
  } else if (mesActual === 10) {
    mesActual = "Octubre";
  } else if (mesActual === 11) {
    mesActual = "Noviembre";
  } else if (mesActual === 12) {
    mesActual = "Diciembre";
  }
  const yerMon = {
    Mes: mesActual,
    Year: fecha.getFullYear(),
  };

  return yerMon;
};

export { DateTime, YearMonth };
