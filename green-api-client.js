const apiHosts = ["greenapi.com", "green-api.com"];
const defaultApiUrl = "https://api.greenapi.com";
const methods = {
  getSettings: "GET",
  getStateInstance: "GET",
  sendMessage: "POST",
  sendFileByUrl: "POST",
};

export function apiRequest(method, connection, body) {
  if (!Object.hasOwn(methods, method)) throw new Error("Этот метод API не поддерживается.");
  const id = connection.id.trim();
  const token = connection.token.trim();
  if (!/^\d{1,20}$/.test(id)) {
    throw new Error("Укажите числовой idInstance из кабинета GREEN-API.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Укажите корректный ApiTokenInstance из кабинета GREEN-API.");
  }

  const origin = new URL(connection.apiUrl.trim() || defaultApiUrl);
  const allowedHost = apiHosts.some((domain) =>
    origin.hostname === domain || origin.hostname.endsWith(`.${domain}`),
  );
  if (!allowedHost || origin.protocol !== "https:" || origin.port || origin.username ||
      origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Укажите HTTPS-адрес apiUrl из кабинета GREEN-API без пути и параметров.");
  }

  const url = `${origin.origin}/waInstance${id}/${method}/${encodeURIComponent(token)}`;
  const options = {
    method: methods[method],
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(30_000),
  };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  return { url, options };
}

function chatId(value) {
  const chat = value.trim().toLowerCase();
  if (/^\d+(?:-\d+)?@g\.us$/.test(chat) || /^\d{7,15}@c\.us$/.test(chat)) {
    return chat;
  }
  const phone = chat.replace(/[+\s()-]/g, "");
  if (!/^\d{7,15}$/.test(phone)) {
    throw new Error("Введите номер с кодом страны или идентификатор чата WhatsApp.");
  }
  return `${phone}@c.us`;
}

export function messageBody(recipient, message) {
  if (!message.trim()) throw new Error("Введите текст сообщения.");
  if (message.length > 20_000) throw new Error("Сообщение должно быть не длиннее 20 000 символов.");
  return { chatId: chatId(recipient), message };
}

export function fileBody(recipient, value, customName = "") {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Укажите прямую HTTP или HTTPS ссылку на файл.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Укажите прямую HTTP или HTTPS ссылку на файл без логина и пароля.");
  }

  const pathName = url.pathname.split("/").at(-1);
  let fileName;
  try {
    fileName = customName.trim() || decodeURIComponent(pathName);
  } catch {
    throw new Error("Укажите корректное имя файла с расширением, например report.pdf.");
  }
  if (!/^[^/\\\x00-\x1F]+\.[a-z0-9]{1,12}$/i.test(fileName)) {
    throw new Error("Укажите имя файла с расширением, если в ссылке оно отсутствует.");
  }
  return { chatId: chatId(recipient), urlFile: value.trim(), fileName };
}

export function formatResponse(source, token = "") {
  const safe = token ? source.replaceAll(token, "[токен скрыт]") : source;
  if (!safe.trim()) return "Тело ответа пустое.";
  try {
    return JSON.stringify(JSON.parse(safe), null, 2);
  } catch {
    return safe;
  }
}

export const demoResponses = {
  getSettings: { typeInstance: "whatsapp", outgoingWebhook: "no", incomingWebhook: "no" },
  getStateInstance: { stateInstance: "authorized" },
  sendMessage: { idMessage: "DEMO_TEXT_001" },
  sendFileByUrl: { idMessage: "DEMO_FILE_001" },
};
