import { apiRequest, demoResponses, fileBody, formatResponse, messageBody } from "./green-api.mjs";

const field = (id) => document.getElementById(id);
const response = field("response-output");
const status = field("response-status");
const demo = field("demo-mode");
const getSettings = field("get-settings");
const getState = field("get-state");
const messageForm = field("message-form");
const fileForm = field("file-form");
const actions = [getSettings, getState, messageForm.querySelector("button[type='submit']"),
  fileForm.querySelector("button[type='submit']")];
let busy = false;

function show(label, content, kind = "info") {
  status.textContent = label;
  status.dataset.kind = kind;
  response.value = content;
  response.scrollTop = 0;
}

function setBusy(isBusy) {
  busy = isBusy;
  for (const action of actions) action.disabled = isBusy;
  demo.disabled = isBusy;
  if (field("clear-response")) field("clear-response").disabled = isBusy;
  response.setAttribute("aria-busy", String(isBusy));
}

async function run(method, payload) {
  if (busy) return;
  if (demo.checked) {
    const content = JSON.stringify(demoResponses[method], null, 2);
    show(`Демо · ${method} · пример ответа`, content, "success");
    return;
  }

  const token = field("api-token").value.trim();
  let request;
  try {
    request = apiRequest(method, {
      apiUrl: field("api-url").value,
      id: field("instance-id").value,
      token,
    }, payload);
  } catch (error) {
    const message = error instanceof TypeError
      ? "Укажите действительный HTTPS-адрес apiUrl из кабинета GREEN-API."
      : error.message;
    show(`${method} · проверьте параметры`, message, "error");
    return;
  }

  setBusy(true);
  show(`${method} · запрос выполняется`, "");
  try {
    const result = await fetch(request.url, request.options);
    const content = formatResponse(await result.text(), token);
    show(`${method} · HTTP ${result.status}`, content, result.ok ? "success" : "error");
  } catch (error) {
    const message = error.name === "TimeoutError" || error.name === "AbortError"
      ? "Ответ не пришёл за 30 секунд. Проверьте статус в GREEN-API перед повторной отправкой."
      : "Соединение не установлено. Проверьте интернет и точный apiUrl в кабинете GREEN-API.";
    show(`${method} · нет ответа`, message, "error");
  } finally {
    setBusy(false);
  }
}

function send(event, method, buildBody) {
  event.preventDefault();
  if (busy) return;
  try {
    run(method, demo.checked ? undefined : buildBody());
  } catch (error) {
    show(`${method} · проверьте параметры`, error.message, "error");
  }
}

getSettings.addEventListener("click", () => run("getSettings"));
getState.addEventListener("click", () => run("getStateInstance"));
messageForm.addEventListener("submit", (event) => {
  send(event, "sendMessage", () => messageBody(field("message-chat").value, field("message-text").value));
});
fileForm.addEventListener("submit", (event) => {
  send(event, "sendFileByUrl", () => fileBody(field("file-chat").value, field("file-url").value,
    field("file-name")?.value));
});
demo.addEventListener("change", () => {
  show(demo.checked ? "Демо включено · запросы не отправляются" : "Готово к запросу", "");
});
field("clear-response")?.addEventListener("click", () => {
  show(demo.checked ? "Демо включено · запросы не отправляются" : "Готово к запросу", "");
});
