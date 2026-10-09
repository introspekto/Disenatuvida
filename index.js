require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fuente única de datos oficiales de pago y precio.
const DATOS_PAGO = {
  precio: 90,
  banco: "BBVA",
  titular: "Juan Gómez Trujillo",
  clabe: "012180015964680582",
  oxxo: "2242 1702 1058 0678"
};

const SYSTEM_PROMPT = `
Eres el asistente de soporte y ventas por WhatsApp de DISEÑA TU VIDA.
Responde en español con amabilidad, respeto, calidez y claridad. Usa párrafos breves y emojis con moderación. Responde primero la duda concreta, no repitas información y no presiones para comprar.

INFORMACIÓN OFICIAL
DISEÑA TU VIDA es un cuaderno digital de desarrollo personal de 90 páginas, con teoría y ejercicios prácticos sobre Trabajo, Dinero, Salud, Relaciones, Tiempo, Mentalidad y Propósito. Cuesta $90 MXN.
Incluye gratis DISEÑA TUS HÁBITOS: cuaderno de 30 páginas con teoría y ejercicios para trabajar creación y modificación de hábitos durante 21 días.
Hay tres cuadernos adicionales de 30 páginas: Diseña tus Finanzas (situación y organización financiera, deudas, ahorro e ingresos), Diseña tus Relaciones (reflexión sobre relaciones y decisiones conscientes) y Diseña tu Salud (hábitos y decisiones sostenibles de bienestar). Se agregan por $60 MXN adicionales; el paquete completo cuesta $150 MXN. No llames descuento a esta opción.
Todos los materiales son PDF digitales descargables y diseñados para imprimir. DISEÑA TU VIDA está en tamaño carta. No se envía un cuaderno físico. Se puede consultar en celular, tablet o computadora. No afirmes que el PDF sea editable o que se pueda rellenar digitalmente.
El material se entrega únicamente después de realizar y validar el pago, directamente por el mismo WhatsApp. No hay vista previa y no tiene fecha de vencimiento.
El uso es personal. Se permite imprimirlo para uso propio, incluso volver a imprimirlo para uso propio. No se permite reproducirlo para terceros, distribuirlo, compartirlo libremente ni entregarlo a otras personas.

PAGOS
Producto principal: $${DATOS_PAGO.precio} MXN. Transferencia: banco ${DATOS_PAGO.banco}, titular ${DATOS_PAGO.titular}, CLABE ${DATOS_PAGO.clabe}. Depósito OXXO: ${DATOS_PAGO.oxxo}. El cliente envía foto o PDF del comprobante por este WhatsApp. El pago se revisa y valida; una vez acreditado se entrega el material.
Si no se valida un pago, solicita monto, fecha, método de pago y clave de rastreo si fue transferencia; verifica que los datos usados fueran correctos. Si no se resuelve por chat, deriva con una persona del equipo.
Si pagó y no recibió el material, primero revisa validación del pago y después la entrega. Si no se resuelve, deriva con una persona del equipo. En una incidencia activa, no vendas, no solicites otro pago ni agregues cierres comerciales.
Actualmente no hay reembolsos, descuentos ni garantía.

PROYECTO Y LÍMITES
Detrás del proyecto está Juan Gómez, emprendedor mexicano interesado en desarrollo personal que ha aplicado estos conceptos en su vida. Para conocer el proyecto, redes oficiales: Facebook https://www.facebook.com/introspekto7 e Instagram https://www.instagram.com/introspekto7. No inventes testimonios, cifras, comentarios ni resultados.
El cuaderno es material de desarrollo personal, no es terapia ni sustituye terapia psicológica, atención médica o acompañamiento profesional. Si preguntan por depresión, ansiedad, tratamiento o atención profesional, explica este límite responsablemente; no lo presentes como tratamiento.

No inventes datos, enlaces, promociones, descuentos, testimonios ni resultados. No ofrezcas vista previa. No digas que eres una IA. No contradigas esta información oficial. Si no sabes algo, dilo con claridad. Distingue soporte de venta y prioriza cualquier problema activo de pago o entrega.
`;

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneAlguna(texto, frases) {
  return frases.some((frase) => {
    const normalizada = normalizarTexto(frase);
    return normalizada && (` ${texto} `).includes(` ${normalizada} `);
  });
}

function limpiarRespuesta(valor) {
  return String(valor ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const RESPUESTAS = {
  precio: () => `DISEÑA TU VIDA tiene un precio de $${DATOS_PAGO.precio} MXN e incluye como bono gratuito DISEÑA TUS HÁBITOS, un cuaderno de 30 páginas para trabajar tus hábitos durante 21 días. 😊\nSi quieres, te explico brevemente qué incluye DISEÑA TU VIDA.`,
  contenido: () => "DISEÑA TU VIDA es un cuaderno de trabajo de 90 páginas, con teoría y ejercicios para reflexionar, ordenar ideas y trabajar en 7 áreas: Trabajo, Dinero, Salud, Relaciones, Tiempo, Mentalidad y Propósito.\nAdemás, incluye DISEÑA TUS HÁBITOS como bono gratuito. 😊",
  areas: () => "Trabajamos 7 áreas importantes de tu vida: Trabajo, Dinero, Salud, Relaciones, Tiempo, Mentalidad y Propósito. La idea es revisar cada una, identificar qué quieres cambiar o mejorar y convertirlo en acciones concretas. 😊\nSi quieres, te puedo explicar brevemente qué se trabaja en cada área.",
  habitos: () => "DISEÑA TUS HÁBITOS es el bono gratuito que acompaña a DISEÑA TU VIDA. Es un cuaderno de 30 páginas con teoría y ejercicios prácticos para trabajar la creación y modificación de hábitos durante 21 días.\nLa idea es que puedas llevar lo aprendido a la práctica y trabajar tus hábitos de manera consciente. 😊\nSi quieres, te puedo explicar cómo está organizado el trabajo de los 21 días.",
  cuadernos: () => "Son tres cuadernos adicionales de 30 páginas cada uno, pensados para profundizar en áreas específicas de tu vida.\nDiseña tus Finanzas: trabaja tu situación financiera, organización de finanzas, deudas, ahorro y formas de mejorar tus ingresos.\nDiseña tus Relaciones: invita a reflexionar sobre tus relaciones importantes, identificar qué quieres mejorar y tomar decisiones más conscientes.\nDiseña tu Salud: trabaja hábitos y decisiones relacionadas con tu bienestar y acciones que puedas incorporar de forma sostenible. 😊\nLos tres se pueden agregar por $60 MXN al adquirir DISEÑA TU VIDA.",
  paquete: () => `Con $${DATOS_PAGO.precio} MXN recibes DISEÑA TU VIDA + el bono gratuito DISEÑA TUS HÁBITOS.\nPor $60 MXN adicionales puedes agregar los tres cuadernos: Diseña tus Finanzas, Diseña tus Relaciones y Diseña tu Salud, quedando el paquete completo en $150 MXN.\nAsí tienes los materiales para trabajar las distintas áreas de tu vida desde diferentes enfoques. 😊\nSi quieres, te explico qué incluye cada uno de los tres cuadernos adicionales.`,
  formato: () => "Sí 😊 Todos los cuadernos se entregan en PDF, listos para descargar y también para imprimir si quieres trabajarlos en físico.\nSe envían directamente por este mismo WhatsApp una vez que el pago ha sido validado.\nSi quieres, también te explico cómo recibes el material después de realizar tu pago.",
  entrega: () => "Una vez que realizas el pago, nos envías tu comprobante por este mismo WhatsApp. Revisamos y validamos el pago y, cuando queda acreditado, te enviamos el material directamente por este chat. 😊\nCuando hagas tu pago, envíame tu comprobante y te lo hacemos llegar.",
  tiempo: () => "No tienen fecha de vencimiento 😊 Puedes trabajarlos a tu propio ritmo y volver a ellos cuando lo necesites.\nPuedes empezar cuando quieras y avanzar a tu propio ritmo.",
  experiencia: () => "No 😊 No necesitas experiencia previa. Los cuadernos están pensados tanto para personas que comienzan desde cero como para quienes ya tienen experiencia trabajando en temas de desarrollo personal.\nPuedes comenzar desde cero y avanzar a tu propio ritmo.",
  comprar: () => `Es muy sencillo 😊 DISEÑA TU VIDA tiene un precio de $${DATOS_PAGO.precio} MXN. Puedes hacer tu pago por transferencia bancaria o depósito en OXXO. Después nos envías tu comprobante por este mismo WhatsApp, revisamos el pago y, una vez validado, te enviamos el material por aquí.\nSi quieres, te indico cómo hacer tu pago.`,
  pago: () => "Puedes pagar de dos formas: transferencia bancaria o depósito en OXXO. 😊\n¿Cuál de las dos opciones prefieres?",
  transferencia: () => `Claro 😊 El pago es de $${DATOS_PAGO.precio} MXN. Puedes hacer la transferencia a:\n${DATOS_PAGO.banco}\nTitular: ${DATOS_PAGO.titular}\nCLABE: ${DATOS_PAGO.clabe}\nCuando hagas el pago, envíame tu comprobante por este mismo WhatsApp y revisamos la acreditación.\nCuando hagas tu pago, envíame tu comprobante y te lo hacemos llegar.`,
  oxxo: () => `Claro 😊 El pago es de $${DATOS_PAGO.precio} MXN. Puedes hacer tu depósito en cualquier OXXO con este número:\n${DATOS_PAGO.oxxo}\nDespués de realizarlo, envíame tu comprobante por este mismo WhatsApp para revisar y validar el pago.\nCuando hagas tu depósito, envíame tu comprobante y revisamos tu pago.`,
  comprobante: () => "Puedes enviarme una foto o PDF de tu comprobante directamente por este mismo WhatsApp. 📲\nLo revisamos y validamos y, una vez acreditado el pago, te hacemos llegar tu material por aquí.\nCuando lo tengas, envíamelo por aquí y lo revisamos.",
  validacion: () => "Revisamos y validamos tu pago. Una vez que esté acreditado, te enviamos el material directamente por este mismo WhatsApp. 😊\nSolo envíame tu comprobante y nosotros revisamos el pago.",
  problema: () => "No te preocupes, primero revisamos qué pudo pasar. 😊 Te pediríamos algunos datos del pago, como el monto, fecha, método de pago y, si es transferencia, la clave de rastreo. También revisamos que los datos utilizados hayan sido correctos.\nSi no logramos resolverlo por aquí, pasamos tu caso con una persona del equipo para darle seguimiento.\nPásame los datos del pago y revisamos qué ocurrió.",
  retraso: () => "Primero revisamos que tu pago haya sido procesado y validado. Después verificamos qué ocurrió con la entrega del material.\nSi no podemos solucionarlo por aquí, pasamos tu caso con una persona del equipo para darle seguimiento. 😊\nDéjame revisar qué ocurrió con tu entrega.",
  condiciones: () => "No. Actualmente no contamos con reembolsos, descuentos ni garantía. 😊\nSi tienes alguna otra duda sobre el material o la compra, con gusto te la respondo.",
  confianza: () => "Detrás de DISEÑA TU VIDA está Juan Gómez, un emprendedor mexicano al que le interesan los temas de desarrollo personal y que ha aplicado estos conceptos en su propia vida. Es un emprendimiento serio y cuenta con muchos clientes.\nPuedes revisar las redes oficiales y los comentarios de personas que ya compraron:\nFacebook: https://www.facebook.com/introspekto7\nInstagram: https://www.instagram.com/introspekto7 😊",
  fisico: () => "Es un PDF digital, no se envía un cuaderno físico. 😊\nEstá diseñado para que puedas imprimirlo. Puedes llevar el archivo a cualquier papelería o centro de impresión y, si quieres trabajarlo como cuaderno, puedes engargolarlo.",
  imprimir: () => "Sí. 😊 DISEÑA TU VIDA se entrega en PDF y está diseñado para que puedas imprimirlo fácilmente y trabajarlo en físico.\nPuedes llevar el archivo a cualquier papelería o centro de impresión y, si quieres, engargolarlo para utilizarlo como un cuaderno de trabajo.\nSi quieres, también te explico cómo recibes el PDF después de realizar tu pago.",
  vista_previa: () => "El material se entrega una vez que el pago ha sido realizado y validado. 😊\nEn ese momento te enviamos directamente por este mismo WhatsApp el PDF completo de DISEÑA TU VIDA y el bono DISEÑA TUS HÁBITOS.\nSi tienes alguna duda sobre lo que incluye, con gusto te la respondo antes de realizar tu compra.",
  dispositivo: () => "Sí. 😊 Al ser un PDF digital, puedes descargarlo y consultarlo desde tu celular, tablet o computadora.\nTambién puedes imprimirlo si prefieres trabajarlo en físico y escribir directamente en las páginas.",
  copias: () => "Sí, puedes imprimir el PDF para trabajarlo en físico, incluso volver a imprimirlo para tu propio uso. 😊\nSin embargo, el material es para uso personal y no está permitido reproducirlo para terceros, distribuirlo, compartirlo libremente ni entregarlo a otras personas.\nSi quieres, te explico cómo puedes trabajarlo en formato digital o impreso.",
  tiempo_entrega: () => "Como es un material digital, no tienes que esperar un envío. 😊\nUna vez que realizas el pago, nos envías tu comprobante y revisamos y validamos el pago. Cuando queda acreditado, te enviamos el material directamente por este mismo WhatsApp.\nCuando hagas tu pago, envíame tu comprobante y revisamos la acreditación.",
  paginas: () => "DISEÑA TU VIDA tiene 90 páginas e incluye teoría y ejercicios prácticos para trabajar las 7 áreas de tu vida. 😊\nSi quieres, también te puedo explicar qué incluye el cuaderno.",
  tamano: () => "Sí. 😊 DISEÑA TU VIDA está diseñado en tamaño carta, por lo que puedes imprimirlo fácilmente en cualquier papelería o centro de impresión. También puedes engargolarlo para trabajarlo como un cuaderno físico.\nSi quieres, también te explico cómo puedes recibir y trabajar el material.",
  necesito_adicionales: () => "No. 😊 DISEÑA TU VIDA funciona por sí solo e incluye como bono gratuito DISEÑA TUS HÁBITOS.\nLos otros tres cuadernos —Diseña tus Finanzas, Diseña tus Relaciones y Diseña tu Salud— son materiales adicionales que puedes agregar si quieres profundizar en esas áreas específicas.\nSi quieres, te explico qué trabaja cada uno de los cuadernos adicionales.",
  terapia: () => "No. DISEÑA TU VIDA es un cuaderno de trabajo de desarrollo personal, diseñado para ayudarte a reflexionar, ordenar ideas y trabajar diferentes áreas de tu vida mediante teoría y ejercicios prácticos.\nNo sustituye terapia psicológica, atención médica ni el acompañamiento de un profesional cuando sea necesario. 😊\nSi quieres, puedo explicarte qué tipo de trabajo puedes realizar con DISEÑA TU VIDA."
};

const INTENCIONES = [
  { nombre: "problema", frases: ["problema", "problema de pago", "problema con el pago", "problema con mi pago", "problema con el comprobante", "no se valida", "no se valido", "no se valida mi pago", "no me validan", "no validan mi pago", "no aparece el pago", "pago no localizado", "pago no validado", "pago rechazado", "rechazaron el pago", "comprobante rechazado", "no aceptan el comprobante", "error en el pago", "error al pagar", "no reconoce mi pago", "no se acredito", "no puedo validar", "no pasa mi pago", "pago pendiente", "pago no reflejado", "no puedo pagar"] },
  { nombre: "retraso", frases: ["retraso", "retraso en la entrega", "problema con la entrega", "problema de entrega", "ya pague pero no me llego", "ya pague y no me llego", "pague y no recibi", "pague pero no recibi", "no recibi el material", "no recibi el cuaderno", "no me llego", "no me ha llegado", "no lo he recibido", "no recibi", "no llego el material", "no me llega el material", "sigo esperando", "no he recibido el pdf", "pague y no llego", "no me enviaron el material", "no recibo el material", "material no recibido", "todavia no me llega", "aun no recibo"] },
  { nombre: "vista_previa", frases: ["vista previa", "puedo verlo antes", "verlo antes de comprar", "ver algunas paginas", "ensenar el contenido", "me ensenan el contenido", "ver el cuaderno antes", "revisar el pdf antes", "muestra del cuaderno", "ejemplo del cuaderno", "muestra gratis", "puedo ver el material antes", "preview"] },
  { nombre: "copias", frases: ["imprimirlo varias veces", "volver a imprimir", "volverlo a imprimir", "sacar varias copias", "hacer copias", "puedo hacer copias", "imprimirlo para alguien mas", "imprimir para alguien mas", "compartir el pdf", "compartirlo", "puedo compartir", "mandarselo a otra persona", "mandar el pdf a", "regalar una copia", "se puede compartir", "distribuirlo", "entregarlo a otra persona", "para alguien mas", "para otra persona", "pasarselo a otra persona", "reproducirlo"] },
  { nombre: "fisico", frases: ["es fisico", "es un fisico", "es impreso", "me llega fisico", "cuaderno fisico", "lo mandan impreso", "viene impreso", "libro fisico", "digital o fisico", "es digital o fisico", "mandan en fisico", "envian fisico", "envio fisico", "me lo envian", "lo mandan a mi casa", "envian a domicilio", "producto fisico"] },
  { nombre: "imprimir", frases: ["puedo imprimirlo", "se puede imprimir", "lo puedo imprimir", "quiero imprimirlo", "como lo imprimo", "imprimir el cuaderno", "imprimir pdf", "imprimirlo", "tenerlo en papel", "lo quiero impreso", "puedo imprimir", "puedo llevarlo a imprimir", "lo puedo llevar a una papeleria", "imprimir el material"] },
  { nombre: "tiempo_entrega", frases: ["cuanto tarda en llegar", "cuanto tiempo tarda en llegar", "cuanto tarda en que llegue", "cuanto tiempo tarda en que llegue", "cuando me llega", "cuanto demora", "cuando recibo el pdf", "cuanto tardan en enviarlo", "es inmediato", "cuando me entregan el material", "tiempo de entrega", "cuanto tarda la entrega", "cuanto tarda en enviarse", "cuanto tardan en entregar", "cuando lo envian", "cuando llega el material", "cuanto tardan en llegar", "cuanto se tarda en entregar"] },
  { nombre: "terapia", frases: ["es terapia", "sustituye terapia", "sustituye a la terapia", "es como terapia", "necesito un psicologo", "sirve para problemas emocionales", "es un tratamiento", "es psicologico", "sirve para depresion", "sirve para ansiedad", "usar en lugar de terapia", "puedo usarlo en lugar de terapia", "reemplaza la terapia", "atencion medica", "tratamiento psicologico", "trata la depresion", "trata la ansiedad", "tengo depresion", "tengo ansiedad", "terapia psicologica"] },
  { nombre: "transferencia", frases: ["transferencia", "transferir", "transferencia bancaria", "datos bancarios", "clabe", "banco", "cuenta para transferir", "pagar por transferencia", "pago por transferencia", "datos de transferencia", "transferir dinero", "hacer una transferencia", "numero de cuenta"] },
  { nombre: "oxxo", frases: ["oxxo", "deposito en oxxo", "depositar en oxxo", "pagar en oxxo", "pago en oxxo", "como pago en oxxo", "como deposito en oxxo", "codigo de oxxo", "qr de oxxo", "ticket de oxxo", "numero de oxxo", "deposito oxxo", "pagar en tienda", "deposito en tienda"] },
  { nombre: "comprobante", frases: ["comprobante", "comprobante de pago", "enviar comprobante", "mandar comprobante", "ticket", "ticket de pago", "foto del pago", "foto del comprobante", "recibo de pago", "como envio el comprobante", "como mando el comprobante", "donde envio el comprobante", "foto o pdf del comprobante"] },
  { nombre: "validacion", frases: ["despues del comprobante", "despues de enviar el comprobante", "ya pague", "ya realice el pago", "que sigue despues de pagar", "que sigue", "validacion", "validacion del pago", "validar", "validar mi pago", "cuando validan", "cuando se acredita", "pago realizado", "ya hice el pago", "ya transferi", "ya deposite"] },
  { nombre: "necesito_adicionales", frases: ["necesito los otros", "necesito los demas", "necesito comprar los otros", "tengo que comprar los otros", "debo comprar los otros", "son necesarios los otros", "puedo comprar solo uno", "puedo comprar solo disena tu vida", "puedo comprar solo el principal", "necesito el paquete completo", "necesito comprar el paquete completo", "son obligatorios los otros", "tengo que comprar los demas", "debo comprar los demas", "necesito comprar los demas", "tengo que comprar los cuadernos adicionales"] },
  { nombre: "paquete", frases: ["paquete", "pack completo", "los 150", "opcion completa", "todo el paquete", "todo", "los tres cuadernos", "los tres adicionales", "precio del paquete", "cuanto cuesta el paquete", "paquete de 150", "cuanto por todo", "paquete completo de cuadernos", "precio de todo"] },
  { nombre: "paginas", frases: ["cuantas paginas", "numero de paginas", "90 paginas", "extension del cuaderno", "cuanto tiene", "cuantas hojas", "cantidad de paginas", "paginas tiene", "numero de hojas", "cuantas paginas tiene", "cuantas paginas son"] },
  { nombre: "tamano", frases: ["que tamano tiene", "en que tamano esta", "tamano carta", "que medidas tiene", "lo puedo imprimir en carta", "preparado para imprimir", "medidas del cuaderno", "formato carta", "medida carta", "tamaño del pdf"] },
  { nombre: "dispositivo", frases: ["ver en el celular", "verlo en celular", "ver en celular", "lo puedo ver en celular", "funciona en computadora", "usar en mi telefono", "abrir en celular", "trabajar desde mi computadora", "compatible con celular", "usar digital", "consultar en tablet", "puedo verlo en mi celular", "celular tablet computadora", "rellenarlo digital", "editar el pdf", "llenarlo en digital", "se puede llenar digitalmente", "es editable", "verlo en el telefono", "abrirlo en la computadora", "puedo usarlo en el celular"] },
  { nombre: "entrega", frases: ["entrega", "recibir", "recibo", "envio", "como lo recibo", "como me llega", "como recibo", "donde lo recibo", "cuando lo recibo", "como se entrega", "forma de entrega", "envio del material", "entrega del material", "recibir el material", "como me lo envian", "como llega el cuaderno", "me lo mandan por whatsapp"] },
  { nombre: "formato", frases: ["formato", "pdf", "es digital", "libro digital", "archivo digital", "en que formato", "formato digital", "como se entrega", "de forma digital"] },
  { nombre: "habitos", frases: ["habitos", "crear habitos", "cambiar habitos", "bono", "bonus", "cuaderno de habitos", "disena tus habitos", "21 dias", "21 dias de habitos", "modificar habitos", "habitos durante 21 dias"] },
  { nombre: "cuadernos", frases: ["otros cuadernos", "cuadernos adicionales", "adicionales", "finanzas relaciones salud", "que traen", "que traen los cuadernos", "disena tus finanzas", "disena tus relaciones", "disena tu salud", "cuadernos extra", "cuadernos extras", "otros materiales"] },
  { nombre: "areas", frases: ["areas", "temas", "areas de vida", "que temas trabaja", "en que trabaja", "que areas trabaja", "areas trabaja", "temas del cuaderno", "en que areas", "que areas de mi vida", "areas trabaja el cuaderno"] },
  { nombre: "contenido", frases: ["que incluye", "que contiene", "que trae", "contenido", "de que trata", "que viene en el cuaderno", "que incluye el cuaderno", "que contiene el cuaderno", "que trae el cuaderno"] },
  { nombre: "experiencia", frases: ["experiencia", "experiencia previa", "necesito saber", "soy principiante", "principiante", "nivel", "necesito experiencia", "desde cero", "no tengo experiencia", "para principiantes", "tengo que saber"] },
  { nombre: "tiempo", frases: ["tiempo", "cuanto tiempo", "duracion", "vencimiento", "caducidad", "fecha limite", "cuanto dura", "tiene vencimiento", "por cuanto tiempo", "a mi ritmo", "fecha de vencimiento", "tiene fecha limite", "se vence", "caduca"] },
  { nombre: "condiciones", frases: ["condiciones", "reembolso", "reembolsos", "devolucion", "descuento", "descuentos", "garantia", "devolucion de dinero", "politica", "politica de devolucion", "politica de reembolso", "me devuelven el dinero", "hay garantia"] },
  { nombre: "confianza", frases: ["confianza", "quien esta detras", "quien lo creo", "quien lo hizo", "es real", "es confiable", "opiniones", "comentarios", "clientes", "redes sociales", "redes oficiales", "mas informacion del proyecto", "quien es juan", "experiencias de clientes"] },
  { nombre: "pago", frases: ["metodos de pago", "metodo de pago", "formas de pago", "opciones de pago", "como pago", "como puedo pagar", "que formas de pago", "pagar", "pago"] },
  { nombre: "comprar", frases: ["comprar", "como compro", "quiero comprar", "adquirir", "como adquirirlo", "quiero el cuaderno", "quiero adquirir", "comprar el cuaderno", "quiero comprarlo", "como puedo adquirir"] },
  { nombre: "precio", frases: ["precio", "precios", "cuanto cuesta", "costo", "cuanto vale", "valor", "cuanto es", "cuanto cuesta disena tu vida", "cual es el precio", "que precio tiene"] }
];

const SOPORTE = new Set(["problema", "retraso"]);

function obtenerIntenciones(texto) {
  const normalizado = normalizarTexto(texto);
  const coincidencias = INTENCIONES.filter(({ frases }) => contieneAlguna(normalizado, frases))
    .map(({ nombre }) => nombre);

  // «Problema» aislado es determinista; en otros contextos requiere relación
  // con pago, comprobante o entrega para no clasificar cualquier duda como incidencia.
  const contextoSoporte = contieneAlguna(normalizado, [
    "pago", "pagar", "comprobante", "transferencia", "deposito", "oxxo", "cobro",
    "entrega", "recibi", "llego", "material", "envio"
  ]);
  const problemaDePagoExplicito = contieneAlguna(normalizado, [
    "no se valida", "no se valido", "no me validan", "no validan mi pago",
    "no aparece el pago", "pago no localizado", "pago no validado", "pago rechazado",
    "rechazaron el pago", "comprobante rechazado", "no aceptan el comprobante",
    "no reconoce mi pago", "no se acredito", "no puedo validar", "no pasa mi pago"
  ]);
  let filtradas = coincidencias;
  if (normalizado !== "problema" && !contextoSoporte && !problemaDePagoExplicito) {
    filtradas = filtradas.filter((nombre) => nombre !== "problema");
  }

  // «Todo» es una variante de paquete, aunque no debe convertir una frase
  // cotidiana como «¿todo bien?» en una respuesta comercial.
  const paqueteContextual = contieneAlguna(normalizado, [
    "paquete", "pack", "los 150", "opcion completa", "cuanto por todo",
    "precio de todo", "quiero todo", "incluye todo", "comprar todo", "dame todo",
    "los tres cuadernos", "los tres adicionales"
  ]);
  if (normalizado !== "todo" && !paqueteContextual) {
    filtradas = filtradas.filter((nombre) => nombre !== "paquete" || contieneAlguna(normalizado, [
      "paquete", "pack", "los 150", "opcion completa", "cuanto por todo", "precio de todo",
      "los tres cuadernos", "los tres adicionales"
    ]));
  }
  return filtradas;
}

function esPreguntaEditarPdf(texto) {
  return contieneAlguna(normalizarTexto(texto), ["rellenarlo digital", "editar el pdf", "llenarlo en digital", "se puede llenar digitalmente", "es editable", "editable"]);
}

function respuestaDirecta(mensajeOriginal) {
  const intenciones = obtenerIntenciones(mensajeOriginal);
  if (!intenciones.length) return null;

  // Incidencias de pago/entrega tienen prioridad y nunca reciben venta adicional.
  const normalizedMessage = normalizarTexto(mensajeOriginal);
  const problemaEntrega = intenciones.includes("retraso") && contieneAlguna(normalizedMessage, [
    "problema con la entrega", "problema de entrega", "no recibi", "no me llego",
    "no me ha llegado", "no lo he recibido", "material no recibido", "no llego"
  ]);
  const incidencia = problemaEntrega
    ? "retraso"
    : intenciones.find((intencion) => SOPORTE.has(intencion));
  if (incidencia) return RESPUESTAS[incidencia]();

  // Elimina activaciones genéricas que solo repiten una intención específica.
  const especificas = new Set(intenciones);
  const redundantes = new Set();
  if (["fisico", "imprimir", "vista_previa", "dispositivo", "entrega", "copias"].some((i) => especificas.has(i))) redundantes.add("formato");
  if (especificas.has("copias")) redundantes.add("imprimir");
  if (especificas.has("tiempo_entrega")) redundantes.add("tiempo");
  if (especificas.has("oxxo") || especificas.has("transferencia")) redundantes.add("pago");
  if (especificas.has("paquete")) redundantes.add("precio");
  const preguntaDetalleAdicionales = contieneAlguna(normalizedMessage, [
    "que traen", "que incluyen", "que contiene", "que son", "que incluye cada uno"
  ]);
  if (especificas.has("paquete") && !preguntaDetalleAdicionales) redundantes.add("cuadernos");
  // «Necesito el paquete completo» pregunta si hacen falta los extras;
  // no debe recibir simultáneamente la oferta del paquete como respuesta.
  if (especificas.has("necesito_adicionales")) redundantes.add("paquete");
  if (especificas.has("comprobante") || especificas.has("validacion")) redundantes.add("pago");

  // Si hay varias preguntas, contestarlas todas sin duplicados.
  const respuestas = [];
  for (const intencion of intenciones) {
    if (redundantes.has(intencion)) continue;
    if (!respuestas.includes(intencion)) respuestas.push(intencion);
  }

  return limpiarRespuesta(respuestas.map((intencion) => {
    if (intencion === "dispositivo" && esPreguntaEditarPdf(mensajeOriginal)) {
      return "Puedes consultar el PDF desde tu celular, tablet o computadora. El material no se ofrece como PDF editable ni para rellenar digitalmente.";
    }
    return RESPUESTAS[intencion]();
  }).join("\n\n"));
}

app.get("/", (req, res) => res.status(200).send("Agente DISEÑA TU VIDA activo ✅"));

app.post("/mensaje", async (req, res) => {
  try {
    const mensaje = req.body?.texto ?? req.body?.mensaje ?? req.body?.message ?? "";
    const textoUsuario = String(mensaje).trim();
    console.log("Mensaje recibido:", textoUsuario);

    if (!textoUsuario) {
      return res.json({ respuesta: "Estoy aquí para ayudarte. 😊\nPuedes preguntarme sobre DISEÑA TU VIDA, su contenido, precio, forma de pago o entrega." });
    }

    const directa = respuestaDirecta(textoUsuario);
    if (directa) {
      console.log("Respuesta directa enviada:", directa);
      return res.json({ respuesta: directa });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: textoUsuario }] }
      ]
    });
    const respuestaIA = limpiarRespuesta(response.output_text || "");
    return res.json({
      respuesta: respuestaIA || "Con gusto te ayudo. ¿Podrías contarme un poco más sobre tu duda? 😊"
    });
  } catch (error) {
    console.error("Error en /mensaje:", error);
    return res.json({
      respuesta: "Por el momento no pude procesar tu mensaje. Si se trata de un pago o una entrega pendiente, compárteme los detalles por este chat para darle seguimiento."
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
}

module.exports = { app, normalizarTexto, contieneAlguna, limpiarRespuesta, respuestaDirecta, obtenerIntenciones, DATOS_PAGO, SYSTEM_PROMPT, INTENCIONES };
