let currentUser = null;
let currentChat = null;

let contacts = JSON.parse(localStorage.getItem("contacts")) || [];

// 🔴 CONTROLES
let unreadCounts = JSON.parse(localStorage.getItem("unreadCounts")) || {};
let processedMessages = JSON.parse(localStorage.getItem("processedMessages")) || {};
let countedMessages = JSON.parse(localStorage.getItem("countedMessages")) || {};

// =========================
// INICIAR

window.addEventListener("load", async () => {

let savedId = localStorage.getItem("userId");

if (savedId) {
const res = await fetch(`/getUser/${savedId}`);
const user = await res.json();
if (!user.error) currentUser = user;
}

if (!currentUser) {
const res = await fetch("/user", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ username: "Novo Usuário", photo: "" })
});
currentUser = await res.json();
localStorage.setItem("userId", currentUser.id);
}

document.getElementById("userIdDisplay").textContent = currentUser.id;

// 🔥 RESTAURA NOME
const savedName = localStorage.getItem("username");
if(savedName){
  currentUser.username = savedName;
  const input = document.getElementById("username");
  if(input) input.value = savedName;
}

// FOTO
if(currentUser.photo){
  const img = document.getElementById("profilePreview");
  if(img) img.src = currentUser.photo;
}

await renderContacts();

// 🔄 tempo real
setInterval(loadMessages, 1500);

});

// =========================
// SALVAR PERFIL

document.getElementById("profileForm")?.addEventListener("submit", async (e) => {

e.preventDefault();

const username = document.getElementById("username").value;
const file = document.getElementById("profilePic").files[0];

let photo = currentUser.photo;

if(file){
const reader = new FileReader();

reader.onload = async () => {
  photo = reader.result;
  await salvarPerfil(username, photo);
};

reader.readAsDataURL(file);

} else {
await salvarPerfil(username, photo);
}

});

async function salvarPerfil(username, photo){

await fetch("/saveProfile", {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({ id: currentUser.id, username, photo })
});

localStorage.setItem("username", username);

currentUser.username = username;
currentUser.photo = photo;

await renderContacts();

}

// =========================
// CONTATOS

async function renderContacts(){

const div = document.getElementById("contacts");

let html = "";

for (let i = 0; i < contacts.length; i++) {

const res = await fetch(`/getUser/${contacts[i].id}`);
const user = await res.json();

if(!user.error){
  contacts[i] = user;
}

const count = unreadCounts[user.id] || 0;

html += `
  <div class="contact" data-id="${user.id}" style="display:flex;align-items:center;">
    <img src="${user.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}"
         style="width:30px;height:30px;border-radius:50%;margin-right:10px;">
    <span style="flex:1;">${user.username}</span>
    ${count > 0 ? `<span style="background:red;color:white;border-radius:50%;padding:5px 10px;font-size:12px;margin-left:auto;">${count}</span>` : ""}
  </div>
`;
}

div.innerHTML = html;

document.querySelectorAll(".contact").forEach(el => {
  el.onclick = () => {
    const user = contacts.find(c => c.id == el.dataset.id);
    abrirChat(user);
  };
});

localStorage.setItem("contacts", JSON.stringify(contacts));

}

// =========================
// ABRIR CHAT

async function abrirChat(user){

const res = await fetch(`/getUser/${user.id}`);
const updatedUser = await res.json();

currentChat = !updatedUser.error ? updatedUser : user;

// 🔴 ZERA CONTADOR
unreadCounts[currentChat.id] = 0;
localStorage.setItem("unreadCounts", JSON.stringify(unreadCounts));

await renderContacts();

document.getElementById("home").style.display = "none";
document.getElementById("chatScreen").style.display = "flex";

document.getElementById("chatName").textContent = currentChat.username;

await loadMessages(true);

}

// =========================
// VOLTAR

function voltar(){
document.getElementById("chatScreen").style.display = "none";
document.getElementById("home").style.display = "block";
currentChat = null;
}

// =========================
// ENVIAR (COM ID DO SERVIDOR)

document.getElementById("sendMessageBtn").onclick = async () => {

const text = document.getElementById("messageText").value;
if(!text || !currentChat) return;

// 🔥 envia SEM ID
const res = await fetch("/sendMessage", {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
  fromId: currentUser.id,
  toId: currentChat.id,
  text,
  timestamp: Date.now()
})
});

// 🔥 recebe com ID correto
const savedMessage = await res.json();

// 🔥 mostra na hora
addMessage(savedMessage);

document.getElementById("messageText").value = "";

};

// =========================
// LOAD MESSAGES

async function loadMessages(initial = false){

const res = await fetch(`/getMessages/${currentUser.id}`);
const msgs = await res.json();

let updatedContacts = false;
let updatedUnread = false;

// 🔄 atualiza nomes
for (let i = 0; i < contacts.length; i++) {
  const resUser = await fetch(`/getUser/${contacts[i].id}`);
  const updated = await resUser.json();
  if(!updated.error){
    contacts[i] = updated;
  }
}

for (let m of msgs){

// auto contato
if(m.toId == currentUser.id && m.fromId != currentUser.id){

  if(!contacts.some(c => c.id == m.fromId)){

    const resUser = await fetch(`/getUser/${m.fromId}`);
    const newUser = await resUser.json();

    if(!newUser.error){
      contacts.unshift(newUser);
      updatedContacts = true;
    }

  }

}

// 🔴 CONTADOR CORRETO
if(m.toId == currentUser.id){

  if(!countedMessages[m.id]){

    countedMessages[m.id] = true;

    if(currentChat?.id !== m.fromId){

      if(!unreadCounts[m.fromId]){
        unreadCounts[m.fromId] = 0;
      }

      unreadCounts[m.fromId]++;
      updatedUnread = true;

    }

  }

}

}

if(updatedContacts || updatedUnread){

localStorage.setItem("contacts", JSON.stringify(contacts));
localStorage.setItem("unreadCounts", JSON.stringify(unreadCounts));

await renderContacts();

}

localStorage.setItem("countedMessages", JSON.stringify(countedMessages));
localStorage.setItem("processedMessages", JSON.stringify(processedMessages));

// =========================
// CHAT

if(!currentChat) return;

const filtered = msgs.filter(m =>
(m.fromId == currentUser.id && m.toId == currentChat.id) ||
(m.fromId == currentChat.id && m.toId == currentUser.id)
);

const container = document.getElementById("messages");

// 🔥 INSTANTÂNEO
if(initial){

let html = "";

for (let m of filtered){

  const isMe = m.fromId == currentUser.id;

  html += `
    <div class="message ${isMe ? "me" : "other"}">
      <div class="bubble">${m.text}</div>
    </div>
  `;
}

container.innerHTML = html;
container.scrollTop = container.scrollHeight;

return;
}

// 🔥 NOVAS
for (let m of filtered){

if(processedMessages["chat_" + m.id]) continue;

processedMessages["chat_" + m.id] = true;

addMessage(m);

}

container.scrollTop = container.scrollHeight;

}

// =========================
// ADICIONAR MENSAGEM

function addMessage(m){

const container = document.getElementById("messages");

const div = document.createElement("div");
div.className = "message " + (m.fromId == currentUser.id ? "me" : "other");

const bubble = document.createElement("div");
bubble.className = "bubble";
bubble.textContent = m.text;

div.appendChild(bubble);
container.appendChild(div);

}
