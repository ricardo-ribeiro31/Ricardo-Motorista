/* ===== Configuração ===== */
const WHATSAPP = "5531986681445";   // número no formato internacional, só dígitos
const MIN_HOURS = 2;                 // antecedência mínima em horas
const STEP_MIN = 15;                 // intervalo entre horários no seletor

const $ = (id) => document.getElementById(id);
const form = $("form"), data = $("data"), hora = $("hora");
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* Bloqueia datas passadas */
const todayISO = () => toISO(new Date());
data.min = todayISO();

/* Retorna o primeiro horário (em minutos) permitido para a data escolhida;
   data vazia ou hoje vale a regra de antecedência, datas futuras liberam o dia */
function minMinutesFor(dateISO) {
  if (dateISO && dateISO !== todayISO()) return 0;
  const n = new Date(); return n.getHours() * 60 + n.getMinutes() + MIN_HOURS * 60;
}

/* Monta a lista suspensa apenas com os horários permitidos para a data escolhida */
function buildTimes() {
  const keep = hora.value, min = minMinutesFor(data.value);
  hora.innerHTML = '<option value="">Selecione</option>';
  // Para hoje, começa no primeiro intervalo de 15 min a partir de (agora + 2 h);
  // para datas futuras, exibe o dia inteiro (min = 0).
  const start = Math.min(Math.ceil(min / STEP_MIN) * STEP_MIN, 1440);
  for (let m = start; m < 1440; m += STEP_MIN) {
    const v = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    hora.add(new Option(v, v));
  }
  const kept = keep && hora.querySelector(`option[value="${keep}"]`);
  if (kept) hora.value = keep; // só mantém se o horário continua disponível
}
data.addEventListener("change", buildTimes);
buildTimes();

/* Paradas dinâmicas */
const temParadas = $("temParadas"), qtd = $("qtdParadas"), qtdWrap = $("qtdWrap"), paradasBox = $("paradas");
function buildStops() {
  const on = temParadas.value === "sim", n = on ? +qtd.value : 0;
  qtdWrap.hidden = !on;
  const old = [...paradasBox.querySelectorAll("input")].map((i) => i.value);
  paradasBox.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    paradasBox.insertAdjacentHTML("beforeend",
      `<div class="field"><label for="parada${i}">Parada ${i}</label><input id="parada${i}" required maxlength="160" placeholder="Endereço da parada"><small class="err"></small></div>`);
    $("parada" + i).value = old[i - 1] || "";
  }
}
temParadas.addEventListener("change", buildStops);
qtd.addEventListener("change", buildStops);

/* Validação */
function setErr(el, msg) {
  el.classList.toggle("invalid", !!msg);
  const e = el.parentElement.querySelector(".err"); if (e) e.textContent = msg || "";
  el.setAttribute("aria-invalid", msg ? "true" : "false");
}
function validate() {
  let first = null;
  const fail = (el, msg) => { setErr(el, msg); if (msg && !first) first = el; };
  form.querySelectorAll("input[required]").forEach((el) => fail(el, el.value.trim() ? "" : "Campo obrigatório."));
  if (data.value && data.value < todayISO()) fail(data, "Escolha uma data a partir de hoje.");
  if (!hora.value) fail(hora, "Selecione um horário.");
  else {
    const [h, m] = hora.value.split(":").map(Number);
    fail(hora, data.value && h * 60 + m < minMinutesFor(data.value) ? "Os agendamentos devem ser feitos com no mínimo 2 horas de antecedência." : "");
  }
  if (first) first.focus();
  return !first;
}
form.addEventListener("input", (e) => e.target.classList.contains("invalid") && setErr(e.target, ""));

/* Monta a mensagem e abre o WhatsApp */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  buildTimes();
  if (!validate()) return;
  const v = (id) => $(id).value.trim().replace(/\s+/g, " ");
  const [y, mo, d] = data.value.split("-");
  const lines = [
    "Olá, Ricardo! Quero agendar uma corrida. 🚗", "",
    `👤 Nome: ${v("nome")}`, `📅 Data: ${d}/${mo}/${y}`, `🕐 Horário: ${hora.value}`,
    `📍 Partida: ${v("origem")}`, `🏁 Destino: ${v("destino")}`,
  ];
  paradasBox.querySelectorAll("input").forEach((el, i) => lines.push(`🛑 Parada ${i + 1}: ${el.value.trim()}`));
  lines.push(`👥 Passageiros: ${v("passageiros")}`, `🧳 Bagagem: ${v("bagagem")}`, `💳 Pagamento: ${v("pagamento")}`);
  const obs = $("obs").value.trim(); if (obs) lines.push("", `Observações: ${obs}`);
  // api.whatsapp.com preserva os emojis (o wa.me os corrompe no redirecionamento)
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(lines.join("\n"))}`;
  const win = window.open(url, "_blank");
  if (win) win.opener = null;
  else window.location.href = url; // fallback se o navegador bloquear a nova aba
});
